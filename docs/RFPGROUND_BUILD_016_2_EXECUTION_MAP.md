# RFPground — BUILD-016.2 Execution Map & Architecture Reconnaissance

**Phase**: 016.2-A  
**Status**: RECONNAISSANCE & CODE VERIFICATION COMPLETE  
**Specification**: Production Reliability & Real End-to-End Pipeline Verification

---

## 1. Verified End-to-End Execution Flow

```
[USER] Login Screen (/login)
   │ (Supabase OAuth / Password Session)
   ▼
[DASHBOARD] /dashboard (Server-Side Auth Guard in page.tsx)
   │
   ▼
[WORKSPACE] AnalysisWorkspace (userId prop)
   │
   ├─► Initial Document & Queue Fetch:
   │   • GET /api/documents (User-scoped document catalog)
   │   • GET /api/analysis-queue (Live queue status & stage summary)
   │
   ├─► [INTAKE TRIGGER] DocumentIntake Component:
   │   │
   │   ├─► STEP 1 (Sync): Client-side PDF validation (< 10MB, .pdf)
   │   ├─► STEP 2 (Sync): Upload to Supabase Storage ('rfps' bucket: ${userId}/${uuid}.pdf)
   │   ├─► STEP 3 (Sync): Insert record in 'documents' table (status: 'UPLOADED')
   │   ├─► STEP 4 (Sync): POST /api/process-document
   │   │   • Extracts text per page using pdf-parse
   │   │   • Checks OCR/density heuristics
   │   │   • Persists pages in 'document_pages' table
   │   │   • Updates 'documents' table (status: 'TEXT_EXTRACTED')
   │   │
   │   └─► STEP 5 (Async Dispatch): POST /api/analyze-document
   │       • Checks active run idempotency
   │       • Inserts record in 'analysis_runs' (status: 'QUEUED')
   │       • Dispatches background runner asynchronously
   │       • Returns HTTP 200 to client immediately in < 150ms
   │       • UI transitions to '✓ Tender Accepted & Queued' (Non-blocking)
   │
   ▼
[BACKGROUND PIPELINE RUNNER] lib/pipeline/runner.ts
   │
   ├─► Stage 1: EXTRACTING
   │   • Updates analysis_runs.status = 'EXTRACTING'
   │   • Validates document and extracted pages exist in database
   │
   ├─► Stage 2: QUALIFYING
   │   • Updates analysis_runs.status = 'QUALIFYING'
   │   • Executes qualifyDocument (DeepSeek API prompt)
   │   • Validates evidence quotes verbatim against source pages
   │   • Updates documents.qualification_status ('AI_QUALIFIED' | 'AI_REJECTED' | 'AI_AMBIGUOUS' | 'USER_CONFIRMED')
   │   • If AI_REJECTED (and not user_confirmed), marks analysis_runs.status = 'REJECTED' and halts
   │
   ├─► Stage 3: ANALYSING
   │   • Updates analysis_runs.status = 'ANALYSING'
   │   • Deterministic retrieval (getCategoryCandidates across 12 procurement domains)
   │   • Parallel targeted batch extraction (analyzeBatchBounded via DeepSeek API)
   │   • Cross-batch deduplication
   │
   ├─► Stage 4: VERIFYING
   │   • Updates analysis_runs.status = 'VERIFYING'
   │   • Strict verbatim quote validation (verifyQuote on raw page content)
   │   • Discards ungrounded findings
   │
   ├─► Stage 5: FINALIZING
   │   • Updates analysis_runs.status = 'FINALIZING'
   │   • Selective risk interpretation for CRITICAL/HIGH findings (DeepSeek API)
   │   • Transactional Idempotency Purge: DELETE FROM analysis_findings WHERE analysis_run_id = runId
   │   • Batch inserts confirmed records into analysis_findings and analysis_finding_quotes
   │   • Batch inserts stage telemetry into analysis_metrics
   │
   └─► Stage 6: COMPLETED
       • Updates analysis_runs.status = 'COMPLETED', completed_at = now()
       • Workspace poll detects COMPLETED and mounts Decision Brief with 100% verified evidence
```

---

## 2. Request Boundaries & Synchronous vs Asynchronous Work

| Stage / Operation | Route / Module | Synchronous (Client Blocks) | Asynchronous (Background) | Latency Target |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Verification** | `app/dashboard/page.tsx` | YES | NO | < 50ms |
| **Storage Upload** | Supabase Storage (`rfps`) | YES | NO | ~800–1,200ms |
| **Page Text Parsing** | `/api/process-document` | YES | NO | ~1,200–1,800ms |
| **Job Dispatch** | `/api/analyze-document` | YES (Returns Job ID) | NO | **< 150ms** |
| **Document Qualification** | `lib/pipeline/runner.ts` | NO | YES | ~3,500–4,500ms |
| **Batch Extraction** | `lib/pipeline/runner.ts` | NO | YES | ~22,000–28,000ms |
| **Quote Verification** | `lib/pipeline/runner.ts` | NO | YES | ~150–250ms |
| **Risk Interpretation** | `lib/pipeline/runner.ts` | NO | YES | ~7,500–11,000ms |
| **Database Persistence** | `lib/pipeline/runner.ts` | NO | YES | ~1,200–1,600ms |
| **Queue Polling** | `/api/analysis-queue` | YES (Background fetch) | NO | < 60ms |
| **Workspace Loading** | `/api/document-analysis` | YES (On doc select) | NO | < 120ms |

---

## 3. Database Schema & Tables Touched

1. **`documents`**:
   - `id`, `user_id`, `original_filename`, `storage_path`, `size_bytes`, `status`, `document_type`, `qualification_status`, `qualification_confidence`, `qualification_reason`, `created_at`.
2. **`document_pages`**:
   - `id`, `document_id`, `page_number`, `content`, `char_count`, `created_at`.
3. **`analysis_runs`**:
   - `id`, `document_id`, `status`, `model`, `started_at`, `completed_at`, `error_code`, `last_error`, `failed_at`, `attempts`, `max_attempts`, `created_at`.
4. **`analysis_findings`**:
   - `id`, `analysis_run_id`, `document_id`, `category`, `title`, `finding`, `business_implication`, `action_recommendation`, `severity`, `confidence`, `created_at`.
5. **`analysis_finding_quotes`**:
   - `id`, `finding_id`, `page_number`, `quote_text`, `created_at`.
6. **`analysis_metrics`**:
   - `id`, `run_id`, `document_id`, `step_name`, `duration_ms`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `created_at`.

---

## 4. Idempotency, Retry, & Failure Boundaries

### A. Idempotency Mechanisms
- **Active Run Deduping**: `/api/analyze-document` checks if an active run (`QUEUED`, `EXTRACTING`, `QUALIFYING`, `ANALYSING`, `VERIFYING`, `FINALIZING`, `PROCESSING`) already exists for that `document_id`. If so, returns the existing `run_id` without creating duplicate jobs.
- **Transactional Findings Clean**: On retry of an existing run, `lib/pipeline/runner.ts` executes `DELETE FROM analysis_findings WHERE analysis_run_id = runId` prior to inserting fresh verified findings.

### B. Failure & Isolation Boundaries
- **Ownership Scoping**: All documents queried in `/api/documents` and `/api/document-analysis` filter by `user_id` and authenticate via Supabase session.
- **AI Rejection Isolation**: Documents identified as non-procurement are marked `REJECTED`, preventing non-tenders from polluting the Decision Brief unless explicitly confirmed via user override (`USER_CONFIRMED`).
- **Quote Verification Guarantee**: Every finding must pass `verifyQuote(sourcePage.content, quote)` against the exact raw page text or it is discarded before persistence.

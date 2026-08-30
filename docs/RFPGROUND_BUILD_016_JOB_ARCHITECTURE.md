# RFPground — BUILD-016 Job & Queue Architecture
## Asynchronous Analysis Execution & Non-Blocking Multi-Document System

**Status**: ARCHITECTURAL PROPOSAL  
**Release**: BUILD-016  
**Core Goal**: Replace synchronous waiting with an asynchronous, durable, multi-document analysis job queue.

---

## 1. Job Lifecycle State Machine

Each analysis execution is represented by an explicit, atomic job model extending `analysis_runs`:

```
[UPLOAD] ───► QUEUED
                │
                ▼
            EXTRACTING (PDF Text & Page Density)
                │
                ▼
            QUALIFYING (AI Qualification Gate)
                │
         ┌──────┴─────────────────────────┐
         ▼                                ▼
    AI_REJECTED (Non-Tender)         ANALYSING (Parallel Batch Extraction)
                                          │
                                          ▼
                                     VERIFYING (Verbatim Quote Validation)
                                          │
                                          ▼
                                     FINALIZING (Persistence & Metrics)
                                          │
                                          ▼
                                      COMPLETED
                                          │
                               (or FAILED on fatal error)
```

### Real Pipeline Statuses (Zero Fake Metrics)
- **`QUEUED`**: The tender is stored in private storage and registered in the job queue.
- **`EXTRACTING`**: Extracting text pages and computing OCR heuristics.
- **`QUALIFYING`**: Evaluating whether the document is a valid procurement opportunity.
- **`ANALYSING`**: Executing targeted parallel extraction across procurement domains.
- **`VERIFYING`**: Validating extracted quotes verbatim against raw document page text.
- **`FINALIZING`**: Persisting confirmed findings, quotes, and coverage metrics.
- **`COMPLETED`**: Analysis ready for inspection in the Decision Brief workspace.
- **`FAILED`**: Analysis halted due to an unrecoverable server/model error.

---

## 2. Decoupled Ingestion & Immediate HTTP Response

```
User uploads PDF
       │
       ▼
POST /api/documents/ingest ───► 1. Save to Supabase Storage ('rfps')
                                2. Insert record in 'documents' (status: 'UPLOADED')
                                3. Insert record in 'analysis_runs' (status: 'QUEUED')
                                4. Trigger Background Execution Worker
                                5. Return HTTP 200 immediately (< 1,500ms)
       │
       ▼
Client receives { document_id, run_id, status: 'QUEUED' }
       │
       ▼
User continues working immediately (switches documents, inspects analyses, or uploads Tender B)
```

---

## 3. Queue & Background Execution Engine Evaluation

| Dimension | Option A: Inngest Background Queue | Option B: Supabase Native DB Queue (`pgmq` / `FOR UPDATE SKIP LOCKED`) | Option C: Edge/Serverless Background Worker (`after()` / async dispatch) | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **Dependencies** | Requires external Inngest dev daemon / cloud account | Native to existing PostgreSQL database | Native Next.js serverless runtime | **Option B + Option C Hybrid** |
| **Local Dev Simplicity** | ⚠️ Fails with `ECONNREFUSED` if daemon not running | ✅ Works 100% out of the box with existing Supabase instance | ✅ Works 100% out of the box in Next.js | **Supabase DB Native Queue** |
| **Dopamine & Gamification** | N/A | None (Pure operational job queue) | None | **Truthful** |
| **Durability** | High | High (PostgreSQL ACID transactions) | Medium | **High** |
| **Zero-Broker Rule** | Breaks zero-broker rule | Follows zero-broker rule (uses existing DB) | Follows zero-broker rule | **Winner: Supabase DB Queue** |

---

## 4. Idempotency & Crash-Recovery Guarantees

1. **Atomic Analysis Run Boundary**:
   - Every finding, quote, and metric is explicitly bound to `analysis_run_id`.
2. **Worker Retry Safety**:
   - If a job fails or is retried, the worker performs a transactional purge of partial findings for that specific `analysis_run_id` before inserting newly verified records:
     `DELETE FROM analysis_findings WHERE analysis_run_id = $1`
3. **Deduplication on Document Re-upload**:
   - Re-uploading a document generates a new `document_id` and independent `analysis_runs` record, guaranteeing zero cross-document state bleeding.
4. **Data Isolation Invariant**:
   - `user_id` → `document_id` → `analysis_run_id` → `findings` → `quotes`.

---

## 5. Multi-Document Analysis Queue UI (Non-Blocking)

### A. Persistent Queue Beacon (Header Strip)
```
RFPground  |  scam_anoynomous.pdf [33 Pages]  |  ● 2 analysing · 1 ready  |  + New Tender
```

### B. Slide-Over Operational Job Drawer
When clicked, displays the active analysis queue:
```
┌─────────────────────────────────────────────────────────────┐
│ ANALYSIS QUEUE                                          [✕] │
├─────────────────────────────────────────────────────────────┤
│ ● Infrastructure_Tender.pdf                                 │
│   49 pages · VERIFYING EVIDENCE                             │
│   Status: Validating quotes against page text               │
│                                                             │
│ ○ Municipal_Services_RFP.pdf                                │
│   28 pages · QUEUED                                         │
│   Status: Waiting in analysis queue                         │
│                                                             │
│ ✓ World_Food_India_2019.pdf                                 │
│   33 pages · ANALYSIS READY                                 │
│   [ Open Analysis → ]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Infrastructure & Concurrency Safety Assessment

- **Supabase PostgreSQL Limits**:
  - Max connection pool handles up to 50 concurrent transactions.
  - Using direct SQL batch inserts (`supabase.from('analysis_findings').insert(batch)`) ensures only 2-3 database queries per job execution.
- **DeepSeek API Concurrency**:
  - DeepSeek API supports up to 50 concurrent requests. Running 3 parallel batch calls per document allows 5-10 concurrent tender analyses without hitting 429 rate limits.
- **Vercel Execution Limits**:
  - Serverless function timeout is 60s on hobby / 300s on pro.
  - With parallelized extraction (target ≤ 28s), jobs complete safely within standard serverless timeouts.

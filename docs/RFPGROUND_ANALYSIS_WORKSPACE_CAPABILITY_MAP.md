# RFPground Analysis Workspace — Capability Map

**Document:** `RFPGROUND_ANALYSIS_WORKSPACE_CAPABILITY_MAP.md`  
**Status:** AUDITED & LOCKED FOR PRODUCT RESET  
**Source of Truth:** BUILD-008P Repository Audit  
**Date:** 2026-08-29  

---

## 1. Product Capability Matrix

| Product Capability | Exists? | Implementation Source | Data Available? | UI-Ready? | Notes |
|---|---|---|---|---|---|
| **PDF Document Upload** | IMPLEMENTED | `components/UploadWorkspace.tsx`, Supabase Storage (`rfps` bucket) | Yes (`File`, `name`, `size`) | Yes | Client restricts to PDF & ≤ 10 MB. Storage RLS isolates by `user_id`. |
| **Document Persistence** | IMPLEMENTED | `documents` table | Yes (`id`, `storage_path`, `status`, `size_bytes`) | Yes | Initial status is `UPLOADED`. |
| **Page-Level Text Extraction** | IMPLEMENTED | `app/api/process-document/route.ts`, `lib/processing/pdf-parser.ts` | Yes (`document_pages` table) | Yes | Extracts `page_number`, `content`, `char_count`. |
| **OCR Fallback Detection** | IMPLEMENTED | `app/api/process-document/route.ts` | Yes (`OCR_REQUIRED` status) | Yes | If >50% pages have ≤20 chars or total meaningful text is 0, flags `OCR_REQUIRED`. |
| **Document Qualification Gate** | IMPLEMENTED | `lib/ai/qualification.ts`, `app/api/analyze-document/route.ts` | Yes (`qualification_status`, `document_type`, `qualification_confidence`, `qualification_reason`) | Yes | Classifies procurement opportunity vs non-procurement. Supports `AI_QUALIFIED`, `AI_AMBIGUOUS` (requires user confirmation), `AI_REJECTED`. |
| **Analysis Execution Dispatch** | IMPLEMENTED | `app/api/analyze-document/route.ts`, Inngest (`rfp.analysis.requested`) | Yes (`analysis_runs` table) | Yes | Idempotent run creation (`QUEUED` -> `PROCESSING` -> `COMPLETED` / `FAILED`). |
| **Deterministic Retrieval** | IMPLEMENTED | `lib/ai/retrieval.ts` (`getCategoryCandidates`) | Yes (`candidateSets`, `trigger_pages`, `context_pages`) | Yes | Keyword matching + context expansion (N-1, N, N+1, markers). |
| **Targeted Batch Extraction** | IMPLEMENTED | `lib/ai/provider.ts`, `lib/ai/splitter.ts`, `lib/inngest/functions.ts` | Yes (`findings` in memory & DB) | Yes | Bounded batch extraction with output ceiling detection and predictive pre-splitting. |
| **Evidence Validation** | IMPLEMENTED | `lib/ai/validator.ts` (`verifyQuote`) | Yes (discarded if invalid) | Yes | Verifies verbatim quote existence against `document_pages.content`. 100% acceptance required for confirmed findings. |
| **Selective Risk Interpretation** | IMPLEMENTED | `lib/ai/provider.ts` (`interpretFindings`) | Yes (`business_implication`, `action_recommendation`) | Yes | Executes for `CRITICAL`, `HIGH`, or risky categories (`LIABILITY_RISK`, `TERMINATION`, `CONTRADICTIONS_AMBIGUITIES`). |
| **Findings Persistence** | IMPLEMENTED | `analysis_findings` table | Yes (`category`, `title`, `finding`, `severity`, `confidence`, `business_implication`, `action_recommendation`) | Yes | Stores verified facts and business implications. |
| **Verbatim Quote Persistence** | IMPLEMENTED | `analysis_finding_quotes` table | Yes (`finding_id`, `page_number`, `quote_text`) | Yes | 1-to-many relationship linking findings directly to page numbers and exact quotes. |
| **Critical Coverage Assessment** | IMPLEMENTED | `lib/ai/coverage.ts` (`assessCriticalCoverage`) | Yes (`COVERED`, `REVIEW_REQUIRED`, `EXTRACTION_UNCERTAIN` for 12 critical categories) | Yes | Evaluates 12 critical procurement domains based on evidence units and verified findings. |
| **Analysis Status Polling** | IMPLEMENTED | `app/api/analysis-status/route.ts` | Yes (`status`, `findingsCount`, `error`) | Yes | Authorizes user against document ownership and polls active run status. |
| **Source Document Viewing** | IMPLEMENTED (Backend) | `document_pages` table | Yes (`page_number`, `content`) | Yes | All page text is stored in PostgreSQL and queryable via Supabase client. |
| **Clarification Q&A Generation** | PARTIALLY IMPLEMENTED | `action_recommendation` field in `analysis_findings` | Yes (per-finding action) | Yes | Finding-level recommended actions provide clarification questions, but a unified export document is synthesized on demand. |
| **Multi-file / Multi-part Uploads** | NOT IMPLEMENTED | — | No | No | Only single PDF files up to 10 MB are currently accepted per upload. |
| **Automated Legal Go/No-Go Verdict** | NOT IMPLEMENTED (By Design) | — | No | No | The software provides findings, risk severity, and coverage health to support human judgment; it does not replace the analyst. |
| **Confidence Scoring (Percentages)** | NOT IMPLEMENTED (Banned) | — | No | No | Categorical confidence only (`HIGH`, `MEDIUM`, `LOW`); no synthetic accuracy percentages. |

---

## 2. Capability Summary

1. **Authentication & Intake**: Users authenticate via Supabase Auth. Single PDF intake up to 10 MB.
2. **Parsing & Diagnostics**: Text is extracted page-by-page. Scanned/low-text PDFs are flagged as `OCR_REQUIRED`.
3. **Qualification Gate**: Evaluates if the document is a procurement tender, flags non-procurement or ambiguous documents.
4. **Extraction & Evidence**: Quotes are strictly validated against page text. Findings store title, fact, severity, business implication, action recommendation, and page-cited quotes.
5. **Coverage Assessment**: Deterministic evaluation of 12 critical categories into `COVERED`, `REVIEW_REQUIRED`, or `EXTRACTION_UNCERTAIN`.
6. **Persistence**: Structured relational schema in PostgreSQL (`documents`, `document_pages`, `analysis_runs`, `analysis_findings`, `analysis_finding_quotes`, `analysis_metrics`).

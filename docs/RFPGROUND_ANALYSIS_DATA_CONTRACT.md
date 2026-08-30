# RFPground Analysis Workspace — Real Data Contract

**Document:** `RFPGROUND_ANALYSIS_DATA_CONTRACT.md`  
**Status:** AUDITED & LOCKED FOR PRODUCT RESET  
**Source of Truth:** BUILD-008P / PostgreSQL Schema / `lib/ai/coverage.ts`  
**Date:** 2026-08-29  

---

## 1. Real Data Surfaces & Contracts

### A. Document Surface (`documents` & `document_pages`)

| Field | Source | Type | State / Values | Notes |
|---|---|---|---|---|
| `id` | `documents.id` | UUID | Unique document identifier | Primary key |
| `filename` | `documents.original_filename` | string | e.g. `RFP-Highway-Expansion.pdf` | Sanitized original name |
| `file_size_bytes` | `documents.size_bytes` | number | Bytes (max 10,485,760) | Rendered as MB/KB |
| `upload_status` | `documents.status` | enum string | `'UPLOADED'`, `'PROCESSING'`, `'TEXT_EXTRACTED'`, `'OCR_REQUIRED'`, `'FAILED'` | Tracks text extraction lifecycle |
| `qualification_status` | `documents.qualification_status` | enum string | `'PENDING'`, `'AI_QUALIFIED'`, `'AI_AMBIGUOUS'`, `'AI_REJECTED'`, `'USER_CONFIRMED'` | Qualification gate state |
| `qualification_confidence` | `documents.qualification_confidence` | enum string | `'LOW'`, `'MEDIUM'`, `'HIGH'` | Categorical confidence |
| `qualification_reason` | `documents.qualification_reason` | string | Brief explanation from classifier | e.g. "Contains scope of work and evaluation criteria" |
| `document_type` | `documents.document_type` | enum string | `'RFP'`, `'TENDER'`, `'RFQ'`, `'RFI'`, `'EOI'`, `'JOB_DESCRIPTION'`, etc. | Detected document classification |
| `total_pages` | `count(document_pages)` | number | Positive integer | Count of extracted page records |
| `created_at` | `documents.created_at` | ISO timestamp | Date & time of upload | Standard audit trail |

---

### B. Analysis Run Surface (`analysis_runs`)

| Field | Source | Type | State / Values | Notes |
|---|---|---|---|---|
| `id` | `analysis_runs.id` | UUID | Unique run identifier | Used for status polling |
| `document_id` | `analysis_runs.document_id` | UUID | Foreign key to `documents` | Enforces 1 active run per doc |
| `status` | `analysis_runs.status` | enum string | `'QUEUED'`, `'PROCESSING'`, `'COMPLETED'`, `'FAILED'` | Run lifecycle state |
| `model` | `analysis_runs.model` | string | e.g. `deepseek-v4-flash` | LLM used for extraction |
| `started_at` | `analysis_runs.started_at` | ISO timestamp | Start time | Used for run duration calculation |
| `completed_at` | `analysis_runs.completed_at` | ISO timestamp | Completion time | Populated on success |
| `last_error` | `analysis_runs.last_error` | string \| null | Error message | Populated on failure |

---

### C. Findings Surface (`analysis_findings`)

The core finding entity strictly follows this hierarchy:

```text
FINDING
What was identified (fact)
        ↓
WHY IT MATTERS
Business implication
        ↓
SOURCE
Page number / section context
        ↓
EVIDENCE
Verbatim document quote(s)
        ↓
ANALYST ACTION
Recommended action / Q&A clarification
```

| Field | Source | Type | Values | Notes |
|---|---|---|---|---|
| `id` | `analysis_findings.id` | UUID | Unique finding ID | Primary key |
| `category` | `analysis_findings.category` | enum string | `'ELIGIBILITY'`, `'DATES_SUBMISSION'`, `'EVALUATION'`, `'COMMERCIAL'`, `'LIABILITY_RISK'`, `'TERMINATION'`, `'CONTRADICTIONS_AMBIGUITIES'` | 7 Core Macro Domains |
| `title` | `analysis_findings.title` | string | Short descriptive title | e.g. "Uncapped Indemnification Obligation" |
| `finding` (Fact) | `analysis_findings.finding` | string | Objective verified requirement or statement | Extracted directly from text |
| `severity` / Priority | `analysis_findings.severity` | enum string | `'CRITICAL'`, `'HIGH'`, `'MEDIUM'`, `'LOW'` | Risk prioritization |
| `confidence` | `analysis_findings.confidence` | enum string | `'HIGH'`, `'MEDIUM'`, `'LOW'` | Categorical confidence |
| `business_implication` | `analysis_findings.business_implication` | string \| null | Operational / commercial consequence | Populated via selective interpretation |
| `action_recommendation` | `analysis_findings.action_recommendation` | string \| null | Practical recommendation or Q&A inquiry | Populated via selective interpretation |

---

### D. Evidence & Quotes Surface (`analysis_finding_quotes` & `document_pages`)

Every confirmed finding is backed by 1 or more verbatim quotes validated against document pages.

| Field | Source | Type | Description |
|---|---|---|---|
| `id` | `analysis_finding_quotes.id` | UUID | Quote record ID |
| `finding_id` | `analysis_finding_quotes.finding_id` | UUID | Foreign key to `analysis_findings` |
| `page_number` | `analysis_finding_quotes.page_number` | number | The exact 1-indexed document page number |
| `quote_text` | `analysis_finding_quotes.quote_text` | string | Verbatim snippet from the PDF page (rendered in `Source Serif 4`) |
| `source_page_content` | `document_pages.content` | string | Full extracted text of the referenced page |

---

### E. BUILD-008P Critical Coverage Contract (`lib/ai/coverage.ts`)

Coverage is calculated deterministically across **12 Critical Procurement Categories**. Coverage is **NOT** a numerical percentage or confidence score.

#### The 12 Critical Categories:
1. `ELIGIBILITY`
2. `DATES_SUBMISSION`
3. `TERMINATION`
4. `LIABILITY_RISK`
5. `INDEMNITY`
6. `FINANCIAL_REQUIREMENTS`
7. `PENALTIES_LIQUIDATED_DAMAGES`
8. `EMD_BID_SECURITY`
9. `PERFORMANCE_SECURITY`
10. `EVALUATION_THRESHOLDS`
11. `INSURANCE`
12. `MANDATORY_DOCUMENTS`

#### The 3 Authoritative Operational Coverage States:

| State | Condition | Deterministic Meaning | Analyst Guidance |
|---|---|---|---|
| **`COVERED`** | `findingsCount > 0 && unitsCount > 0` | Verified finding(s) exist and relevant evidence units were examined. | Findings available for review. No immediate gap flagged. |
| **`REVIEW_REQUIRED`** | `(findingsCount === 0 && unitsCount > 0)` or `(findingsCount > 0 && unitsCount === 0)` | Relevant evidence units exist in the text, but no verified finding survived extraction/recovery. | **Action required:** Manual review of relevant sections is necessary. |
| **`EXTRACTION_UNCERTAIN`** | `findingsCount === 0 && unitsCount === 0` | Insufficient candidate/evidence coverage identified to conclude presence or absence. | **Action required:** Verify whether the RFP omits this domain or contains non-standard terminology. |

> **Fundamental Product Truth**:  
> `NO VERIFIED FINDING ≠ NO REQUIREMENT`  
> An empty category in AI output must never be reported as "zero risk" or "clean bill of health." It must be flagged as `REVIEW_REQUIRED` or `EXTRACTION_UNCERTAIN`.

---

### F. Intelligence Report Contract

The report synthesizes:
1. **Document Header & Metadata**: File, page count, document classification.
2. **Critical Coverage Table**: 12 categories with operational status badges and required analyst actions.
3. **High/Critical Risk Findings**: Line-item findings with business implications and verbatim citations.
4. **Clarification & Q&A Register**: Aggregated `action_recommendation` items phrased for submission during the tender Q&A window.

---

## 2. Unavailable / Banned Data Fields

The following fields **DO NOT EXIST** in the codebase and must **NEVER** be synthesized or simulated in the UI:

- ❌ Automated legal liability verdicts / Go/No-Go decisions (Human decision only).
- ❌ Synthetic accuracy or hallucination percentages (e.g. "99.4% accuracy", "0% hallucination").
- ❌ Artificial clause counts (unless directly derived from `analysis_findings.length`).
- ❌ Fictional OCR quality meters.
- ❌ Invented financial estimates not extracted from text.

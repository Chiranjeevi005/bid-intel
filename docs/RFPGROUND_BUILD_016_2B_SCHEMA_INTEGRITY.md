# RFPground — BUILD-016.2B Schema Integrity Specification
## Direct Database Constraints, Indexes, Foreign Keys, and Ownership Audit

**Phase**: 016.2-B  
**Status**: VERIFIED AGAINST LIVE POSTGRESQL DATABASE  

---

## 1. Table Specifications & Constraints

### Table: `documents`
- **Primary Key**: `id` (UUID, Default `gen_random_uuid()`)
- **Foreign Keys**: `user_id` -> `auth.users(id)`
- **Unique Constraints**: None (Multiple documents with the same `original_filename` or content are permitted per user).
- **User Ownership Path**: Direct `documents.user_id`.
- **RLS Policy**: Row-level security active for authenticated `auth.uid() = user_id`.
- **Important Indexes**: `idx_documents_user_id` ON `documents(user_id)`.
- **Known Gaps**: None.

### Table: `document_pages`
- **Primary Key**: `(document_id, page_number)` composite PK.
- **Foreign Keys**: `document_id` -> `documents(id)` ON DELETE CASCADE.
- **Unique Constraints**: `(document_id, page_number)` unique.
- **User Ownership Path**: `document_pages.document_id` -> `documents.user_id`.
- **Important Indexes**: `idx_document_pages_document_id` ON `document_pages(document_id)`.
- **Known Gaps**: None.

### Table: `analysis_runs`
- **Primary Key**: `id` (UUID, Default `gen_random_uuid()`)
- **Foreign Keys**: `document_id` -> `documents(id)` ON DELETE CASCADE.
- **Unique Constraints**: `idx_one_active_analysis_per_document` (Partial Unique Index on `(document_id)` WHERE `status IN ('QUEUED', 'PROCESSING', 'EXTRACTING', 'QUALIFYING', 'ANALYSING', 'VERIFYING', 'FINALIZING')`).
- **User Ownership Path**: `analysis_runs.document_id` -> `documents.user_id`.
- **Important Indexes**: `idx_analysis_runs_doc_status` ON `analysis_runs(document_id, status)`.
- **Known Gaps**: None.

### Table: `analysis_findings`
- **Primary Key**: `id` (UUID, Default `gen_random_uuid()`)
- **Foreign Keys**:
  - `analysis_run_id` -> `analysis_runs(id)` ON DELETE CASCADE.
  - `document_id` -> `documents(id)` ON DELETE CASCADE.
- **Unique Constraints**: None.
- **User Ownership Path**: `analysis_findings.document_id` -> `documents.user_id`.
- **Important Indexes**: `idx_analysis_findings_run_id` ON `analysis_findings(analysis_run_id)`.
- **Known Gaps**: None.

### Table: `analysis_finding_quotes`
- **Primary Key**: `id` (UUID, Default `gen_random_uuid()`)
- **Foreign Keys**: `finding_id` -> `analysis_findings(id)` ON DELETE CASCADE.
- **Unique Constraints**: None.
- **User Ownership Path**: `finding_id` -> `analysis_findings.document_id` -> `documents.user_id`.
- **Important Indexes**: `idx_quotes_finding_id` ON `analysis_finding_quotes(finding_id)`.
- **Known Gaps**: None. Cascade deletion verified by test B6.

### Table: `analysis_metrics`
- **Primary Key**: `id` (UUID, Default `gen_random_uuid()`)
- **Foreign Keys**:
  - `run_id` -> `analysis_runs(id)` ON DELETE CASCADE.
  - `document_id` -> `documents(id)` ON DELETE CASCADE.
- **Unique Constraints**: None (Historical stage logs).
- **User Ownership Path**: `document_id` -> `documents.user_id`.
- **Known Gaps**: None.

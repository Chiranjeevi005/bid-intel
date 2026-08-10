# Pre-Bid Intelligence MVP — Database

**Document:** 05_DATABASE.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# 1. Purpose

This document defines the database strategy for the Pre-Bid Intelligence MVP.

The primary objective of Phase 1 is:

> Establish a reliable PostgreSQL foundation without prematurely designing the entire product database.

The database schema must evolve from actual product requirements.

---

# 2. Database Technology

## Database

**PostgreSQL**

## Platform

**Supabase**

The database is managed through Supabase.

---

# 3. Why PostgreSQL

The expected product domain contains naturally related entities.

Examples:

```text
RFP
 ├── Documents
 ├── Analyses
 │    ├── Requirements
 │    ├── Findings
 │    ├── Risks
 │    └── Questions
 └── Decision Brief
```

A relational database is appropriate for these relationships.

PostgreSQL also provides:

* relational integrity
* structured querying
* indexes
* transactions
* mature SQL support

---

# 4. Phase 1 Database Scope

Phase 1 does NOT require the complete product schema.

The current objective is only to:

1. Establish Supabase.
2. Verify database connectivity.
3. Establish migration discipline.
4. Document future domain entities.
5. Avoid premature schema design.

---

# 5. Database Source of Truth

Database structure must be reproducible from the repository.

Database changes should be represented through version-controlled migrations or the project's chosen reproducible database-change mechanism.

Do not make undocumented production-only schema changes.

---

# 6. Migration Principle

Every meaningful schema change should be:

```text
Decision
   ↓
Migration
   ↓
Verification
   ↓
Commit
```

A database change that exists only in a manually modified production database is not considered properly documented.

---

# 7. Current Phase 1 Schema

The following tables have been explicitly created to support Phase 1 capabilities.

### `documents`
Stores metadata for uploaded RFPs, linked to the `rfps` Supabase Storage bucket.

* `id` (UUID, PK)
* `user_id` (UUID, FK to `auth.users`)
* `original_filename` (TEXT)
* `storage_path` (TEXT, UNIQUE)
* `size_bytes` (BIGINT)
* `status` (TEXT, e.g., 'UPLOADED', 'PROCESSING', 'TEXT_EXTRACTED', 'OCR_REQUIRED', 'FAILED')
* `created_at` (TIMESTAMPTZ)

### `document_pages`
Stores the page-by-page extracted text representation of an RFP document (BUILD-005).

* `document_id` (UUID, FK to `documents(id)`, PK)
* `page_number` (INTEGER, PK)
* `content` (TEXT)
* `char_count` (INTEGER)
* `created_at` (TIMESTAMPTZ)

Do NOT automatically create tables for:

* RFPs (as distinct from documents, if applicable)
* analyses
* requirements
* findings
* risks
* questions
* reports
* payments

unless a future technical requirement genuinely requires one.

---

# 8. Future Domain Model

The following represents the expected conceptual domain.

It is NOT yet a final relational schema.

```text
User
 │
 └── Analysis
       │
       └── RFP
             │
             └── Document
                    │
                    └── Evidence

Analysis
 ├── Requirement
 ├── Finding
 ├── Risk
 ├── Clarification Question
 └── Decision Brief
```

---

# 9. Conceptual Entities

## 9.1 User

Represents a product user.

Potential future attributes:

* id
* email
* created_at
* updated_at

Authentication architecture is not implemented in Phase 1.

---

## 9.2 RFP

Represents the procurement opportunity being analysed.

Potential future attributes:

* id
* title
* reference_number
* buyer
* deadline
* created_at
* updated_at

The exact fields will be determined by the actual product workflow.

---

## 9.3 Document

Represents a document associated with an RFP.

Potential future attributes:

* id
* rfp_id
* filename
* file_type
* storage_path
* page_count
* created_at

---

## 9.4 Analysis

Represents one analysis operation performed on an RFP/document.

Potential future attributes:

* id
* rfp_id
* status
* started_at
* completed_at
* model/provider metadata where appropriate

---

## 9.5 Requirement

Represents an important requirement extracted or interpreted from the RFP.

Conceptual attributes:

* id
* analysis_id
* category
* statement
* mandatory_status
* source_reference
* confidence

---

## 9.6 Finding

Represents an analytical observation.

Examples:

* missing information
* ambiguity
* contradiction

Conceptual attributes:

* id
* analysis_id
* type
* severity
* statement
* evidence
* source_reference
* confidence
* recommended_action

---

## 9.7 Risk

Represents a material risk identified from the document.

Conceptual attributes:

* id
* analysis_id
* category
* severity
* statement
* evidence
* impact
* recommended_action

---

## 9.8 Clarification Question

Represents a question generated from an unresolved issue.

Conceptual attributes:

* id
* analysis_id
* question
* reason
* source_reference
* priority
* status

---

## 9.9 Decision Brief

Represents the synthesized output of the analysis.

Potential components:

* opportunity snapshot
* key requirements
* gaps
* ambiguities
* contradictions
* risks
* clarification questions
* readiness status
* recommended next actions

The exact persistence model is not yet decided.

---

# 10. Evidence and Source References

Source traceability is a core product principle.

A future database design must preserve sufficient information to connect findings back to the original document.

Conceptually:

```text
Finding
   ↓
Evidence
   ↓
Document
   ↓
Page / Section
```

A source reference may eventually contain:

```text
document_id
page_number
section_identifier
excerpt
```

The final structure will be determined during document-processing implementation.

---

# 11. Data Integrity Principle

Important relationships should use database constraints where appropriate.

Examples may include:

* foreign keys
* unique constraints
* not-null constraints
* check constraints

Do not rely exclusively on application code to enforce data integrity when the database can safely enforce it.

---

# 12. Row Level Security

When user-owned persistent data is introduced, Supabase Row Level Security (RLS) should be evaluated and appropriately configured.

The principle is:

> A user must not be able to access another user's private application data.

RLS is NOT required merely because Supabase exists.

It becomes important when application tables containing user-specific data are created.

---

# 13. Public vs Private Data

The database should distinguish between:

### Public/product content

Potential examples:

* public demo RFP metadata
* public marketing content

### Private user data

Potential examples:

* uploaded RFPs
* analyses
* findings
* reports
* user information
* payment entitlements

Private data must not be publicly readable by default.

---

# 14. File Storage

Database records should not automatically contain large binary documents.

When document storage is implemented, evaluate Supabase Storage or another appropriate object-storage system.

The conceptual architecture is:

```text
User
 ↓
Upload
 ↓
Object Storage
 ↓
Document Record
 ↓
Processing
```

The database stores metadata and relationships.

The storage system stores the document binary.

---

# 15. Document Retention

Document retention policy is NOT yet finalized.

This matters because uploaded RFPs may contain commercially sensitive information.

Before production document storage is implemented, define:

* retention duration
* deletion behavior
* user deletion
* failed-upload cleanup
* storage limits
* access control
* backup implications

Do not assume indefinite storage.

---

# 16. Sensitive Information

RFPs may contain commercially sensitive information.

The database architecture must therefore assume:

> Uploaded documents and analysis results may be confidential.

Do not expose document contents through:

* public URLs
* public database queries
* client-side logs
* analytics payloads
* error messages

unless explicitly intended.

---

# 17. AI Output Storage

When AI processing is introduced, do not automatically store every raw model response.

First determine:

1. What information the product actually needs.
2. What information must be reproducible.
3. What information may contain sensitive content.
4. What storage cost is justified.

Prefer storing structured application results over unnecessary raw model transcripts.

---

# 18. Database Naming Principle

Use clear, consistent naming.

Preferred style:

```text
snake_case
```

Example:

```text
created_at
updated_at
analysis_id
document_id
```

Avoid ambiguous names.

---

# 19. Timestamps

Persistent records should generally use explicit timestamps where required.

Typical fields:

```text
created_at
updated_at
```

Time handling must be consistent across the application and database.

---

# 20. IDs

Use database-supported identifiers appropriate to the architecture.

The exact identifier strategy will be selected during the first real schema implementation.

Do not introduce multiple ID systems without a clear reason.

---

# 21. Indexing

Indexes should be added based on actual query patterns.

Do NOT add indexes to every column by default.

Each non-trivial index should have a reason.

Example:

> `analysis_id` requires an index because findings are frequently retrieved by analysis.

---

# 22. Database Performance Principle

Initial priority:

> Correctness before premature optimization.

Do not introduce:

* database sharding
* read replicas
* caching layers
* Redis
* complex query infrastructure

until actual workload requires them.

---

# 23. Database Cost Principle

The initial database must remain compatible with the low-cost MVP strategy.

Preferred starting point:

**Supabase Free**

Upgrade only when:

* usage requires it
* storage requires it
* performance requires it
* reliability requirements require it

---

# 24. Schema Change Process

Whenever a new database table/column/index/policy is proposed:

### Step 1

Explain the product requirement.

### Step 2

Explain why the existing schema cannot support it.

### Step 3

Define the proposed change.

### Step 4

Consider alternatives.

### Step 5

Document the decision.

### Step 6

Create a reproducible migration.

### Step 7

Test locally/against the appropriate environment.

### Step 8

Commit the migration.

### Step 9

Update this document if the architectural model changes.

---

# 25. Example Schema Decision

A future decision should look like:

```text
Requirement:
Users need to retrieve previous analyses.

Problem:
No persistent Analysis entity exists.

Decision:
Create analyses table.

Relationships:
user → analysis
rfp → analysis

Security:
Users can access only analyses belonging to them.

Migration:
YYYYMMDD_create_analyses.sql

Verification:
Create/read/update/delete tests.

Documentation:
03_DECISION_LOG.md
05_DATABASE.md
09_BUILD_LOG.md
```

---

# 26. Phase 1 Database Definition of Done

Phase 1 is complete when:

```text
[ ] Supabase project is configured
[ ] Application can connect correctly
[ ] Environment variables are documented
[ ] No secrets are committed
[ ] Migration strategy is established
[ ] Future entities are documented conceptually
[ ] No unnecessary product tables are created
[ ] Database access boundaries are understood
```

---

# 27. Current Database Status

**PHASE 1 — FOUNDATION**

Status:

**VERIFIED**

The `documents` table has been implemented with strict RLS to support secure RFP intake. Database implementation will remain intentionally minimal.

---

# 28. Explicitly Deferred

The following are not database commitments yet:

* authentication schema
* user profiles
* RFP schema
* document schema
* analysis schema
* finding schema
* risk schema
* clarification schema
* report schema
* payment schema
* subscription schema
* team schema
* audit-log schema

Each will require an explicit decision when its corresponding capability is implemented.

---

# 29. Core Principle

> **Do not design a database for the company we might become. Design the database required by the product we are actually building.**


## BUILD-006: Analysis Engine Tables

* **analysis_runs**: Tracks the processing status for an intelligence run. Features a unique partial index to ensure only one active run per document.
* **analysis_findings**: Stores explicit intelligence findings (category, severity, confidence). A strict foreign key enforces cascading deletes. Stores the exact verbatim quote and the page_number.



## BUILD-007: Relational Quotes

* **analysis_finding_quotes**: Replaced inline evidence and page_number. Allows one finding to cite multiple independent excerpts (critical for contradictions). RLS enforces ownership boundary.


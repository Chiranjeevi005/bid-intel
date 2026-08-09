# Pre-Bid Intelligence MVP — Engineering Decision Log

**Document:** 03_DECISION_LOG.md  
**Version:** 0.1  
**Status:** ACTIVE  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# Purpose

This document records significant engineering and product-technology decisions.

Its purpose is to make the project:

- traceable
- explainable
- reversible where possible
- educational
- resistant to AI-generated architectural drift

This is NOT a list of every small coding choice.

It records decisions that materially affect:

- architecture
- technology
- security
- cost
- maintainability
- product capability
- external dependencies

---

# Decision Statuses

Use one of:

- **PROPOSED** — under consideration
- **ACCEPTED** — approved and implemented/planned
- **REJECTED** — explicitly rejected
- **DEFERRED** — intentionally postponed
- **SUPERSEDED** — replaced by a newer decision

---

# ADR-001 — Use Next.js

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Application Architecture

## Context

The product is a web-first SaaS MVP.

We need an application framework capable of supporting the user interface and server-side application functionality without requiring separate frontend and backend repositories.

## Decision

Use Next.js as the primary application framework.

## Reasons

- Suitable for a web-first SaaS application.
- Supports the required React application model.
- Allows frontend and server-side functionality within one project.
- Works naturally with the selected Vercel deployment environment.
- Reduces initial infrastructure complexity.

## Alternatives Considered

### React + separate backend

Rejected for V0.1 because it introduces unnecessary separation and infrastructure.

### Pure static frontend

Rejected because the product will eventually require server-side document processing and external-service integration.

### Other full-stack frameworks

Not selected because Next.js sufficiently satisfies the current requirements.

## Consequences

### Positive

- One application repository.
- Simple deployment model.
- Reduced initial infrastructure.
- Easy progression from MVP to more capable application.

### Negative

- Creates dependency on the Next.js ecosystem.
- Developers must understand server/client boundaries.

## Revisit When

Architecture requirements materially exceed what a single Next.js application can reasonably support.

---

# ADR-002 — Use TypeScript

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Development

## Context

The application will process structured business entities such as requirements, findings, risks, evidence and decision briefs.

## Decision

Use TypeScript throughout the application.

## Reasons

- Explicit data structures.
- Compile-time type checking.
- Better maintainability.
- Reduced accidental data-shape mismatch.

## Alternative

JavaScript.

## Why Not

JavaScript would work technically but provides less protection as the product's domain model becomes more complex.

## Consequences

### Positive

- Better development-time feedback.
- More explicit contracts between modules.

### Negative

- Additional type definitions.
- Developers must understand TypeScript.

## Revisit When

No current reason to revisit.

---

# ADR-003 — Use Tailwind CSS

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** UI

## Context

The MVP needs a professional responsive interface while keeping the frontend implementation simple.

## Decision

Use Tailwind CSS as the initial styling system.

## Reasons

- Fast UI development.
- Responsive utilities.
- Low initial setup complexity.
- Fits the Next.js application.

## Alternatives Considered

- CSS Modules
- Component libraries
- Full design systems

## Decision Rationale

The MVP does not yet require a large design-system dependency.

## Consequences

### Positive

- Fast iteration.
- Consistent utility-based styling.

### Negative

- Large class strings can become difficult to read if poorly structured.

## Revisit When

The UI becomes large enough to justify a dedicated design system.

---

# ADR-004 — Use Supabase/PostgreSQL

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Data Infrastructure

## Context

The product will eventually require persistent structured data.

The MVP does not justify operating database infrastructure independently.

## Decision

Use Supabase with PostgreSQL as the initial database/backend foundation.

## Reasons

- Managed PostgreSQL.
- Reduced infrastructure burden.
- Suitable for structured relational data.
- Can later support additional backend capabilities.

## Alternatives Considered

### Self-hosted PostgreSQL

Rejected for MVP due to unnecessary operational overhead.

### Firebase

Not selected because PostgreSQL provides a more natural relational model for the expected domain.

### Separate managed PostgreSQL + custom backend

Deferred because it would introduce additional infrastructure before it is necessary.

## Consequences

### Positive

- Low operational burden.
- Relational database.
- Good fit for structured product data.

### Negative

- Vendor dependency.
- Future architecture may need adjustment if scale or requirements change.

## Revisit When

Database, storage, authentication or infrastructure requirements materially change.

---

# ADR-005 — GitHub Is the Source of Truth

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Engineering Governance

## Context

The project uses AI coding environments including Antigravity and Lovable.

AI development environments must not become permanent dependencies.

## Decision

GitHub is the permanent source-of-truth repository.

## Reasons

- Version control.
- Portability.
- Collaboration.
- Deployment integration.
- Independence from individual AI coding tools.

## Consequences

All meaningful implementation must eventually exist in GitHub.

---

# ADR-006 — Antigravity Is the Primary Engineering Environment

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Development Workflow

## Context

The project will use AI-assisted development but must avoid uncontrolled vibe coding.

## Decision

Antigravity is the primary engineering environment.

## Responsibilities

Antigravity is responsible for:

- implementation
- architecture
- backend logic
- testing
- debugging
- integration
- engineering documentation

## Important Constraint

Antigravity does not own the project.

GitHub owns the source code.

The `/docs` directory records the reasoning behind significant decisions.

---

# ADR-007 — Lovable Is a UI Accelerator, Not the System Owner

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Development Workflow

## Context

Lovable can accelerate UI development, but allowing it to independently modify the entire system would increase architectural drift and consume unnecessary build credits.

## Decision

Use Lovable selectively for UI generation and refinement.

## Allowed

- Landing page
- Upload UI
- Analysis UI
- Results UI
- Responsive refinement

## Not Allowed Without Explicit Engineering Decision

- Database redesign
- Authentication architecture
- Payment architecture
- Security architecture
- Core business logic
- Uncontrolled dependency changes

## Consequences

Lovable accelerates visual development while Antigravity remains responsible for system engineering.

---

# ADR-008 — Use Vercel for Initial Deployment

**Status:** ACCEPTED  
**Date:** 2026-08-09  
**Area:** Infrastructure

## Context

The application uses Next.js and requires a simple production deployment pipeline.

## Decision

Use Vercel for the initial production deployment.

## Deployment Model

```text
GitHub
   ↓
Vercel
   ↓
Production
```

## Reasons

* Simple deployment workflow.
* Strong compatibility with the selected application framework.
* Suitable for MVP infrastructure.

## Consequences

Vercel becomes an initial infrastructure dependency.

## Revisit When

Cost, performance, compliance, or infrastructure requirements justify migration.

---

# ADR-009 — Use Google Analytics 4

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Measurement

## Context

The MVP needs basic visibility into website usage.

## Decision

Use Google Analytics 4 for initial analytics.

## Phase 1 Events

* page_view
* application_loaded

## Future Events

* rfp_upload_started
* rfp_upload_completed
* analysis_started
* analysis_completed
* finding_viewed
* clarification_copied
* report_exported
* checkout_started
* payment_completed

## Important

Analytics must never prevent the application from working.

---

# ADR-010 — Do Not Build the Complete Database Schema in Phase 1

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Database

## Context

The eventual product may contain many entities, but Phase 1 only establishes infrastructure.

## Decision

Do not create the complete future database schema.

## Reasons

Premature schema design creates:

* unnecessary migrations
* assumptions about product behavior
* technical debt
* unused tables

## Rule

Database entities are created when the corresponding product capability is implemented.

---

# ADR-011 — PDF First, Other Formats Later

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Product Scope

## Context

The MVP needs a clear document input boundary.

## Decision

Support PDF first.

## Deferred

* DOCX
* XLSX
* PPTX
* email
* web pages
* ZIP packages
* OCR/scanned documents

## Reason

PDF support is sufficient to validate the core product workflow without multiplying document-processing complexity.

## Revisit When

Real users demonstrate demand for additional formats.

---

# ADR-012 — Evidence Must Be Traceable

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Product Intelligence

## Context

The product will make analytical observations about business documents.

Users must be able to distinguish source facts from AI interpretation.

## Decision

Important findings should contain source/page evidence whenever reliably available.

## Required Conceptual Structure

```text
Finding
 ├── statement
 ├── evidence
 ├── source
 ├── page
 ├── confidence
 └── action
```

## Reason

A finding without evidence is significantly less useful for professional decision-making.

## Consequence

Document processing must preserve source location whenever practical.

---

# ADR-013 — Human Retains Final Decision Authority

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** AI/Product Governance

## Context

The product supports business decisions but does not possess all information required to make those decisions autonomously.

## Decision

The system provides intelligence and recommendations.

The human user makes the final decision.

## The system must not claim

* guaranteed win probability
* guaranteed compliance
* guaranteed profitability
* guaranteed requirement completeness
* autonomous bid/no-bid decisions

## Consequence

The UI must frame outputs as evidence-backed analysis and recommendations.

---

# ADR-014 — Do Not Use Artificial Bid Scores in V0.1

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Product Intelligence

## Context

A numerical score such as:

> "Bid readiness = 82%"

can imply a level of statistical validity that the underlying document analysis cannot support.

## Decision

Use qualitative readiness states:

* READY
* CLARIFICATION REQUIRED
* MATERIAL INFORMATION MISSING

## Reason

Qualitative states are more transparent than unsupported numerical precision.

## Revisit When

A validated methodology and sufficient empirical data exist to justify quantitative scoring.

---

# ADR-015 — AI Provider Is Not Yet Locked

**Status:** DEFERRED
**Date:** 2026-08-09
**Area:** AI Infrastructure

## Context

The product will eventually require AI-assisted document intelligence.

However, choosing a provider before testing actual workloads would be premature.

## Decision

Do not lock the AI provider during Phase 1.

## Future Evaluation Criteria

* extraction quality
* reasoning quality
* structured-output reliability
* context capacity
* latency
* cost
* privacy
* API reliability

## Revisit When

The document-intelligence engine is ready to be implemented.

---

# ADR-016 — Payments Are Deferred

**Status:** DEFERRED
**Date:** 2026-08-09
**Area:** Monetization

## Context

Payment integration introduces engineering and compliance complexity.

The MVP must first prove that users value the analysis.

## Decision

Do not implement payments in Phase 1.

## Future Direction

Evaluate a Merchant of Record solution, with Paddle as the initial candidate.

This is not yet a final payment-provider decision.

## Trigger

Payment implementation begins only after usage demonstrates sufficient product value.

---

# ADR-017 — Initial Infrastructure Should Minimize Mandatory Spend

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Financial/Infrastructure

## Context

The MVP is being developed with limited initial capital.

## Decision

Prefer free or low-cost infrastructure until actual technical or commercial evidence requires paid infrastructure.

## Initial Direction

* GitHub Free
* Vercel Free
* Supabase Free
* Google Analytics
* Lovable Free where sufficient
* existing development environment

## Principle

> Capital follows evidence.

---

# ADR-018 — Product Name "BidScope" Rejected

**Status:** REJECTED
**Date:** 2026-08-09
**Area:** Product Identity

## Context

The previously considered name "BidScope" is already associated with an existing product/brand.

## Decision

Do not use "BidScope" as the commercial product name.

## Consequence

A separate naming/availability validation step is required before purchasing a domain or finalizing branding.

---

# ADR-019 — No Full RFP Response Platform in V0.1

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Product Scope

## Context

Existing RFP platforms already provide substantial functionality around:

* response management
* proposal generation
* content libraries
* collaboration
* compliance workflows

Attempting to reproduce these capabilities would dramatically expand the MVP.

## Decision

Focus on:

> Pre-bid understanding and intelligence.

## Explicitly Deferred

* proposal writing
* response libraries
* CRM
* collaboration
* full compliance management
* tender discovery

## Strategic Principle

> Understand the commitment before preparing the response.

---

# ADR-020 — Engineering Traceability Is Mandatory

**Status:** ACCEPTED
**Date:** 2026-08-09
**Area:** Engineering Governance

## Context

AI-assisted development can produce functional code without giving the developer sufficient understanding of why the code exists.

The project must simultaneously ship the MVP and develop engineering understanding.

## Decision

Every meaningful build step follows:

```text
Decision
   ↓
Documentation
   ↓
Implementation
   ↓
Verification
   ↓
Explanation
   ↓
Commit
```

## Required Documentation

Relevant decisions must update:

* `00_PRODUCT_CONTEXT.md`
* `01_ARCHITECTURE.md`
* `02_TECH_STACK.md`
* `03_DECISION_LOG.md`
* `09_BUILD_LOG.md`
* `10_CHANGELOG.md`

as appropriate.

## Consequence

No major architectural change should be silently generated by an AI coding tool.

---

# 5. Pending Decisions

The following are intentionally unresolved:

## PD-001 — Final Commercial Product Name

Requires:

* product search
* domain search
* trademark/conflict review
* social identity review

---

## PD-002 — Initial Vertical

The product category is:

> Pre-Bid Intelligence

The exact first commercial vertical remains subject to evidence-based validation.

---

## PD-003 — AI Provider

To be selected after document-processing requirements are tested.

---

## PD-004 — Payment Provider

Paddle is the first candidate, but implementation is deferred.

---

## PD-005 — Authentication

Authentication is not required for the first anonymous analysis workflow.

Decision will be revisited when saved history or paid accounts become necessary.

---

# 6. Decision Change Rules

A previous decision may be changed.

But the change must:

1. Identify the previous ADR.
2. Explain why it is insufficient.
3. Describe the new requirement/evidence.
4. Compare alternatives.
5. Record the new decision.
6. Mark the previous ADR as SUPERSEDED if appropriate.
7. Update affected architecture documents.
8. Record the implementation in the build log.

Do not silently overwrite historical reasoning.

---

# 7. Current Decision State

## Accepted

* Next.js
* TypeScript
* Tailwind
* Supabase/PostgreSQL
* Git/GitHub
* Vercel
* Google Analytics
* Antigravity as primary engineering environment
* Lovable as UI accelerator
* GitHub as source of truth
* PDF-first input
* evidence traceability
* human decision authority
* qualitative readiness
* minimal infrastructure spending
* engineering traceability

## Deferred

* AI provider
* payments
* authentication
* final vertical
* final commercial name
* full database schema
* additional document formats

## Rejected

* BidScope name
* full RFP response-management platform for V0.1
* artificial bid-probability scoring

---

# 8. Core Engineering Principle

> **If we cannot explain why a significant technical decision exists, the decision is not adequately documented.**


### BUILD-006: AI Provider & Evidence Contract
* **Provider Decision**: Selected DeepSeek V4 Flash for 1M context limit and extreme cost efficiency. Used standard etch() over native SDK to retain provider portability.
* **Evidence-First Design**: Implemented server-side deterministic string-matching. If the model fabricates a quote that does not exist verbatim on the cited page, the finding is discarded.
* **No-RAG Decision**: Given the 1M token context, all MVP RFPs can fit into a single prompt. Embeddings and RAG were deliberately deferred.


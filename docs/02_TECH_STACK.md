# Pre-Bid Intelligence MVP — Technology Stack

**Document:** 02_TECH_STACK.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# 1. Purpose

This document records the technology choices for the Pre-Bid Intelligence MVP.

It answers:

> What technologies are we using, what role does each technology play, and why did we choose it?

This document is intentionally focused on technology selection.

Detailed architectural decisions belong in:

`docs/01_ARCHITECTURE.md`

Individual architectural decisions belong in:

`docs/03_DECISION_LOG.md`

---

# 2. Technology Selection Principles

Technology must be selected according to the following priorities:

1. Product requirements
2. Simplicity
3. Maintainability
4. Production reliability
5. Low initial cost
6. Developer control
7. Easy deployment
8. Ability to evolve after validation

The MVP should not use technology merely because it is popular or AI-oriented.

A technology must have a clear job.

---

# 3. Locked Phase 1 Stack

| Layer | Technology | Status |
|---|---|---|
| Application framework | Next.js | LOCKED |
| Language | TypeScript | LOCKED |
| UI framework | React through Next.js | LOCKED |
| Styling | Tailwind CSS | LOCKED |
| Database | PostgreSQL through Supabase | LOCKED |
| Backend platform | Supabase | LOCKED |
| Source control | Git + GitHub | LOCKED |
| Deployment | Vercel | LOCKED |
| Analytics | Google Analytics 4 | LOCKED |
| Package manager | npm | LOCKED |
| Primary engineering environment | Antigravity | LOCKED |
| UI acceleration | Lovable | LOCKED |
| Domain | To be selected later | NOT YET LOCKED |
| Payments | Not implemented in Phase 1 | DEFERRED |
| AI provider | Not implemented in Phase 1 | DEFERRED |

---

# 4. Next.js

## Role

Next.js is the primary web application framework.

It provides the application structure for:

- pages
- layouts
- server/client components
- server-side application functionality
- routing
- production builds

## Why we chose it

The product is a web-first SaaS MVP.

We do not need a separate frontend application and backend application at the beginning.

Next.js allows the initial product to remain inside one repository and one deployment pipeline.

## What it is NOT responsible for

Next.js is not the database.

Next.js is not the AI model.

Next.js is not the analytics provider.

Next.js is not the payment provider.

It is the application framework connecting these systems where required.

---

# 5. TypeScript

## Role

TypeScript is the programming language used for the application code.

## Why we chose it

The product will eventually process structured business information such as:

- documents
- requirements
- evidence
- findings
- risks
- clarification questions
- decision briefs

These structures benefit from explicit types.

Example conceptual type:

```ts
type Finding = {
  type: string;
  severity: string;
  statement: string;
  evidence: string;
  sourcePage?: number;
  confidence?: string;
};
```

The exact domain types will be defined when the relevant product capability is implemented.

## Principle

Do not use `any` to hide an unclear data model.

If the data model is unclear, resolve the design problem instead.

---

# 6. React

## Role

React provides the component model used by the Next.js application.

Components will be used for:

* navigation
* buttons
* forms
* upload interface
* analysis states
* result sections
* reusable UI elements

## Principle

Components should represent meaningful UI or reusable behavior.

Do not create components solely to reduce file length.

---

# 7. Tailwind CSS

## Role

Tailwind is the initial styling system.

It will be used for:

* layout
* spacing
* typography
* responsive behavior
* visual states
* UI composition

## Why we chose it

The MVP requires a professional interface without introducing a large design-system dependency.

Tailwind allows the interface to remain close to the application code.

## Principle

Do not introduce another styling framework without a documented decision.

---

# 8. Supabase

## Role

Supabase is the initial backend platform.

The primary responsibility in Phase 1 is:

> Managed PostgreSQL database infrastructure.

Later it may provide:

* authentication
* file storage
* database access
* backend services

but those capabilities are not automatically part of Phase 1.

## Why we chose it

The MVP needs persistent structured data but does not justify operating a custom database infrastructure.

Supabase provides a managed PostgreSQL foundation while keeping the application architecture relatively simple.

## Important

Supabase is a platform dependency, not the application architecture itself.

The application should keep database access organized behind clear application/infrastructure boundaries.

---

# 9. PostgreSQL

## Role

PostgreSQL is the database engine provided through Supabase.

## Why

The future product contains structured relational concepts such as:

* RFP
* document
* analysis
* requirement
* finding
* risk
* clarification question
* decision brief
* user
* entitlement

A relational database is appropriate for these relationships.

## Phase 1 rule

Do not create the complete future schema.

Only create database structures when required by an implemented capability.

---

# 10. Git

## Role

Git provides version control.

Every meaningful implementation stage should produce a traceable commit.

## Commit principle

A commit should represent a coherent change.

Bad:

```text
update stuff
```

Better:

```text
chore: establish production foundation
```

Later examples:

```text
feat: add rfp document upload
feat: add requirement extraction
fix: preserve source page references
```

---

# 11. GitHub

## Role

GitHub is the permanent source-of-truth repository.

It stores:

* application code
* documentation
* configuration templates
* migration files
* engineering history

## Why

The project must remain independent from:

* Antigravity
* Lovable
* any individual AI coding environment

If either AI development tool disappears, the project must remain a normal software repository.

---

# 12. Vercel

## Role

Vercel is the initial production deployment platform.

The intended deployment path is:

```text
Local Development
       ↓
Git
       ↓
GitHub
       ↓
Vercel
       ↓
Production
```

## Why

The application uses Next.js and requires a simple deployment workflow during MVP development.

## Principle

Vercel is a deployment platform.

It should not contain undocumented business logic that exists nowhere in the repository.

---

# 13. Google Analytics 4

## Role

GA4 provides initial website/product measurement.

Phase 1 tracks only basic events:

* page view
* application loaded

Later phases may introduce:

* upload started
* upload completed
* analysis started
* analysis completed
* finding viewed
* clarification copied
* report exported
* checkout started
* payment completed

## Principle

Analytics must never be required for the application to function.

If the analytics ID is missing, the application must still operate.

---

# 14. npm

## Role

npm is the initial package manager.

## Why

The project does not currently require a different package-management strategy.

## Principle

Do not add packages without a reason.

Before adding a dependency, ask:

1. Is the functionality actually required?
2. Can the existing stack solve it?
3. Is the dependency maintained?
4. Does it introduce significant bundle/security complexity?
5. Can we remove it later?

---

# 15. Antigravity

## Role

Antigravity is the primary engineering environment.

It is responsible for:

* implementation
* architecture
* backend logic
* testing
* debugging
* integration
* documentation updates

## Important

Antigravity is NOT the source of truth.

GitHub is.

The project must remain executable independently of Antigravity.

---

# 16. Lovable

## Role

Lovable is a UI/product-development accelerator.

Primary uses:

* landing page exploration
* UI generation
* upload interface
* results interface
* responsive visual refinement

## Restriction

Lovable must not independently redefine:

* database architecture
* business logic
* security architecture
* environment configuration
* payment architecture
* API contracts

The generated UI must ultimately be integrated into the GitHub-controlled application.

---

# 17. AI Technology

AI is part of the eventual product architecture but is NOT part of Phase 1.

The future product may use AI for:

* document interpretation
* requirement extraction
* missing-information analysis
* ambiguity detection
* contradiction detection
* risk reasoning
* clarification-question generation
* report synthesis

The AI provider has deliberately NOT been locked yet.

## Why

Choosing an AI provider before implementing the actual document-analysis workflow would be premature.

The provider should be selected based on:

* quality
* structured-output reliability
* context capacity
* cost
* latency
* privacy requirements
* API reliability
* actual MVP workload

---

# 18. Payment Technology

Payments are NOT part of Phase 1.

The current direction is to evaluate a Merchant of Record solution, with Paddle as the first candidate.

This is not yet a locked implementation decision.

Payment architecture will be documented when monetization is actually introduced.

---

# 19. Domain

The final commercial domain is NOT yet selected.

The previously considered product name "BidScope" is rejected.

No domain should be purchased until:

* product naming is validated
* existing product conflicts are checked
* domain availability is checked
* commercial identity is reasonably safe

---

# 20. Infrastructure Cost Strategy

Initial objective:

> Operate the MVP with minimal mandatory infrastructure expenditure.

Preferred starting infrastructure:

```text
GitHub Free
+
Vercel Free
+
Supabase Free
+
Google Analytics
+
Antigravity
+
Lovable Free
```

Paid services should only be introduced when evidence or technical necessity justifies them.

---

# 21. Technology Dependency Principle

Every external service introduces:

* dependency
* cost
* failure risk
* migration cost

Therefore:

> Use external services where they materially reduce complexity, but do not allow them to become unnecessary architectural dependencies.

---

# 22. Technology Decision Process

A significant technology change must follow:

```text
Problem
   ↓
Requirement
   ↓
Options
   ↓
Comparison
   ↓
Decision
   ↓
Documentation
   ↓
Implementation
   ↓
Verification
```

The decision must be recorded in:

`docs/03_DECISION_LOG.md`

---

# 23. Phase 1 Technology Definition of Done

Phase 1 technology setup is complete when:

* Next.js works
* TypeScript works
* Tailwind works
* Supabase foundation works
* Git works
* GitHub repository works
* Vercel deployment works
* GA4 integration is prepared
* environment configuration is documented
* no secrets are committed
* unnecessary dependencies have not been introduced

---

# 24. Current Status

**PHASE 1 — PRODUCTION FOUNDATION**

Technology stack:

**LOCKED**

Future technology choices:

**DEFERRED UNTIL REQUIRED**

---

# 25. Core Principle

> **Technology exists to serve the product. The product does not exist to justify technology.**

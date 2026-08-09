# Pre-Bid Intelligence MVP — Architecture

**Document:** 01_ARCHITECTURE.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# 1. Architecture Objective

The architecture must support the Pre-Bid Intelligence MVP while remaining:

- simple
- inexpensive
- understandable
- maintainable
- deployable
- easy to extend
- independent from any single AI coding environment

The initial architecture deliberately avoids unnecessary infrastructure.

---

# 2. Architectural Principle

The application follows a modular full-stack web architecture.

```text
                    USER
                      │
                      ▼
              ┌───────────────┐
              │   Next.js     │
              │   Web App     │
              └───────┬───────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
   Application Logic         Analytics
          │
          ▼
       Supabase
          │
          ▼
      PostgreSQL
```

Later, the document intelligence pipeline will be added:

```text
User
 │
 ▼
PDF Upload
 │
 ▼
Document Processing
 │
 ▼
Structured Evidence
 │
 ▼
Intelligence Engine
 │
 ├── Requirement Intelligence
 ├── Missing Information
 ├── Ambiguity Detection
 ├── Contradiction Detection
 ├── Risk Intelligence
 └── Clarification Questions
 │
 ▼
Decision Brief
 │
 ▼
Human Decision
```

---

# 3. Current Technology Stack

## Frontend / Application

**Next.js**

Use:

* App Router
* TypeScript
* React
* Tailwind CSS

### Why

Next.js provides the application framework required for the MVP while allowing frontend and server-side application functionality to remain within one project.

The project does not require a separate frontend and backend application at this stage.

---

## Language

**TypeScript**

### Why

TypeScript provides static type checking and makes data structures explicit.

This is particularly important because the product will eventually process structured objects such as:

```text
Requirement
Finding
Risk
ClarificationQuestion
EvidenceReference
DecisionBrief
```

Strong typing will help prevent accidental mismatches between these structures.

---

## Styling

**Tailwind CSS**

### Why

Tailwind provides a low-overhead styling system suitable for a small product team and allows the interface to remain close to the component implementation.

No separate design-system framework is required at this stage.

---

## Database / Backend Platform

**Supabase**

Primary database:

**PostgreSQL**

### Why

The MVP requires persistent structured data but does not require custom database infrastructure.

Supabase provides managed PostgreSQL and can later support:

* authentication
* storage
* database access
* server-side integrations

without requiring a separate infrastructure stack.

---

## Repository

**GitHub**

GitHub is the permanent source-of-truth repository.

The application must remain independently deployable from Antigravity or Lovable.

Neither AI development environment is considered the permanent source of truth.

---

## Hosting

**Vercel**

### Why

The application uses Next.js, making Vercel a straightforward deployment target.

The initial objective is:

```text
GitHub
   ↓
Vercel
   ↓
Production
```

---

## Analytics

**Google Analytics 4**

Used initially for basic product/website measurement.

Analytics must never be a dependency for application functionality.

If the analytics environment variable is absent, the application must continue operating normally.

---

# 4. Development Tool Responsibilities

## Antigravity

Antigravity is the primary engineering environment.

It is responsible for:

* application architecture
* backend/application logic
* database integration
* document processing
* intelligence engine
* testing
* debugging
* integration
* deployment preparation

Antigravity must not become a hidden dependency.

---

## Lovable

Lovable is a UI/product-design accelerator.

It may be used for:

* landing page generation
* UI exploration
* upload interface
* result interface
* responsive design refinement

Lovable must NOT silently become the owner of:

* database architecture
* business logic
* security model
* environment configuration
* backend architecture

All important implementation remains under GitHub/Antigravity control.

---

# 5. Source of Truth Hierarchy

The project uses the following hierarchy:

```text
Product decisions
      ↓
/docs
      ↓
GitHub source code
      ↓
Production application
```

AI coding tools are implementation tools.

They are not the source of truth.

---

# 6. Application Layers

The application will be organized conceptually into the following layers.

```text
Presentation Layer
        ↓
Application Layer
        ↓
Domain / Intelligence Layer
        ↓
Infrastructure Layer
```

---

## 6.1 Presentation Layer

Responsible for:

* pages
* layouts
* forms
* upload interface
* analysis status
* results presentation
* error states

It should NOT contain complex business logic.

---

## 6.2 Application Layer

Responsible for:

* orchestrating user actions
* validation
* calling domain services
* managing workflow state
* connecting UI actions to backend services

---

## 6.3 Domain / Intelligence Layer

Future responsibility:

* document understanding
* requirement extraction
* missing-information detection
* ambiguity detection
* contradiction detection
* risk classification
* clarification-question generation
* decision-brief construction

This layer should contain product intelligence rather than UI-specific logic.

---

## 6.4 Infrastructure Layer

Responsible for external systems:

* Supabase
* PostgreSQL
* file storage
* AI APIs
* analytics
* payment provider
* external services

The domain layer should not be tightly coupled to specific infrastructure wherever practical.

---

# 7. Initial Repository Structure

The target structure is approximately:

```text
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
│
├── components/
│
├── lib/
│   ├── analytics.ts
│   └── supabase/
│       ├── client.ts
│       └── server.ts
│
├── types/
│
├── public/
│
├── docs/
│   ├── 00_PRODUCT_CONTEXT.md
│   ├── 01_ARCHITECTURE.md
│   ├── 02_TECH_STACK.md
│   ├── 03_DECISION_LOG.md
│   ├── 04_ENVIRONMENT.md
│   ├── 05_DATABASE.md
│   ├── 06_ANALYTICS.md
│   ├── 07_DEPLOYMENT.md
│   ├── 08_SECURITY.md
│   ├── 09_BUILD_LOG.md
│   └── 10_CHANGELOG.md
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

This structure may evolve when actual product requirements justify the change.

Do not create folders merely for theoretical future functionality.

---

# 8. Phase 1 Architecture

Phase 1 intentionally contains very little product functionality.

```text
Browser
   │
   ▼
Next.js
   │
   ├── React UI
   ├── TypeScript
   ├── Tailwind
   └── Analytics
   │
   ▼
Supabase Client
   │
   ▼
Supabase
   │
   ▼
PostgreSQL
```

Deployment:

```text
Developer
   │
   ▼
GitHub
   │
   ▼
Vercel
   │
   ▼
Production
```

---

# 9. Future Document Processing Architecture

This is architectural direction, NOT Phase 1 implementation.

```text
PDF Upload
    │
    ▼
File Validation
    │
    ▼
Document Storage
    │
    ▼
Text Extraction
    │
    ▼
Page-Aware Document Representation
    │
    ▼
Structured Evidence
```

The document representation should preserve source location wherever possible.

Example conceptual structure:

```text
Document
 ├── metadata
 ├── pages[]
 │    ├── page_number
 │    └── text
 └── sections[]
      ├── title
      ├── content
      └── source_pages[]
```

---

# 10. Future Intelligence Architecture

The intelligence system should operate from structured document evidence.

```text
Structured Document
        │
        ▼
Evidence Layer
        │
        ├───────────────┐
        ▼               ▼
Requirement Engine   Gap Engine
        │               │
        └───────┬───────┘
                ▼
        Ambiguity Engine
                │
                ▼
       Contradiction Engine
                │
                ▼
          Risk Engine
                │
                ▼
      Clarification Engine
                │
                ▼
       Decision Brief
```

The exact implementation may use one or multiple AI calls.

The architecture should not assume that every analytical capability requires a separate model or service.

---

# 11. Evidence Model

A central architectural principle is:

> **Analytical findings must be traceable to source evidence.**

Conceptually:

```text
Finding
│
├── type
├── severity
├── statement
├── evidence
├── source
│    ├── page
│    └── section
├── confidence
└── recommended_action
```

Example:

```text
Finding:
"Response time is not defined."

Type:
missing_information

Severity:
high

Evidence:
"Immediate response required."

Source:
Page 12

Recommended action:
"Request a measurable maximum response-time requirement."
```

The system must distinguish extracted evidence from interpretation.

---

# 12. AI Boundary

AI may be used for:

* document interpretation
* classification
* extraction
* ambiguity analysis
* risk reasoning
* question generation
* report synthesis

AI must NOT be treated as an unquestionable authority.

The application should maintain a distinction between:

```text
Source Evidence
      ↓
AI Interpretation
      ↓
Recommendation
```

The UI should make this distinction visible where material.

---

# 13. No Autonomous Decision Architecture

The system will not autonomously decide:

* bid
* don't bid
* win
* lose
* profitable
* compliant

It can provide:

> **Bid readiness / review status**

based on detected document conditions.

The human makes the final decision.

---

# 14. Security Architecture Principles

Secrets must never be exposed to client-side code.

Examples of sensitive values:

* Supabase service-role key
* AI API keys
* payment provider secret keys
* webhook secrets
* database credentials

Public environment variables may only contain values intentionally safe for browser exposure.

---

# 15. Environment Separation

The application should support:

```text
Local Development
        ↓
Preview / Testing
        ↓
Production
```

Secrets should be configured through environment variables.

No secrets should be committed to GitHub.

---

# 16. Deployment Architecture

Initial deployment:

```text
Local Development
        │
        ▼
GitHub
        │
        ├── Preview deployments
        │
        ▼
Vercel
        │
        ▼
Production
```

The production environment should use production environment variables.

The local environment should use local development variables.

---

# 17. Analytics Architecture

Initial analytics:

```text
User
  ↓
Next.js
  ↓
GA4
```

Initial events:

* page_view
* application_loaded

Later product events:

* rfp_upload_started
* rfp_upload_completed
* analysis_started
* analysis_completed
* finding_viewed
* clarification_copied
* report_exported
* paid_checkout_started
* payment_completed

These are intentionally deferred until the relevant product functionality exists.

---

# 18. Payment Architecture — Future

Payments are NOT part of Phase 1.

When monetization is introduced, the expected architecture is:

```text
User
  ↓
Application
  ↓
Merchant of Record / Payment Provider
  ↓
Payment
  ↓
Server-side Webhook
  ↓
Application Backend
  ↓
Entitlement
  ↓
Supabase
```

The frontend must never be trusted to determine payment status.

Payment integration will be documented as a separate architecture decision when implemented.

---

# 19. Database Philosophy

Supabase PostgreSQL is the initial database.

Do not design the complete schema before the product workflow requires it.

Future conceptual entities may include:

```text
User
Document
RFP
Analysis
Requirement
Finding
Risk
ClarificationQuestion
DecisionBrief
Payment
Entitlement
```

These are conceptual entities only.

They are NOT automatically approved for implementation.

Database design must follow actual product requirements.

---

# 20. Performance Principles

Initial priorities:

1. Fast page loading
2. Small client bundle
3. Avoid unnecessary JavaScript
4. Server-side processing where appropriate
5. Do not load heavy libraries unnecessarily
6. Do not perform expensive AI processing during page rendering

Long-running document processing should not block the basic web application.

---

# 21. Cost Principles

The MVP should prioritize free or low-cost infrastructure.

Initial preferred services:

* GitHub Free
* Vercel Free
* Supabase Free
* Google Analytics
* Lovable Free where useful
* Antigravity as development environment

Paid services should only be introduced when:

1. a real technical bottleneck exists, or
2. a validated business requirement exists.

---

# 22. Architecture Decision Rules

Any significant architectural change must answer:

### What problem does this solve?

### Why is the current architecture insufficient?

### What alternatives were considered?

### What does this add?

### What does this cost?

### What new dependency does it introduce?

### How can we remove it later if necessary?

The decision must then be recorded in:

`docs/03_DECISION_LOG.md`

---

# 23. AI Coding Tool Rules

Antigravity and Lovable must follow these rules.

### Before meaningful implementation:

1. Explain intended change.
2. Identify affected files.
3. Identify architectural impact.
4. Record significant decision.
5. Implement.
6. Verify.
7. Update build log.

### Do not:

* silently change architecture
* introduce unnecessary dependencies
* rewrite unrelated files
* create duplicate services
* create duplicate components
* add features outside the current phase
* expose secrets
* claim tests passed without running them

---

# 24. Phase 1 Definition of Done

Phase 1 is complete when:

* Next.js application exists
* TypeScript is configured
* Tailwind is configured
* Supabase foundation exists
* environment configuration exists
* GitHub repository is configured
* Vercel deployment works
* basic analytics is prepared
* local build succeeds
* production build succeeds
* production deployment succeeds
* documentation is updated
* build log is updated
* no secrets are committed

---

# 25. Phase 1 Non-Goals

The following must NOT be implemented in Phase 1:

* PDF upload
* PDF extraction
* OCR
* RFP analysis
* requirement extraction
* risk detection
* ambiguity detection
* contradiction detection
* clarification generation
* decision brief
* authentication
* payments
* subscriptions
* CRM
* dashboards
* AI agents
* AI model training

---

# 26. Current Architecture Status

**Phase 1 — Production Foundation**

Status:

**IN PROGRESS**

Next implementation objective:

> Establish the minimal production foundation and verify that it can be independently developed, versioned, deployed and maintained.

---

# 27. Architecture Change Control

This document describes the current architecture.

It is not permission to implement future architecture prematurely.

If implementation reveals that an architectural assumption is wrong:

1. Stop.
2. Explain the problem.
3. Record the decision.
4. Update this document.
5. Then implement the change.

Architecture should evolve from evidence, not speculation.

---

# 28. Core Principle

> **Build the smallest architecture that can reliably support the next validated product capability.**

Do not build the architecture for the hypothetical final company.

Build the architecture required for the next real step.

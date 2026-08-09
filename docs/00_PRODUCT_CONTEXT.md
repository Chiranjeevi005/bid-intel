# Pre-Bid Intelligence MVP — Product Context

**Document:** 00_PRODUCT_CONTEXT.md  
**Version:** 0.1  
**Status:** LOCKED  
**Last Updated:** 2026-08-09  
**Owner:** Product / Engineering  
**Repository:** bid-intel

---

## 1. Product Identity

### Working Product Name

**Pre-Bid Intelligence**

This is a working product/category name, not the final commercial brand name.

The previously considered name "BidScope" is rejected because it is already associated with an existing product/brand.

A final product name will be selected and validated separately.

---

## 2. Product Category

**Pre-Bid Intelligence Software**

The product operates before proposal/response preparation.

It is not intended to become a complete RFP response-management platform.

---

## 3. Product Thesis

Most RFP software focuses heavily on helping organizations:

- find requirements
- manage response content
- generate answers
- collaborate
- maintain proposal libraries
- submit proposals

Our product focuses on the stage before those activities:

> **Understand what the organization is being asked to commit to before investing significant time in responding.**

The product transforms an RFP into structured, evidence-backed intelligence that helps a human bidder understand:

- what is required
- what is missing
- what is ambiguous
- what appears contradictory
- what creates risk
- what should be clarified
- whether the opportunity appears ready for further bid preparation

The product does NOT make the final bid decision.

---

## 4. Core Problem

RFP documents can contain:

- numerous requirements
- eligibility conditions
- technical requirements
- commercial requirements
- contractual obligations
- delivery expectations
- deadlines
- evaluation criteria
- responsibilities
- assumptions
- appendices
- cross-references
- ambiguous language
- incomplete information
- potentially conflicting information

A bidder may therefore spend significant time understanding the opportunity before beginning the actual response.

The product aims to reduce this initial analysis burden and make important risks and information gaps visible earlier.

---

## 5. Target User — V0.1

The product is initially designed for:

> **People and small teams that evaluate and respond to RFPs or similar procurement documents.**

The exact vertical/customer segment remains subject to validation.

We will NOT prematurely assume that the product should serve:

- government contractors
- SaaS companies
- consultants
- agencies
- construction companies
- professional-services firms
- large enterprises

The initial MVP will therefore use a **vertical-neutral RFP intelligence architecture** while acquisition research determines the strongest initial customer vertical.

---

## 6. Core User Job

The user's core job is:

> **"Help me understand this RFP before I commit resources to responding to it."**

The user should be able to:

1. Upload an RFP.
2. Understand its structure.
3. Identify important requirements.
4. Identify missing information.
5. Identify ambiguous requirements.
6. Identify potential contradictions.
7. Understand important risks.
8. Generate useful clarification questions.
9. Review an evidence-backed decision brief.
10. Make the final human decision about what to do next.

---

## 7. Core Product Pipeline

The product follows one analytical pipeline:

```text
RFP
  ↓
Document Understanding
  ↓
Structured Evidence
  ↓
Requirement Intelligence
  ↓
Missing Information
  ↓
Ambiguity Detection
  ↓
Contradiction Detection
  ↓
Risk Intelligence
  ↓
Clarification Questions
  ↓
Decision Brief
  ↓
Human Decision
```

These are not independent products.

They are analytical stages operating on the same underlying document evidence.

---

## 8. V0.1 Input

### Supported

* PDF documents
* Primarily text-based PDFs

### Not initially required

* DOCX
* XLSX
* PPTX
* scanned PDFs
* OCR
* email ingestion
* web-page ingestion
* ZIP packages

Additional formats may be added only after the core workflow is validated.

---

## 9. V0.1 Output

The primary output is an:

# Evidence-Backed Decision Brief

The brief should contain:

1. Opportunity snapshot
2. Document structure
3. Important requirements
4. Missing information
5. Ambiguities
6. Contradictions
7. Risks
8. Clarification questions
9. Recommended next actions
10. Bid-readiness status

---

## 10. Evidence Principle

The product must distinguish between:

### A. Extracted Evidence

Information explicitly present in the source document.

Example:

> Contract term: 36 months
> Source: Section 2.3, page 7

### B. Interpretation

An analytical conclusion derived from document evidence.

Example:

> The contract requires a relatively long delivery commitment.

### C. Recommendation

A suggested action based on evidence and interpretation.

Example:

> Confirm termination conditions before proceeding.

These three categories must never be presented as if they are equivalent.

---

## 11. Source Traceability

Important findings must be traceable to the original document whenever technically possible.

A finding should ideally contain:

```text
Finding
Category
Severity
Evidence
Source section
Page
Confidence
Recommended action
```

The system must never invent a page number or source reference.

If source location cannot be reliably determined, the system must explicitly indicate that source traceability is unavailable.

---

## 12. Human-in-the-Loop Principle

The product provides intelligence.

The human retains decision authority.

The system must NOT claim:

* guaranteed bid success
* guaranteed compliance
* guaranteed requirement completeness
* guaranteed risk detection
* automatic bid acceptance/rejection
* guaranteed profitability

The system may recommend:

* clarification
* internal verification
* further review
* caution
* readiness status

But the final decision belongs to the user.

---

## 13. Bid Readiness

V0.1 will use qualitative readiness states rather than artificial numerical scores.

### 🟢 READY

No material unresolved information is detected by the system.

### 🟡 CLARIFICATION REQUIRED

Important information remains unclear or ambiguous.

### 🔴 MATERIAL INFORMATION MISSING

The document appears to contain information gaps that could materially affect evaluation, compliance, pricing, delivery, or contractual understanding.

These labels are decision-support signals, not guarantees.

---

## 14. V0.1 MoSCoW Scope

### MUST

* PDF upload
* Document structure extraction
* Requirement intelligence
* Missing-information detection
* Ambiguity detection
* Contradiction detection
* Risk intelligence
* Clarification questions
* Evidence-backed Decision Brief

### SHOULD

* Source/page traceability
* Finding-level confidence
* Copy/export
* Demo RFP
* Processing progress
* Failure/error handling
* Responsive interface

### COULD

* User accounts
* Analysis history
* Company profile
* Company/RFP fit
* Compliance matrix
* Pricing analysis
* Paid reports
* Payments
* Email delivery
* Proposal generation
* Collaboration
* CRM
* Integrations
* Tender discovery
* Historical analytics

### WON'T IN V0.1

* Full proposal-management platform
* Full CRM
* Tender marketplace
* Tender discovery engine
* Scheduling
* Invoicing
* Payroll
* Accounting
* Employee management
* Mobile application
* Autonomous bid/no-bid decision
* Win-probability prediction
* Automatic bid pricing
* Custom foundation-model training

---

## 15. Product Positioning

The product should NOT primarily be positioned as:

> "AI-powered RFP summarization."

It should NOT primarily be positioned as:

> "AI proposal writing."

The intended positioning is:

> **Understand the RFP before you commit to the bid.**

The product sits upstream of response generation.

---

## 16. Competitive Position

Existing RFP platforms already provide capabilities such as:

* requirement extraction
* compliance management
* response generation
* proposal libraries
* collaboration
* proposal automation

Therefore the product does not attempt to compete with the entire RFP response-management category.

The intended differentiation is:

> **Evidence-backed pre-bid understanding and risk discovery before response preparation.**

This is a positioning hypothesis that must be validated through customer research and usage.

It is NOT considered a guaranteed competitive moat.

---

## 17. MVP Validation Question

The first MVP is designed to answer one primary question:

> **Will an RFP evaluator/bidder upload a real RFP because they believe pre-bid intelligence can save time, expose important gaps or risks, and improve their preparation?**

Secondary questions:

* Do users trust the findings?
* Do they verify the source evidence?
* Which intelligence output is most valuable?
* Do they return with another RFP?
* Do they want a downloadable report?
* Would they pay for additional analysis?

---

## 18. Initial Product Metrics

We care about:

```text
Landing Page
    ↓
Upload Started
    ↓
Upload Completed
    ↓
Analysis Completed
    ↓
Finding Viewed
    ↓
Clarification Question Used
    ↓
Return Usage
    ↓
Paid Intent
    ↓
Payment
```

Traffic alone is not considered product validation.

---

## 19. Financial Principle

Initial capital is limited.

Therefore:

> **Capital follows evidence.**

Do not purchase:

* unnecessary SaaS subscriptions
* advertising
* expensive infrastructure
* unnecessary APIs
* unnecessary development tools

until a measurable bottleneck or validated opportunity justifies the expenditure.

---

## 20. Engineering Philosophy

The product should be:

* simple
* traceable
* evidence-driven
* maintainable
* inexpensive to operate
* human-centered
* production-oriented

Avoid:

* premature abstraction
* unnecessary microservices
* unnecessary infrastructure
* unnecessary AI
* feature accumulation
* black-box automation

---

## 21. Development Philosophy

This project is NOT being developed as blind vibe coding.

The development process is:

```text
Decision
  ↓
Document
  ↓
Implement
  ↓
Verify
  ↓
Explain
  ↓
Commit
  ↓
Next Decision
```

Every meaningful technical decision must be traceable through `/docs`.

---

## 22. Current Development Status

### Phase

**Phase 1 — Production Foundation**

### Current objective

Establish:

* Next.js
* TypeScript
* Tailwind
* Supabase
* GitHub
* environment configuration
* basic analytics
* Vercel deployment

### Product intelligence

NOT YET IMPLEMENTED.

---

## 23. Non-Goals of This Document

This document does not define:

* detailed database schema
* API contracts
* AI prompts
* document-processing implementation
* UI design system
* payment architecture
* production pricing
* final commercial brand
* final target vertical

Those decisions belong in their respective engineering/product documents.

---

## 24. Change Control

Any change to the following requires a documented decision:

* product scope
* target user
* core workflow
* MVP MoSCoW classification
* fundamental product positioning
* major architectural principle

Do not silently change these during implementation.

---

## 25. Current Status

**STATUS: LOCKED FOR V0.1**

The purpose of this document is to prevent product and engineering scope drift during implementation.

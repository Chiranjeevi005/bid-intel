# Pre-Bid Intelligence MVP — Security

**Document:** 08_SECURITY.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# 1. Purpose

This document defines the security principles and baseline controls for the Pre-Bid Intelligence MVP.

The product will eventually process potentially confidential RFP and procurement documents.

Therefore security is not an optional enhancement.

The architecture must assume:

> Uploaded RFPs may contain commercially sensitive information.

The objective of Phase 1 is to establish a secure foundation without introducing unnecessary security infrastructure.

---

# 2. Security Principles

The project follows these principles:

1. Least privilege
2. Secure defaults
3. Explicit trust boundaries
4. Server-side protection of secrets
5. Private-by-default user data
6. Minimal data collection
7. Evidence and auditability
8. Dependency awareness
9. Controlled external integrations
10. Security proportional to the actual MVP risk

---

# 3. Security Boundaries

The main system boundaries are:

```text
                    USER
                      │
                      ▼
              ┌───────────────┐
              │    Browser    │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │    Next.js    │
              └───────┬───────┘
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
      Supabase      AI API      Payments
       Future       Future       Future
```

Each external system introduces a separate trust boundary.

---

# 4. Secrets Management

Secrets must never be embedded in:

* source code
* React components
* client-side JavaScript
* Git history
* documentation
* screenshots
* analytics events
* error messages

Examples:

* service-role keys
* AI API keys
* payment secrets
* webhook signing secrets
* database credentials

Secrets belong in environment configuration or the appropriate secret-management mechanism.

---

# 5. Public Environment Variables

Only values intentionally safe for browser exposure may use:

```text
NEXT_PUBLIC_
```

Examples:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GA_MEASUREMENT_ID
```

A public Supabase key does not make database data public.

Database access policies must determine what data can actually be accessed.

---

# 6. Supabase Security

When user-owned data is introduced:

* Row Level Security must be evaluated.
* Private records must not be publicly readable.
* Users must only access records they are authorized to access.
* Server-side privileged credentials must remain server-side.

The Supabase service-role credential, if introduced, must never be exposed to browser code.

---

# 7. Database Access

Database access should follow the principle:

> The application should request only the data it actually needs.

Avoid:

* unrestricted database queries
* unnecessary exposure of internal fields
* returning entire database records to the browser
* client-side access to privileged operations

---

# 8. RFP Document Confidentiality

RFP documents may contain:

* company information
* client information
* pricing
* contractual terms
* technical requirements
* contact information
* commercially sensitive information

Therefore:

> Uploaded documents must be treated as private by default.

Do not expose uploaded files through publicly accessible URLs unless explicitly required and securely designed.

---

# 9. File Upload Security

When PDF upload is implemented, the system must validate:

### File type

Accept only supported formats.

Initial supported format:

```text
PDF
```

### File size

Apply a reasonable maximum file size.

The exact limit will be established when the document-processing implementation is built.

### File name

Do not trust user-provided filenames.

Treat filenames as untrusted input.

### Content

A file extension alone must not be treated as proof of file type.

Where practical, validate the actual file content.

---

# 10. Malicious or Invalid Documents

The document-processing system must assume uploaded documents may be:

* malformed
* corrupted
* unexpectedly large
* incorrectly labelled
* empty
* malicious

The processing pipeline must fail safely.

A malformed document must not crash the entire application.

---

# 11. Prompt Injection

Because the product will eventually send document content to an AI model, the system must treat document text as **untrusted input**.

An RFP may contain text such as:

> "Ignore previous instructions..."

That text must be treated as document content, not as an instruction to the application.

The future AI architecture must establish a clear boundary between:

```text
System Instructions
        ↓
Application Instructions
        ↓
Untrusted Document Content
```

Document content must never automatically override system or application instructions.

---

# 12. AI Output Validation

AI output must not be trusted blindly.

When AI processing is introduced:

1. Define an explicit output schema.
2. Validate the returned structure.
3. Reject malformed outputs.
4. Handle incomplete outputs.
5. Prevent unexpected fields from being blindly persisted.
6. Preserve source references separately where possible.

The application must not assume that a successful AI API response means the output is correct.

---

# 13. Evidence Integrity

The AI must not be allowed to invent source references.

For example:

If the source document has no page 27, the application must not display:

> Source: Page 27

Source references should originate from the document-processing layer wherever possible.

---

# 14. AI Provider Data Handling

Before connecting a production AI provider, document:

* what data is sent
* why it is sent
* how long it may be retained
* whether the provider uses submitted data for training
* where processing occurs
* applicable privacy controls
* applicable contractual terms

The AI provider is intentionally not locked during Phase 1.

---

# 15. Analytics Privacy

Analytics must not receive:

* RFP text
* document contents
* extracted requirements
* confidential pricing
* contract terms
* AI raw responses
* uploaded document contents
* unnecessary personal information

Analytics should measure behavior, not confidential business content.

---

# 16. Authentication

Authentication is implemented via Supabase Auth using `@supabase/ssr` (Next.js App Router).

* Session handling is secured via HTTP-only cookies (`auth/callback` PKCE exchange).
* Cookie-based session handling reduces exposure of session tokens to client-side JavaScript compared with localStorage-based storage; application security still depends on preventing XSS and other vulnerabilities.
* Route protection is enforced at the edge via `middleware.ts` before pages render.
* Private resources will be associated with the authenticated user (`auth.uid()`) in subsequent builds.
* Users must not be able to access another user's resources by changing an identifier.

Authentication must not be treated as authorization (Authorization is handled via RLS).

---

# 17. Authorization

The principle is:

> Authentication answers "Who are you?"
> Authorization answers "What are you allowed to access?"

Future authorization must be enforced at the appropriate backend/database boundary.

Do not rely only on hiding UI elements.

---

# 18. API Security

Future API endpoints must:

* validate input
* reject unsupported data
* enforce authorization
* avoid exposing secrets
* return appropriate errors
* avoid unnecessary data exposure

Never assume that because an endpoint is not linked from the UI, it is inaccessible.

---

# 19. Input Validation

All external input is untrusted.

Examples:

* uploaded files
* query parameters
* form values
* URLs
* IDs
* API payloads
* webhook payloads

Validate inputs at the appropriate boundary.

Do not rely exclusively on frontend validation.

---

# 20. Output Encoding

User-provided or document-derived content must be handled safely when rendered.

Do not render arbitrary HTML from uploaded documents or AI output without explicit sanitization and justification.

Avoid unnecessary use of raw HTML rendering.

---

# 21. Error Handling

Production errors must not expose:

* stack traces
* secrets
* database credentials
* internal paths
* API keys
* provider credentials

Users should receive useful but safe error messages.

Detailed diagnostics belong in appropriate server-side logs.

---

# 22. Logging

Logs must not contain sensitive information unnecessarily.

Do NOT log:

* full RFP contents
* full AI prompts containing confidential documents
* full AI responses containing confidential documents
* API keys
* passwords
* payment secrets
* authentication tokens

Prefer structured diagnostic information such as:

```text
analysis_id
operation
status
failure_category
duration
```

when those identifiers are safe to use.

---

# 23. Payment Security

Payments are not implemented in Phase 1.

When payments are introduced:

* payment credentials must remain server-side
* payment status must not be determined solely by frontend state
* webhook signatures must be verified
* entitlements must be granted based on trusted server-side events

Never store payment-card information unless there is an explicit and justified architecture requiring it.

---

# 24. Webhook Security

Future payment/webhook integrations must:

1. Verify the provider signature.
2. Reject invalid signatures.
3. Validate the payload.
4. Handle duplicate events safely.
5. Avoid granting access solely from a client request.

Webhook processing should be designed to be idempotent.

---

# 25. Dependency Security

Dependencies introduce supply-chain risk.

Before adding a dependency:

1. Confirm it is necessary.
2. Check whether the functionality can be implemented with existing dependencies.
3. Check maintenance status.
4. Review known vulnerabilities where practical.
5. Understand what the dependency does.
6. Record significant dependency decisions.

Do not install packages merely because an AI coding tool recommends them.

---

# 26. Dependency Updates

Do not automatically update every dependency during unrelated feature work.

Dependency upgrades should be treated as their own changes when they can materially affect:

* application behavior
* security
* build process
* API compatibility

---

# 27. Browser Security

The browser must never receive:

* server-only secrets
* service-role keys
* AI provider secrets
* payment secrets
* database passwords

Client-side code should receive only information required for the user interface.

---

# 28. CORS

Do not introduce broad CORS permissions without a requirement.

If APIs require cross-origin access in the future:

* define allowed origins explicitly
* restrict methods
* restrict headers
* document the decision

---

# 29. Rate Limiting

Rate limiting is not required for the basic Phase 1 shell.

When anonymous RFP analysis is implemented, rate limiting becomes important because document processing and AI calls may create:

* cost abuse
* automated abuse
* denial-of-service risk

Before public AI processing is launched, evaluate:

* per-IP limits
* per-session limits
* file upload limits
* analysis limits
* provider spending limits

---

# 30. Abuse Prevention

The system should assume that public endpoints may be abused.

Potential future controls:

* upload limits
* request limits
* file size limits
* processing timeouts
* abuse detection
* usage quotas
* CAPTCHA only if necessary

Do not add CAPTCHA or other friction unless abuse evidence justifies it.

---

# 31. Data Retention

Data retention is not yet finalized.

Before storing production RFPs, define:

* document retention period
* analysis retention period
* deletion process
* account deletion behavior
* failed-upload cleanup
* storage limits

The default design principle is:

> Do not retain sensitive data longer than the product needs.

---

# 32. Data Deletion

Future users should have a clear path to delete their own data where applicable.

Deletion must consider:

```text
RFP
 ↓
Document
 ↓
Analysis
 ↓
Findings
 ↓
Reports
```

Associated objects must not remain unintentionally accessible after deletion.

---

# 33. Third-Party Services

Each external service creates:

* security dependency
* availability dependency
* data-processing dependency
* cost dependency

Current external services:

* GitHub
* Vercel
* Supabase
* Google Analytics

Future services may include:

* AI provider
* payment provider
* email provider
* storage provider

Each significant new service requires a documented decision.

---

# 34. Security Review Before Public AI Launch

Before enabling anonymous public RFP analysis, verify:

```text
[ ] File validation
[ ] File size limits
[ ] Processing timeout
[ ] Abuse/rate limiting
[ ] AI prompt-injection boundary
[ ] AI output validation
[ ] Source-reference validation
[ ] Secret protection
[ ] Private document handling
[ ] Analytics privacy
[ ] Error handling
[ ] Data retention policy
[ ] Storage access controls
```

This is a mandatory gate before opening unrestricted public document processing.

---

# 35. Security Incident Principle

If a security issue is discovered:

1. Stop affected functionality if necessary.
2. Determine what is exposed.
3. Contain the issue.
4. Rotate compromised credentials where necessary.
5. Fix the root cause.
6. Verify the fix.
7. Document the incident.
8. Update the relevant security decision/document.

Do not hide a security issue merely because the MVP is small.

---

# 36. Security vs MVP Scope

Security must not become an excuse for unnecessary infrastructure.

The objective is:

> **Appropriate security for actual risk.**

Do not introduce:

* complex security platforms
* enterprise IAM
* unnecessary WAF infrastructure
* custom encryption systems
* elaborate SIEM infrastructure

unless actual requirements justify them.

---

# 37. Phase 1 Security Definition of Done

```text
[ ] Secrets are excluded from Git
[ ] .env.local is ignored
[ ] Public/private environment boundaries are documented
[ ] Supabase client/server boundaries are understood
[ ] Production errors do not expose secrets
[ ] Analytics does not receive confidential document content
[ ] Dependencies are reviewed
[ ] Repository contains no known intentionally committed credentials
[ ] Security documentation exists
[ ] Future document-upload security requirements are documented
```

---

# 38. Current Status

**PHASE 1 — SECURITY FOUNDATION**

Status:

**IN PROGRESS**

The highest-risk security work will occur before public RFP processing is enabled.

---

# 39. Core Security Principle

> **Treat every external input as untrusted and every confidential document as private by default.**

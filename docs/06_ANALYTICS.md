# Pre-Bid Intelligence MVP — Analytics

**Document:** 06_ANALYTICS.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Product / Engineering  
**Repository:** bid-intel

---

# 1. Purpose

This document defines the measurement strategy for the Pre-Bid Intelligence MVP.

Analytics exists to answer:

> What are users actually doing?

It does NOT exist to create vanity dashboards.

The analytics system must help us understand:

- whether users reach the product
- whether they attempt the core workflow
- whether the workflow completes
- which product capabilities create engagement
- where users abandon the workflow
- whether users return
- whether users show purchasing intent

---

# 2. Analytics Principle

The product is being validated through behavior.

Therefore:

> **Observed user behavior is more valuable than opinions, impressions, or traffic volume alone.**

A large number of visitors without meaningful product usage does not constitute product validation.

---

# 3. Analytics Technology

## Primary platform

**Google Analytics 4**

## Environment variable

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

If the measurement ID is absent:

> The application must continue functioning normally.

Analytics must never become a hard dependency.

---

# 4. Analytics Architecture

Initial architecture:

```text
User
  ↓
Next.js Application
  ↓
Analytics Utility
  ↓
Google Analytics 4
```

The application should use a centralized analytics utility rather than scattering raw analytics calls throughout components.

Conceptually:

```text
lib/
└── analytics.ts
```

---

# 5. Phase 1 Measurement Scope

Phase 1 measures only basic application activity.

### Required events

```text
page_view
application_loaded
```

No product-specific analytics events should be implemented before the corresponding product workflow exists.

---

# 6. Future Product Funnel

The eventual core product funnel is:

```text
Landing Page
      ↓
Upload Started
      ↓
Upload Completed
      ↓
Analysis Started
      ↓
Analysis Completed
      ↓
Finding Viewed
      ↓
Clarification Question Used
      ↓
Report Exported
      ↓
Return Usage
      ↓
Paid Intent
      ↓
Payment
```

This funnel is a measurement model, not a Phase 1 implementation requirement.

---

# 7. Event Naming Convention

Future events should use:

```text
snake_case
```

Examples:

```text
rfp_upload_started
rfp_upload_completed
analysis_started
analysis_completed
finding_viewed
clarification_copied
report_exported
checkout_started
payment_completed
```

Do not create inconsistent variants such as:

```text
uploadRfp
rfpUpload
RFP_Upload
```

---

# 8. Event Design Principle

An event should answer a meaningful question.

Before adding an event, ask:

> What decision will this data help us make?

If the answer is unclear:

> Do not create the event.

---

# 9. Core Product Events — Future

## 9.1 `rfp_upload_started`

### Meaning

The user intentionally begins uploading an RFP.

### Question answered

Are visitors attempting the core product action?

---

## 9.2 `rfp_upload_completed`

### Meaning

The application successfully receives the RFP.

### Question answered

Are users successfully moving past the upload interface?

---

## 9.3 `analysis_started`

### Meaning

The system begins document analysis.

### Question answered

Are successful uploads reaching the intelligence pipeline?

---

## 9.4 `analysis_completed`

### Meaning

The analysis successfully produces a result.

### Question answered

Can the system complete the core workflow?

This will become one of the most important technical/product events.

---

## 9.5 `finding_viewed`

### Meaning

The user opens or meaningfully interacts with an analytical finding.

### Question answered

Are users actually consuming the intelligence?

---

## 9.6 `clarification_copied`

### Meaning

The user copies a generated clarification question.

### Question answered

Is the output useful enough to take into another workflow?

This may be a stronger signal than simply viewing a result.

---

## 9.7 `report_exported`

### Meaning

The user exports or downloads the analysis.

### Question answered

Does the user consider the output valuable enough to keep or share?

---

## 9.8 `checkout_started`

### Meaning

The user begins a paid transaction.

### Question answered

Is there measurable willingness to pay?

---

## 9.9 `payment_completed`

### Meaning

A confirmed payment occurs.

### Question answered

Did willingness to pay convert into revenue?

Payment confirmation must eventually come from the payment provider/server-side system, not from a frontend button click.

---

# 10. Event Parameters

Only useful parameters should be collected.

Potential future parameters:

```text
document_type
document_size_bucket
analysis_status
finding_type
finding_severity
report_type
plan
```

Do NOT send:

* complete RFP text
* document contents
* private business information
* API keys
* payment secrets
* unnecessary personal information

---

# 11. Privacy Principle

RFP documents may contain commercially sensitive information.

Analytics must NOT transmit document contents to Google Analytics.

Never send:

```text
RFP text
requirements
contract terms
client names
confidential pricing
uploaded filenames
AI raw responses
```

unless explicitly reviewed and justified.

The default assumption is:

> **Document content is private.**

---

# 12. Personally Identifiable Information

Do not intentionally send personal information to GA4 as event parameters.

Examples:

* email address
* phone number
* full name
* physical address
* uploaded document contents

Analytics should focus on product behavior rather than personal identity.

---

# 13. Conversion Definition

Traffic is not the primary conversion.

For the MVP, the most important behavioral conversion is:

> **Completed analysis of a real RFP.**

Secondary signals:

* finding interaction
* clarification copying
* report export
* repeat analysis
* payment intent
* payment

---

# 14. MVP Metrics

## Acquisition

* users
* sessions
* landing-page visits
* acquisition source

## Activation

* upload started
* upload completed
* analysis completed

## Engagement

* findings viewed
* clarification questions copied
* report exported

## Retention

* repeat analysis
* returning users

## Monetization

* checkout started
* payment completed
* revenue

---

# 15. Funnel Ratios

Once sufficient data exists, calculate:

### Upload conversion

```text
Upload Started / Landing Visitors
```

### Upload completion

```text
Upload Completed / Upload Started
```

### Analysis completion

```text
Analysis Completed / Upload Completed
```

### Output engagement

```text
Users engaging with findings / Analysis Completed
```

### Repeat usage

```text
Returning analysis users / Initial analysis users
```

### Payment conversion

```text
Paying users / Eligible users
```

These ratios should only be interpreted after sufficient sample size exists.

Do not draw strong conclusions from a handful of users.

---

# 16. Analytics vs Product Database

Analytics and application data have different purposes.

### GA4

Used for:

* behavioral measurement
* acquisition
* funnel analysis
* aggregate usage

### Supabase

Used for:

* application state
* product records
* analyses
* findings
* entitlements
* other operational data

Do not use GA4 as the application's source of truth.

Do not use the application database as a replacement for acquisition analytics.

---

# 17. Failure Analytics

Future analysis failures should be measurable.

Potential event:

```text
analysis_failed
```

Potential parameters:

```text
failure_category
```

Example categories:

```text
invalid_file
text_extraction_failed
processing_timeout
provider_error
internal_error
```

Do not send sensitive error details to analytics.

---

# 18. Analytics Reliability

Analytics failure must not break the product.

If GA4 is unavailable:

```text
Application
    ↓
continues functioning
```

Do not block:

* page rendering
* RFP upload
* analysis
* report generation

because analytics failed.

---

# 19. Development and Production

Analytics should distinguish environments where practical.

Development events should not contaminate production metrics.

The implementation should provide an appropriate mechanism for development/testing environments.

---

# 20. Analytics Verification

When analytics is implemented, verify:

1. Measurement ID is configured.
2. GA4 script loads correctly.
3. `page_view` is generated.
4. `application_loaded` is generated.
5. No sensitive document content is sent.
6. Removing the measurement ID does not break the application.
7. Production analytics receives events correctly.

---

# 21. Analytics Anti-Patterns

Do NOT:

* track every button
* track meaningless UI interactions
* send document contents
* send private RFP information
* create events without a decision purpose
* treat page views as product validation
* manipulate events to make conversion look better
* rely solely on analytics for financial truth

---

# 22. Product Learning Loop

Analytics should support:

```text
Behavior
   ↓
Observation
   ↓
Hypothesis
   ↓
Product change
   ↓
Measurement
   ↓
Decision
```

Example:

```text
Many uploads
     ↓
Few completed analyses
     ↓
Investigate processing failure
     ↓
Improve document handling
     ↓
Measure again
```

---

# 23. Phase 1 Definition of Done

```text
[ ] GA4 measurement ID is configurable
[ ] Analytics utility exists
[ ] page_view is supported
[ ] application_loaded is supported
[ ] Analytics does not block rendering
[ ] Missing GA4 configuration does not break the app
[ ] No RFP content is sent to analytics
[ ] Analytics setup is documented
```

---

# 24. Current Status

**PHASE 1 — ANALYTICS FOUNDATION**

Status:

**IN PROGRESS**

Product-specific events are intentionally deferred until the relevant workflows exist.

---

# 25. Core Principle

> **Measure behavior that changes decisions. Do not collect data merely because it is possible.**

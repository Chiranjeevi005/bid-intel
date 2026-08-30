# RFPground — BUILD-010 Category → Attention-Lane Semantic Mapping
## Product Semantics & Real-Data Validation Gate

**Status**: Pre-coding validation artifact for BUILD-010.  
**Purpose**: Rigorously map existing database categories and real analysis findings into decision-relevant attention lanes (`MUST_MEET`, `COULD_HURT`, `STILL_UNCLEAR`, `UNMAPPED`) based on verified contractual semantics rather than superficial category names.

---

## 1. Core Semantic Definitions

| Attention Lane | Decision Job for Bid Team | Semantic Criteria |
| :--- | :--- | :--- |
| **`MUST_MEET`** | *"Can we participate, and what are the hard gate requirements?"* | Mandatory eligibility criteria, submission deadlines, earnest money/bid security, mandatory document formats, and non-negotiable qualifying thresholds where non-compliance results in disqualification or rejection. |
| **`COULD_HURT`** | *"What commercial, legal, or financial exposures could damage us if we win?"* | Uncapped liabilities, broad indemnities, unilateral termination for convenience, severe liquidated damages/penalties, onerous sponsorship/financing obligations, and uncompensated scope traps. |
| **`STILL_UNCLEAR`** | *"Where does the tender have missing data, contradictions, or unverified coverage requiring human review?"* | Explicit missing information findings, conflicting clauses, and categories evaluated by BUILD-008P coverage audit as `REVIEW_REQUIRED` or `EXTRACTION_UNCERTAIN`. |
| **`UNMAPPED`** | *"Informational context or mixed semantics not fitting a critical attention lane."* | General scope overviews, background context, evaluation formulas (e.g. 80:20 QCBS weightage) that are informational rather than acute risks, or ambiguous categories that lack deterministic classification. |

---

## 2. Category & Finding Semantic Mapping Table

This mapping was derived by inspecting all **81 real analysis findings** across active documents in the production PostgreSQL database.

| Existing Category | Existing Finding Meaning & Real Data Patterns | Proposed Lane | Real Data Evidence (Doc `5c404caa...` / MoFPI RFP) | Confidence | Exceptions & Boundary Conditions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `MANDATORY_ELIGIBILITY` / `ELIGIBILITY` | Minimum turnover, staff strength, prior project experience, and geographic presence. | **`MUST_MEET`** | • Finding #5: *"Average annual turnover of INR 50 Cr"* (p.13)<br>• Finding #6: *"Minimum manpower strength of 150 persons"* (p.13)<br>• Finding #7: *"Organized at least 2 international trade events"* (p.13) | **HIGH** | If an eligibility item is framed as desirable/optional rather than mandatory, it must be filtered out. In real data, all items state *"failure to meet will render the bidder ineligible"*. |
| `KEY_DATES` / `DATES_SUBMISSION` | Hard deadlines for bid submission, pre-bid queries, and tender opening. | **`MUST_MEET`** | • Finding #64: *"Last date for bid submission is 07-01-2019 at 5:00 PM"* (p.3) | **HIGH** | Pure milestone schedules during execution belong to project planning, but submission deadlines are strict `MUST_MEET` gates. |
| `SUBMISSION_REQUIREMENTS` / `MANDATORY_DOCUMENTS` | Mandatory procedural formats, EMD fees, and dual-cover upload requirements. | **`MUST_MEET`** | • Finding #59: *"Bid Processing Fee Rs. 10k and EMD Rs. 10 Lakh"* (p.6)<br>• Finding #62: *"Online Bid Submission in Two Covers (Technical & Financial)"* (p.19)<br>• Finding #63: *"Prescribed BoQ format without alteration"* (p.20) | **HIGH** | Minor formatting suggestions (e.g. font size) are non-critical, but in government RFPs, non-submission of EMD/BoQ results in immediate rejection. |
| `LIABILITY_INDEMNITY` / `LIABILITY_RISK` | Vicarious employee liability, third-party indemnification, and unilateral damage determination. | **`COULD_HURT`** | • Finding #68: *"Vicarious liability for employee acts outside scope of work"* (p.23)<br>• Finding #69: *"Hold MoFPI fully indemnified and harmless against loss/liability"* (p.23)<br>• Finding #70: *"Written demand by MoFPI as to loss/damages shall be final and binding"* (p.24) | **HIGH** | Standard liability caps are normal; uncapped liability, unilateral damage determination, or indemnity for client's own negligence represent acute `COULD_HURT` exposures. |
| `TERMINATION_RIGHTS` / `TERMINATION` | Unilateral termination for convenience without cause on short notice. | **`COULD_HURT`** | • Finding #71: *"MoFPI shall be at liberty to terminate without assigning reason on 30 days notice"* (p.27) | **HIGH** | Termination for material default is standard. Termination without default/cause is a severe commercial risk (`COULD_HURT`). |
| `UNUSUAL_OBLIGATIONS` (Penalties & Scope Traps) | High financial penalties, mandatory revenue mobilization, and uncompensated scope clauses. | **`COULD_HURT`** *(finding-specific)* | • Finding #72: *"Required to mobilize sponsorships of at least 25% of total event expenditure"* (p.11)<br>• Finding #74: *"Penalty up to 15% of payment deducted for delivery delays"* (p.27)<br>• Finding #4: *"No additional cost for inherent/necessary services"* (p.23) | **HIGH** | **Exception**: Finding #73 (*"Mandatory PFMS Registration"*, p.25) is an administrative onboarding requirement (`MUST_MEET`), not a commercial penalty. Mapped at finding level. |
| `AMBIGUITIES_CONTRADICTIONS` | Conflicting instructions across RFP chapters (e.g. sealed envelope vs online BoQ). | **`STILL_UNCLEAR`** | • Finding #75: *"Chapter 8 states quotes in sealed envelope PDF, while Ch 9 & 10 state prescribed BoQ/XLS"* (p.17, p.20) | **HIGH** | Contradictions directly create procedural submission risk and demand pre-bid clarification. |
| `MISSING_INFORMATION` | Unspecified financial security values or vague contractual requirements. | **`STILL_UNCLEAR`** | • Finding #76: *"RFP mentions forfeiture of Performance Security on default, but omits amount/format"* (p.27)<br>• Finding #77: *"Mentions risk mitigation/insurance but omits policy types and cover values"* (p.27) | **HIGH** | When a required term is missing, the team cannot price the bid or ensure compliance until clarified. |
| `COMMERCIAL_TERMS` / `COMMERCIAL` | Payment milestones, cost reimbursement mechanisms, and cashflow conditions. | **`COULD_HURT`** *(or `UNMAPPED`)* | • Finding #67: *"Ministry shall reimburse actual costs incurred for promoting/executing event"* (p.16) | **MEDIUM** | Standard milestone payments are informational (`UNMAPPED`). Delayed reimbursement or back-to-back payment terms create cashflow exposure (`COULD_HURT`). |
| `EVALUATION_CRITERIA` / `EVALUATION_THRESHOLDS` | Minimum technical qualifying cutoff scores vs general scoring formulas. | **`MUST_MEET`** *(for cutoffs)* / **`UNMAPPED`** *(for general formulas)* | • Finding #66: *"Technical qualifying score is 70 marks out of 100"* (p.15) → **`MUST_MEET`**<br>• Finding #65: *"QCBS weightage 80:20 technical/financial"* (p.16) → **`UNMAPPED`** | **HIGH** | Minimum qualifying marks are a hard gate (`MUST_MEET`). Scoring weight ratios are strategic context (`UNMAPPED`). |
| `OPPORTUNITY_OVERVIEW` / `OPPORTUNITY_FIT` | Background context, general project descriptions, and high-level role overviews. | **`UNMAPPED`** | • Finding #1: *"Role includes development activities"* (Doc `d96d6b92...`, p.1)<br>• General scope paragraphs | **HIGH** | Does not represent a binding risk, gate, or uncertainty. Retained in full ledger, omitted from attention brief. |

---

## 3. BUILD-008P Coverage States Mapping

The `STILL_UNCLEAR` lane integrates both explicit findings (contradictions/missing data) and the deterministic 12-category coverage audit states from `lib/ai/coverage.ts`.

| Coverage State | Deterministic Engine Meaning (`lib/ai/coverage.ts`) | UI Decision Meaning | Required Analyst Action |
| :--- | :--- | :--- | :--- |
| **`COVERED`** | Verified finding(s) exist AND relevant evidence units were retrieved and examined. | Requirements in this critical domain were extracted, verified, and mapped to evidence. | Review specific findings in `MUST_MEET` or `COULD_HURT`. |
| **`REVIEW_REQUIRED`** | Relevant evidence units exist in document text, but no verified finding survived verification/recovery. | Potential requirements or clauses exist in the text, but could not be extracted with 100% verification. | **Human review mandatory.** Click candidate page triggers to inspect raw context. |
| **`EXTRACTION_UNCERTAIN`** | Insufficient candidate/evidence coverage found in the document to make a meaningful conclusion. | The document may omit this section entirely, or text density was too sparse. | Inspect document pages manually. **Do not assume absence of requirement.** |

### Core Operational Truth Rule
> **`NO VERIFIED FINDING ≠ NO REQUIREMENT`**  
> A category marked `REVIEW_REQUIRED` or `EXTRACTION_UNCERTAIN` must never be displayed as "Clear", "Safe", or "0 Risks". It represents an active uncertainty requiring human verification.

---

## 4. Real-Data Traceability Validation (10 Concrete Database Records)

Every item presented in the BUILD-010 attention lanes has been traced from raw PostgreSQL records to UI representation:

```
DATABASE RECORD (ID & Doc) 
       ↓
CATEGORY & SEVERITY 
       ↓
FINDING SEMANTICS & VERBATIM QUOTE 
       ↓
ATTENTION LANE 
       ↓
VISIBLE UI LABEL & IMPLICATION
```

### Trace 1: Strict Financial Eligibility (`MUST_MEET`)
- **Database Record**: ID `e78b17b6-c956-42bb-a320-da3e301264c7`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `MANDATORY_ELIGIBILITY` | `CRITICAL`
- **Finding Semantics**: Turnover threshold: Average annual turnover of INR 50 Cr in last 3 years with audited balance sheets.
- **Verbatim Quote (p.13)**: *"The applicant should have an average annual turnover of Rs. 50 crore in the last 3 financial years (2017-18, 2016-17, 2015-16)..."*
- **Assigned Lane**: **`01 / MUST MEET`**
- **Visible UI Label**: `High Financial Turnover Requirement (INR 50 Cr) · Page 13`
- **Why It Matters**: *"Strict eligibility criterion; failure to meet it will render the bidder ineligible and reject the financial proposal."*

### Trace 2: Staffing Capacity Eligibility (`MUST_MEET`)
- **Database Record**: ID `20a9a4b3-d6c5-4d76-8003-eb1c0c660423`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `MANDATORY_ELIGIBILITY` | `CRITICAL`
- **Finding Semantics**: Minimum internal manpower strength of 150 persons.
- **Verbatim Quote (p.13)**: *"The applicant should have its own manpower strength of at least 150 persons..."*
- **Assigned Lane**: **`01 / MUST MEET`**
- **Visible UI Label**: `Minimum Manpower Strength of 150 · Page 13`
- **Why It Matters**: *"Strict eligibility criterion; failure to satisfy manpower threshold leads to immediate disqualification."*

### Trace 3: Submission Deadline (`MUST_MEET`)
- **Database Record**: ID `e20c3dfc-0cfc-43f6-953e-f63b2f567bfb`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `KEY_DATES` | `CRITICAL`
- **Finding Semantics**: Hard online submission cutoff date and time.
- **Verbatim Quote (p.3)**: *"Last date of bid Submission 07-01-2019 5.00PM"*
- **Assigned Lane**: **`01 / MUST MEET`**
- **Visible UI Label**: `Bid Submission Deadline (07-01-2019 5:00 PM) · Page 3`
- **Why It Matters**: *"Late bids cannot be uploaded to the portal and will be rejected automatically."*

### Trace 4: Bid Security & Fees (`MUST_MEET`)
- **Database Record**: ID `b7cf851c-a115-4674-8d48-8df050fba0d1`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `SUBMISSION_REQUIREMENTS` | `CRITICAL`
- **Finding Semantics**: EMD of Rs. 10 Lakh and non-refundable processing fee of Rs. 10,000.
- **Verbatim Quote (p.6)**: *"An amount of Rs. 10,000/- as a non-refundable bid processing fee and Rs. 10,00,000/- as Earnest Money Deposit (EMD)..."*
- **Assigned Lane**: **`01 / MUST MEET`**
- **Visible UI Label**: `Earnest Money Deposit (Rs. 10 Lakh) & Fee · Page 6`
- **Why It Matters**: *"Proposals submitted without physical or verified EMD instrument are summarily rejected."*

### Trace 5: Minimum Technical Evaluation Cutoff (`MUST_MEET`)
- **Database Record**: ID `1867c295-8e10-4bc2-8815-b505501ae13a`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `EVALUATION_CRITERIA` | `HIGH`
- **Finding Semantics**: Minimum qualifying technical threshold of 70/100 to open price proposal.
- **Verbatim Quote (p.15)**: *"The qualifying score will be 70 marks out of 100."*
- **Assigned Lane**: **`01 / MUST MEET`**
- **Visible UI Label**: `Minimum Technical Qualifying Score (70/100) · Page 15`
- **Why It Matters**: *"Bidders scoring below 70 marks will not qualify for financial bid opening regardless of pricing."*

### Trace 6: Unilateral / Uncapped Indemnity (`COULD_HURT`)
- **Database Record**: ID `9117d505-f098-4d66-8635-8a22cdf1fa6c`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `LIABILITY_INDEMNITY` | `HIGH`
- **Finding Semantics**: Full indemnification of client for all losses or liabilities from personnel/subcontractors.
- **Verbatim Quote (p.23)**: *"The Applicant shall hold MoFPI, its successors, Assignees and Administrators fully indemnified and harmless against loss or liability..."*
- **Assigned Lane**: **`02 / COULD HURT`**
- **Visible UI Label**: `Broad Indemnification Obligation · Page 23`
- **Why It Matters**: *"Bidder assumes uncapped indemnification for all third-party and personnel claims arising from event operations."*

### Trace 7: Finality of Client Damage Assessment (`COULD_HURT`)
- **Database Record**: ID `8f5f111d-79ad-4737-a023-64c92b298db9`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `LIABILITY_INDEMNITY` | `HIGH`
- **Finding Semantics**: Client has unilateral binding authority to assess and demand damages without dispute arbitration.
- **Verbatim Quote (p.24)**: *"The written demand by MoFPI as to the loss/ damages mentioned above shall be final, conclusive and binding on the Applicant..."*
- **Assigned Lane**: **`02 / COULD HURT`**
- **Visible UI Label**: `Unilateral Binding Damage Determination · Page 24`
- **Why It Matters**: *"Client's damage demand is final and non-appealable under the contract terms."*

### Trace 8: Termination for Convenience (`COULD_HURT`)
- **Database Record**: ID `2fd626c6-0b7e-4434-8d68-5adb5f07bfa1`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `TERMINATION_RIGHTS` | `HIGH`
- **Finding Semantics**: Client can terminate contract without cause on 30 days notice.
- **Verbatim Quote (p.27)**: *"MoFPI shall be at liberty to terminate the Agreement without assigning any reason by giving 30 days written notice to the other party."*
- **Assigned Lane**: **`02 / COULD HURT`**
- **Visible UI Label**: `Termination Without Cause (30 Days Notice) · Page 27`
- **Why It Matters**: *"Client can terminate at will with short notice, risking unrecoverable mobilized expenditures."*

### Trace 9: Mandatory Sponsorship Mobilization (`COULD_HURT`)
- **Database Record**: ID `3f84d0f0-b483-405d-80b7-8daf3f2fe730`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `UNUSUAL_OBLIGATIONS` | `HIGH`
- **Finding Semantics**: Selected bidder is contractually mandated to secure sponsorships covering 25% of event cost.
- **Verbatim Quote (p.11)**: *"Mobilising sponsorships of at least 25% of the total expenditure of the event."*
- **Assigned Lane**: **`02 / COULD HURT`**
- **Visible UI Label**: `Sponsorship Revenue Obligation (25% Total Budget) · Page 11`
- **Why It Matters**: *"Bidder assumes commercial underwriting risk if commercial sponsorships fail to materialize."*

### Trace 10: Submission Format Contradiction (`STILL_UNCLEAR`)
- **Database Record**: ID `42fe0644-72d4-419c-98dc-9158f5d481d9`, Doc `5c404caa-0ee3-483a-9cc1-692eedd05833`
- **Category & Severity**: `AMBIGUITIES_CONTRADICTIONS` | `HIGH`
- **Finding Semantics**: Chapter 8 requires PDF upload in sealed envelope; Chapter 9 & 10 require standard Excel BoQ.
- **Verbatim Quote (p.17, p.20)**: *"quotes must be submitted in the attached format given in FORM H and uploaded as pdf document..."* vs *"necessarily submit their financial bids in the format provided (standard BoQ/PDF)..."*
- **Assigned Lane**: **`03 / STILL UNCLEAR`**
- **Visible UI Label**: `Financial Bid Submission Format Conflict · Pages 17, 20`
- **Why It Matters**: *"Procedural ambiguity in price bid submission could cause technical disqualification if wrong format is uploaded."*

---

## 5. Summary of Lane Rules for Frontend Implementation

1. **No category is mapped by name alone**:
   - `UNUSUAL_OBLIGATIONS` is partitioned: commercial revenue/penalties → `COULD_HURT`; portal registration → `MUST_MEET`.
   - `EVALUATION_CRITERIA` is partitioned: minimum cutoff thresholds → `MUST_MEET`; scoring formula/weightage → `UNMAPPED`.
2. **`STILL_UNCLEAR` combines findings and coverage gaps**:
   - Displays actual `AMBIGUITIES_CONTRADICTIONS` and `MISSING_INFORMATION` findings.
   - Displays categories evaluated as `REVIEW_REQUIRED` or `EXTRACTION_UNCERTAIN` by `lib/ai/coverage.ts`.
3. **Empty state integrity**:
   - If a document has 0 findings in `MUST_MEET`, the UI explicitly displays: *"No verified mandatory eligibility or submission constraints extracted."*
   - If `COULD_HURT` has 0 findings: *"No high-severity liability or commercial penalties extracted."*
   - Directs the analyst to the Coverage Audit to inspect unverified domains.

# RFPground Analysis Workspace — UI Direction & Surface Specification

> **Document:** `RFPGROUND_ANALYSIS_WORKSPACE_UI_DIRECTION.md`  
> **Status:** PROPOSED & READY FOR DESIGN REVIEW  
> **Source of Truth:** Repository Audit, Data Contract, and BUILD-008P Logic  
> **Date:** 2026-08-29  

---

## 1. Primary User Task

When a procurement analyst logs into RFPground and opens an analyzed tender, their primary task is:

> **"Understand what RFPground identified in the tender, verify the exact source evidence supporting each finding, understand why it matters commercially, and identify which areas remain uncertain and require manual human investigation before the bid proceeds."**

The software **does not** make the final Go/No-Go decision. It serves as an investigative instrument that arms the commercial team with verified facts, contractual risk highlights, and targeted clarification questions for the tender Q&A period.

---

## 2. Screen Hierarchy (Completed Analysis State)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: WORKSPACE HEADER                                                                        │
│ Document Switcher · Filename · Page Count · Document Type · Extraction Status · User / Logout   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 2: ORIENTATION & COVERAGE AUDIT STRIP                                                      │
│ Verified Findings Count · Severe Risk Tally · 12-Category Coverage Status (Covered/Review/Uncertain)│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 3: PRIMARY WORK SURFACE                                                                    │
│ Filter Controls (Category · Severity) │ Line-Item Evidence Ledger │ Persistent Evidence Inspector│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LEVEL 4: ACTION & Q&A DRAWER                                                                     │
│ Pre-Drafted Clarification Register ready for Tender Q&A Submission                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation Model

The workspace operates as a **focused, document-centric investigation workbench**:

1. **Document Scope (Header):** Allows switching between uploaded tenders without leaving the analysis environment.
2. **View Toggles (Sub-Header):**
   - **`Findings & Risk`** (*Default & Primary Surface*): Evidence-first ledger of verified facts, implications, and quotes.
   - **`Coverage Audit`** (*Full 12-Category Matrix*): Deep-dive into category-level coverage, examined evidence units, and manual review requirements.
   - **`Source Inspector`** (*Full Document Browser*): Page-by-page reader showing extracted text with verbatim quote anchors.
   - **`Intelligence Report`** (*Executive Dossier*): Clean synthesis with pre-drafted Q&A clarification questions.
3. **In-Context Cross-Linking:** Clicking a page tag (`Page 14`) inside any finding instantly opens that exact page in the Evidence Inspector without losing the analyst's place in the ledger.

---

## 4. Primary Findings Composition (Evidence-First Architecture)

Findings are structured as **structured operational records**, not generic cards. Every item follows this non-negotiable mental sequence:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ CATEGORY BADGE ]  [ SEVERITY BADGE ]                                    PAGE 14 · SECTION 6.2  │
│                                                                                                  │
│ 1. WHAT WAS FOUND (Objective Verified Fact)                                                      │
│    Uncapped Indemnification Obligation without Consequential Loss Exclusion                      │
│                                                                                                  │
│ 2. WHY IT MATTERS (Commercial & Operational Implication)                                         │
│    Contractor assumes unlimited third-party liability without an aggregate stop-loss ceiling.    │
│    Unforeseen disputes could create catastrophic balance sheet exposure.                         │
│                                                                                                  │
│ 3. VERBATIM SOURCE EVIDENCE (Rendered in Source Serif 4)                                         │
│    ┌────────────────────────────────────────────────────────────────────────────────────────┐    │
│    │ "The Supplier shall indemnify, defend and hold harmless the Authority from and against  │    │
│    │ any and all claims, losses, damages, liabilities, costs and expenses arising out of   │    │
│    │ or related to this Agreement without limitation."                                      │    │
│    └────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                                  │
│ 4. RECOMMENDED ANALYST ACTION / Q&A INQUIRY                                                      │
│    Submit formal Q&A request to insert a 100% contract value liability cap and standard         │
│    consequential loss exclusion into General Conditions Section 6.2.                             │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Evidence Interaction Model

1. **Citation Authenticity:** Every quote in the ledger was validated 100% verbatim against `document_pages.content` by `verifyQuote()`. If text was not found verbatim in the PDF, it was discarded during extraction.
2. **Click-to-Inspect:** Clicking on any page reference badge (`Page 14`) triggers:
   - Focus transition to the persistent Evidence Inspector.
   - Loading of the raw extracted text for Page 14.
   - Highlighting of the exact quote string within the surrounding page text.
3. **Surrounding Context Verification:** Allows the analyst to read 20 lines before and after the clause to verify whether a mitigating schedule or definition was missed.

---

## 6. Coverage Interaction Model (BUILD-008P Truth)

Coverage is an **audit and control mechanism**, not an aggregate percentage. It evaluates the **12 Critical Procurement Categories**:

| Category | Operational Status | Deterministic Meaning | Required Analyst Action |
|---|---|---|---|
| `ELIGIBILITY` | `COVERED` | Verified finding exists + relevant evidence examined. | Review extracted eligibility items. |
| `DATES_SUBMISSION` | `COVERED` | Verified finding exists + relevant evidence examined. | Verify key dates against team calendar. |
| `TERMINATION` | `COVERED` | Verified finding exists + relevant evidence examined. | Review convenience & default terms. |
| `LIABILITY_RISK` | `COVERED` | Verified finding exists + relevant evidence examined. | Check liability caps and indemnity. |
| `INDEMNITY` | `REVIEW_REQUIRED` | Evidence units exist, but no verified finding survived. | **Manual review of indemnity clauses required.** |
| `FINANCIAL_REQUIREMENTS` | `EXTRACTION_UNCERTAIN` | Insufficient evidence coverage identified in document. | **Verify whether RFP omits financial criteria.** |
| `PENALTIES_LIQUIDATED_DAMAGES` | `REVIEW_REQUIRED` | Evidence units exist, but no verified finding survived. | **Check penalty schedules manually.** |
| `EMD_BID_SECURITY` | `EXTRACTION_UNCERTAIN` | Insufficient candidate coverage identified. | **Confirm if earnest money is required.** |
| `PERFORMANCE_SECURITY` | `EXTRACTION_UNCERTAIN` | Insufficient candidate coverage identified. | **Confirm if bank guarantee is required.** |
| `EVALUATION_THRESHOLDS` | `REVIEW_REQUIRED` | Evidence units exist, but no verified finding survived. | **Review scoring/weightage section.** |
| `INSURANCE` | `REVIEW_REQUIRED` | Evidence units exist, but no verified finding survived. | **Review mandatory policy limits.** |
| `MANDATORY_DOCUMENTS` | `REVIEW_REQUIRED` | Evidence units exist, but no verified finding survived. | **Compile required annexures list.** |

> [!IMPORTANT]
> **Core Operational Rule:**  
> `NO VERIFIED FINDING ≠ NO REQUIREMENT`  
> An empty extraction must **never** be presented as a clean bill of health. It is explicitly labeled `REVIEW_REQUIRED` or `EXTRACTION_UNCERTAIN`.

---

## 7. Human-Review & Uncertainty Model

The workspace treats uncertainty as an **essential operational signal**:

1. **`REVIEW REQUIRED` Signal:**
   - **Visual Treatment:** Amber status badge (`#B54708` on `#FFFAEB`) with an alert icon (`!`).
   - **Analyst Message:** *"Relevant candidate text was detected in the document, but no finding met strict verification criteria. Manual analyst review of relevant sections is required."*
2. **`EXTRACTION UNCERTAIN` Signal:**
   - **Visual Treatment:** Slate/Neutral badge (`#475467` on `#F2F4F7`) with inquiry icon (`?`).
   - **Analyst Message:** *"No matching candidate evidence units were identified for this category. Verify whether this procurement tender omits this requirement or uses non-standard terminology."*
3. **Document Qualification Ambiguity:**
   - When a document is classified as `AI_AMBIGUOUS`, the workspace displays an inline confirmation banner:  
     *"Classification uncertain. Please confirm if this document is an active procurement opportunity."* with a direct `Confirm Procurement Opportunity` button.

---

## 8. Three Desktop Composition Prototypes

### Composition A: Evidence Ledger (Single Full-Width Stream)

#### Description
A continuous, wide central ledger of finding rows. Clicking a finding expands its evidence inline. Navigation and coverage indicators live in top control strips.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: MOT-2026-EXP.pdf · 49 Pages · RFP · Status: COMPLETE                           [Logout] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SUMMARY: 14 Verified Findings · 2 Critical Risks · 5 Covered · 4 Review Required · 3 Uncertain   │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FILTERS: [All Categories ▾] [Severity: All ▾] [Status: Verified ▾]                   [Search...] │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [LIABILITY_RISK] [CRITICAL] Uncapped Indemnity Obligation                      Page 14 · Sec 6.2 │
│ Fact: Contractor indemnifies Authority from all claims without limitation.                       │
│ Implication: Unlimited financial exposure.                                                       │
│ ┌─ EVIDENCE (Source Serif 4) ──────────────────────────────────────────────────────────────────┐ │
│ │ "The Supplier shall indemnify, defend and hold harmless the Authority..."                   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ Action: Request 100% liability cap in Q&A.                                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [COMMERCIAL] [HIGH] Liquidated Damages of $15,000/day                          Page 22 · Sec 9.4 │
│ Fact: Milestone delay penalty of $15,000 per calendar day.                                       │
│ Implication: Exceeds standard 10% stop-loss threshold.                                           │
│ ┌─ EVIDENCE (Source Serif 4) ──────────────────────────────────────────────────────────────────┐ │
│ │ "For every calendar day of milestone delay beyond the agreed baseline schedule..."          │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
│ Action: Request 10% aggregate ceiling in Q&A.                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Evaluation
- **Analyst Speed:** Fast for initial skimming (5/5).
- **Evidence Traceability:** Moderate; inline expansion pushes subsequent items down (3/5).
- **Cognitive Load:** Low (4/5).
- **Scalability:** High; scrolls cleanly through 50+ findings (5/5).
- **Source Inspection:** Weak; cannot see the full page in context without navigating away (2/5).

---

### Composition B: Findings Ledger + Persistent Evidence Inspector (Split View)

#### Description
A master-detail layout. The left pane contains an information-dense, filterable findings ledger. Selecting any finding pins it and immediately displays its exact source page, highlighted verbatim quotes, surrounding paragraph context, and pre-drafted Q&A actions in the persistent right inspection pane.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: MOT-2026-EXP.pdf · 49 Pages · Document Type: RFP · Run Status: COMPLETED                       [Logout] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ COVERAGE STRIP: 5 Covered (Green) · 4 Review Required (Amber) · 3 Extraction Uncertain (Slate)                  │
├───────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┤
│ FINDINGS LEDGER (55% Width)                           │ EVIDENCE & SOURCE INSPECTOR (45% Width)                 │
│                                                       │                                                         │
│ [Filter: All] [Severity: Critical ▾] [14 Findings]    │ INSPECTING: FINDING #1 · LIABILITY_RISK                 │
│                                                       │                                                         │
│ ▶ [CRITICAL] Uncapped Indemnity Obligation            │ Source: Page 14 of 49 · Section 6.2                     │
│   Page 14 · Sec 6.2 · Unlimited liability exposure    │ ┌─ VERBATIM EXTRACTED EVIDENCE (Source Serif 4) ──────┐ │
│                                                       │ │ "...The Supplier shall indemnify, defend and hold   │ │
│   [HIGH] Milestone Delay Liquidated Damages           │ │ harmless the Authority from and against any and all │ │
│   Page 22 · Sec 9.4 · $15,000/day penalty             │ │ claims, losses, damages, liabilities, costs and    │ │
│                                                       │ │ expenses arising out of or related to this          │ │
│   [MEDIUM] Undefined Response Time SLA                │ │ Agreement without limitation..."                    │ │
│   Page 38 · Sec 11.3 · Term 'immediate' ambiguous     │ └─────────────────────────────────────────────────────┘ │
│                                                       │                                                         │
│   [LOW] Mandatory ISO 27001 Certification             │ WHY IT MATTERS (Business Implication):                  │
│   Page 6 · Sec 2.1 · Criteria verified                │ Unlimited balance sheet liability. No consequential     │
│                                                       │ loss exclusion.                                         │
│   [REVIEW] Indemnity Clauses (No Finding Survived)    │                                                         │
│   Candidate evidence detected on Page 14, 15          │ RECOMMENDED CLARIFICATION ACTION:                       │
│                                                       │ Submit Q&A request to cap liability at 100% contract    │
│                                                       │ value. [Copy to Q&A Register]                           │
│                                                       │                                                         │
│                                                       │ ┌─ RAW PAGE CONTEXT (Page 14) ────────────────────────┐ │
│                                                       │ │ [Line 42] 6.1 Governing Law...                      │ │
│                                                       │ │ [Line 48] 6.2 Indemnification (Highlighted)...      │ │
│                                                       │ │ [Line 58] 6.3 Insurance Requirements...             │ │
│                                                       │ └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────┘
```

#### Evaluation
- **Analyst Speed:** Very High; findings list remains visible while inspecting evidence (5/5).
- **Evidence Traceability:** Maximum; findings and source page text are visible side-by-side simultaneously (5/5).
- **Information Hierarchy:** Crystal clear (5/5).
- **Cognitive Load:** Balanced; analyst does not lose context when clicking citations (5/5).
- **Scalability:** High; list scrolls independently from the inspection pane (5/5).
- **Uncertainty Review:** Outstanding; `REVIEW_REQUIRED` items open candidate pages directly in the inspector for rapid manual verification (5/5).

---

### Composition C: Investigation Desk (Tri-Panel Spatial Layout)

#### Description
A 3-column layout: Left sidebar for 12-category coverage audit & navigation, Center pane for findings ledger, Right pane for full document reader.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: MOT-2026-EXP.pdf · 49 Pages · Pre-Bid Intelligence Desk                                        [Logout] │
├──────────────────────────┬──────────────────────────────────────────┬───────────────────────────────────────────┤
│ 12-CATEGORY COVERAGE     │ FINDINGS LEDGER                          │ DOCUMENT READER (Page 14)                 │
│                          │                                          │                                           │
│ ✓ Eligibility (3)        │ [CRITICAL] Uncapped Indemnity            │ SECTION 6 — GENERAL PROVISIONS            │
│ ✓ Key Dates (2)          │ Fact: Unlimited liability.               │                                           │
│ ✓ Termination (1)        │ Page 14 · Sec 6.2                        │ 6.1 Governing Law                         │
│ ! Liability (1)          │                                          │ The contract shall be governed by...      │
│ ! Penalties (1)          │ [HIGH] Liquidated Damages                │                                           │
│ ? Insurance (0)          │ Fact: $15k/day penalty.                  │ 6.2 Indemnification                       │
│ ? Financial (0)          │ Page 22 · Sec 9.4                        │ >>> The Supplier shall indemnify, defend  │
│ ! Evaluation (0)         │                                          │ and hold harmless the Authority... <<<    │
│ ✓ Submission (2)         │ [AMBIGUOUS] SLA Response Time            │                                           │
│ ? Bid Bond (0)           │ Fact: Term 'immediate' undefined.        │ 6.3 Insurance                             │
│ ? Performance (0)        │ Page 38 · Sec 11.3                       │ Contractor shall maintain standard...     │
│ ! Documents (0)          │                                          │                                           │
└──────────────────────────┴──────────────────────────────────────────┴───────────────────────────────────────────┘
```

#### Evaluation
- **Analyst Speed:** Moderate; 3 columns can feel visually cramped on standard 1080p monitors (3/5).
- **Evidence Traceability:** High (4/5).
- **Information Hierarchy:** Dense, but narrow columns cause heavy text wrapping for long quotes (3/5).
- **Cognitive Load:** Higher; 3 active scrolling panes simultaneously (3/5).
- **Scalability:** Moderate; width constraints limit complex finding metadata (3/5).

---

## 9. Recommended Composition: Composition B (Findings Ledger + Persistent Evidence Inspector)

### Rationale
**Composition B** is selected as the authoritative architecture for the following reasons:

1. **Optimal Evidence-First Workflow:** It directly mirrors how procurement professionals review contracts: scanning findings on the left, while immediately verifying the verbatim excerpt and surrounding clause context on the right without context switching.
2. **Zero Text Wrapping Penalty:** The 55% / 45% split provides generous line length for both the findings metadata and the verbatim evidence quote in `Source Serif 4`.
3. **Direct Operational Handling of Uncertainty:** When an analyst clicks a `REVIEW_REQUIRED` category from the top strip, the left pane filters to that category, and the right pane automatically loads the candidate pages identified during deterministic retrieval for fast human audit.
4. **Resilience across Screen Sizes:** Collapses gracefully from a side-by-side desktop workstation into a sequential master-detail view on tablet/mobile.

---

## 10. Desktop Behavior (Composition B)

1. **Header & Document Context:**
   - Sticky top bar (`h-14`, border `#D9DEE5`, bg `#FFFFFF`).
   - Left: RFPground mark + Document Switcher dropdown (`MOT-2026-EXP.pdf ▾`) + Page Count chip (`49 Pages`) + Document Type (`RFP`).
   - Right: Run status beacon (`● ANALYSIS COMPLETE`) + `New Tender` action + User profile / Logout.
2. **Coverage Orientation Strip:**
   - Positioned directly below header (`h-12`, bg `#F5F6F4`, border-b `#D9DEE5`).
   - Displays summary metrics: Total Findings, Critical Count, and compact pills for the 12 Critical Categories with status colors (Green/Amber/Slate).
   - Clicking any category pill filters the ledger to that category.
3. **Left Pane (Findings Ledger):**
   - Filter bar: Category dropdown, Severity filter pills (`ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), Search input.
   - List of findings rendered as structured rows with hover highlight and active selection border (`border-l-4 border-[#3157D5]`).
4. **Right Pane (Persistent Evidence Inspector):**
   - Sticky / independent scrolling panel (`bg-white`, border-l `#D9DEE5`).
   - Header: Active finding title + Section/Page tag.
   - Verbatim Quote Card: Highlighted box rendered in `Source Serif 4`.
   - Business Implication Box: Distinct tinted container (`#F0F4FE`).
   - Action / Clarification Box: Formatted inquiry text with a `Copy Q&A Draft` button.
   - Raw Page Context: Expandable accordion showing the full page text from `document_pages` with verbatim quote highlighted.

---

## 11. Mobile Behavior

On screens `< 1024px`, the workspace adapts to a **focused sequential review stream**:

1. **Header:** Retains filename, page count, and status in a compact 2-row layout.
2. **Coverage Summary:** Horizontal scrollable pill strip.
3. **Findings Stream:** Full-width finding cards displaying:
   - Category & Severity badge.
   - Finding Fact.
   - Business Implication.
   - Verbatim Source Quote in `Source Serif 4` with `Page N` badge.
   - Action Recommendation.
   - Tap on `Page N` opens a full-screen modal showing the raw extracted page context.

---

## 12. Exact Data Sources for Every Visible UI Field

| UI Section | Visible Field | Exact Database / API Source |
|---|---|---|
| **Header** | Filename | `documents.original_filename` |
| **Header** | Page Count | `count(document_pages)` |
| **Header** | Document Type | `documents.document_type` |
| **Header** | Qualification Status | `documents.qualification_status` |
| **Header** | Analysis Status | `analysis_runs.status` |
| **Coverage Strip** | 12 Category Statuses | Computed via `assessCriticalCoverage()` (`lib/ai/coverage.ts`) |
| **Coverage Strip** | Examined Evidence Units | `CategoryCoverage.evidence_units_count` |
| **Coverage Strip** | Verified Findings Count | `CategoryCoverage.verified_findings_count` |
| **Coverage Strip** | Analyst Guidance | `CategoryCoverage.reason` |
| **Findings Ledger** | Finding Category | `analysis_findings.category` |
| **Findings Ledger** | Severity Priority | `analysis_findings.severity` (`CRITICAL`, `HIGH`, etc.) |
| **Findings Ledger** | Finding Fact | `analysis_findings.finding` |
| **Findings Ledger** | Business Implication | `analysis_findings.business_implication` |
| **Findings Ledger** | Action / Q&A Recommendation| `analysis_findings.action_recommendation` |
| **Evidence Inspector** | Cited Page Number | `analysis_finding_quotes.page_number` |
| **Evidence Inspector** | Verbatim Quote Text | `analysis_finding_quotes.quote_text` |
| **Evidence Inspector** | Raw Page Content | `document_pages.content` |

---

## 13. Fields Explicitly Forbidden from the UI

The following fields **DO NOT EXIST** and must **NEVER** appear in the workspace:

- ❌ Automated Go/No-Go decisions or final legal liability verdicts.
- ❌ Aggregate AI confidence scores (e.g. `AI Confidence: 98%`).
- ❌ Numerical coverage percentages (e.g. `Coverage: 87%`).
- ❌ Hallucination rate percentages (e.g. `0% Hallucination`).
- ❌ Artificial clause counts not derived from actual persisted records.
- ❌ Fictional OCR quality meters.
- ❌ Invented financial values not present in the source text.

---

## 14. Anti-Slop & Craft Checklist

- [x] **No Decorative Cards:** Containers are used exclusively where structural containment aids legibility.
- [x] **Strict Visual Palette:** Canvas `#F5F6F4`, Ink `#111827`, Rules `#D9DEE5`, Signal Blue `#3157D5`, Semantic Risk Colors (`#B42318`, `#B54708`, `#027A48`).
- [x] **Typography Discipline:** `Geist Sans` for all UI/data; `Source Serif 4` strictly reserved for verbatim contract excerpts.
- [x] **Zero AI Sparkles or Gradients:** Pure, unembellished B2B procurement interface.
- [x] **Operational Uncertainty:** `REVIEW_REQUIRED` and `EXTRACTION_UNCERTAIN` are given first-class visual clarity, not hidden or converted to fake scores.
- [x] **Real Data Alignment:** 100% of visible data points map to verified PostgreSQL columns and BUILD-008P contracts.

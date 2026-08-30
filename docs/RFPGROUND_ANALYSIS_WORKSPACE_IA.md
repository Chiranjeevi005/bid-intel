# RFPground Analysis Workspace — Information Architecture (IA)

**Document:** `RFPGROUND_ANALYSIS_WORKSPACE_IA.md`  
**Status:** PROPOSED & LOCKED FOR REVIEW  
**Source of Truth:** Repository Audit & Real Analyst Workflow  
**Date:** 2026-08-29  

---

## 1. The Real Analyst Journey

The workflow reflects how a professional procurement analyst or bid manager processes an incoming tender:

```text
[1. INTAKE]
Select & Upload RFP PDF (≤ 10 MB)
        ↓
[2. TEXT EXTRACTION & DIAGNOSTICS]
Page-by-page extraction (or OCR_REQUIRED flag)
        ↓
[3. QUALIFICATION GATE]
Verify procurement opportunity (or confirm ambiguous classification)
        ↓
[4. ANALYSIS EXECUTION]
Deterministic retrieval + bounded targeted extraction + evidence validation + selective interpretation
        ↓
[5. ANALYSIS WORKSPACE]
        ├── A. FINDINGS & EVIDENCE (Primary Work Surface)
        │      Line-item facts, severity, business implications, verbatim quotes
        ├── B. CRITICAL COVERAGE (Risk & Omission Audit)
        │      12 critical categories (COVERED, REVIEW_REQUIRED, EXTRACTION_UNCERTAIN)
        ├── C. EVIDENCE INSPECTOR (Source Verification)
        │      Page-by-page document viewer with cited quote matching
        └── D. INTELLIGENCE REPORT (Dossier & Clarification Matrix)
               Synthesized executive summary and Q&A inquiry draft
```

---

## 2. Information Architecture Model

Rather than scattering the experience across disconnected pages, the Analysis Workspace is a **unified, document-centric workbench**.

### Top-Level Layout Structure

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKSPACE HEADER                                                            │
│ Brand · Document Switcher / Title · Page Count · Status Beacon · User/Logout│
├─────────────────────────────────────────────────────────────────────────────┤
│ WORKSPACE NAV / VIEW TABS:                                                  │
│ [ Findings & Risk ]   [ Critical Coverage ]   [ Source Inspector ]  [ Report ]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ACTIVE WORKSPACE SURFACE (Responsive 2-Column or Focused View)              │
│                                                                             │
│ - Findings: Filterable risk ledger + expandable evidence quote cards        │
│ - Coverage: 12-category operational status matrix with analyst actions      │
│ - Source Inspector: Page text browser with verbatim quote locator           │
│ - Report: Unified executive summary with Q&A clarification questions        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed View Specifications

### Surface 1: Findings & Risk (The Primary Work Surface)
- **Role:** The core surface where the analyst reviews what was extracted from the document.
- **Components:**
  - Category filter pills (`ALL`, `ELIGIBILITY`, `DATES_SUBMISSION`, `EVALUATION`, `COMMERCIAL`, `LIABILITY_RISK`, `TERMINATION`, `CONTRADICTIONS_AMBIGUITIES`).
  - Severity toggles (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Finding Card Anatomy (Evidence-First):
    1. **Category & Priority Header:** Domain badge + Severity indicator.
    2. **Finding Title & Fact:** Objective extracted fact.
    3. **Business Implication (if present):** Commercial/operational impact.
    4. **Source Citation:** Page number tag (clickable to jump to Source Inspector).
    5. **Verbatim Evidence Quote:** Rendered in `font-serif` (`Source Serif 4`) in a distinct evidence box.
    6. **Action / Clarification Recommendation:** Recommended analyst next step.

### Surface 2: Critical Coverage Matrix
- **Role:** The risk & omission audit screen that enforces `NO VERIFIED FINDING ≠ NO REQUIREMENT`.
- **Components:**
  - Overview bar: Total Covered, Review Required, and Extraction Uncertain counts.
  - 12-Row Operational Table:
    - `Category Name`
    - `Operational Status Pill` (`COVERED` [Green], `REVIEW_REQUIRED` [Amber], `EXTRACTION_UNCERTAIN` [Slate/Red])
    - `Evidence Units Examined` (count)
    - `Verified Findings Count` (count)
    - `Analyst Action Guidance` (e.g. "Relevant evidence units exist, but no verified finding survived extraction/recovery. Manual review of section required.")

### Surface 3: Source Document & Evidence Inspector
- **Role:** Complete transparency into the raw extracted text of the document.
- **Components:**
  - Page Navigation Strip: Jump to any page number (`Page 1 of N`), next/prev controls.
  - Search / Quote Highlighting: Highlights the exact verbatim quote strings within the page text.
  - Page Content Viewer: Formatted text rendering with preserved paragraph breaks and tabular layout.

### Surface 4: Intelligence Report & Q&A Strategy
- **Role:** Executive-ready synthesis for bid committee review and tender clarification submission.
- **Components:**
  - Document & Tender Identification summary.
  - Critical Risk Highlights (filtered to Critical & High severity items).
  - Coverage Health summary.
  - Formal Clarification Questions Register: Pre-drafted clarification inquiries ready to copy/export for submission during the client Q&A period.

---

## 4. Entry State vs. Analyzed State

- **When No Document or New Upload Selected:**
  - Clean, unembellished Intake Card: Dropzone for PDF (≤ 10 MB), upload progress, extraction progress (`Processing PDF...`), OCR warning if applicable, and qualification resolution (`Confirm as Procurement Opportunity` if ambiguous).
- **Once Document is Analyzed:**
  - The workspace automatically opens to the **Findings & Risk** surface with the document title and page count in the header.
  - The analyst can switch between previous tenders via the Document Switcher in the header or upload a new tender with a dedicated "New Tender" button.

# RFPground Analysis Workspace — Visual Prototype & Surface Specification

> **Document:** `RFPGROUND_ANALYSIS_WORKSPACE_VISUAL_PROTOTYPE.md`  
> **Status:** VISUAL DESIGN PROTOTYPE FOR REVIEW  
> **Source of Truth:** BUILD-008P Capability Map, Data Contract, and IA Specification  
> **Date:** 2026-08-29  

---

## 1. Primary User Journey & Mental Model

When a procurement analyst opens an analyzed tender, the interface immediately answers five sequential questions without requiring visual exploration:

```text
1. WHAT WAS FOUND?
   → Objective verified requirement / contractual risk
2. WHY DOES IT MATTER?
   → Commercial, operational, or delivery consequence
3. WHERE DID IT COME FROM?
   → Exact document page number & section reference
4. WHAT IS THE VERBATIM EVIDENCE?
   → Unaltered extracted text rendered in Source Serif 4
5. WHAT ACTION IS REQUIRED?
   → Action recommendation & surrounding document page context
```

---

## 2. Desktop Visual Prototype (Composition B — Refined Hierarchy)

### Desktop Screen Layout Blueprint

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ WORKSPACE HEADER                                                                                                │
│ [RFPground] │ MOT-2026-EXP.pdf ▾ │ 49 Pages │ Type: RFP │ Status: ANALYSIS COMPLETE   [+ New Tender]  [user@co] │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                 │
│ FINDINGS LEDGER (56% Width)                           │ PERSISTENT EVIDENCE INSPECTOR (44% Width)               │
│                                                       │                                                         │
│ Filters: [ Category: All ▾ ] [ Severity: All ▾ ] [ 14 Findings ]│ INSPECTING: FINDING #1 · LIABILITY_RISK                 │
│                                                       │                                                         │
│ ┌───────────────────────────────────────────────────┐ │ Category: LIABILITY_RISK   Severity: CRITICAL           │
│ │ ▶ [CRITICAL] [LIABILITY_RISK]   Page 14 · Sec 6.2 │ │ Source: Page 14 of 49 · Section 6.2                     │
│ │   Uncapped Indemnification Obligation             │ │                                                         │
│ │   Why: Unlimited third-party liability exposure   │ │ 1. WHAT WAS IDENTIFIED (Verified Fact):                 │
│ │   "The Supplier shall indemnify, defend and..."   │ │ Contractor must indemnify the Authority from all claims │
│ └───────────────────────────────────────────────────┘ │ and losses without any aggregate liability ceiling.     │
│ ┌───────────────────────────────────────────────────┐ │                                                         │
│ │   [CRITICAL] [COMMERCIAL]       Page 22 · Sec 9.4 │ │ 2. WHY IT MATTERS (Business Implication):               │
│ │   Milestone Delay Liquidated Damages ($15k/day)   │ │ Unlimited balance sheet exposure. No standard 10-15%    │
│ │   Why: Daily penalty exceeds standard stop-loss   │ │ contract value stop-loss or consequential loss carveout.│
│ └───────────────────────────────────────────────────┘ │                                                         │
│ ┌───────────────────────────────────────────────────┐ │ 3. VERBATIM EXTRACTED EVIDENCE:                         │
│ │   [HIGH] [TERMINATION]          Page 31 · Sec 14.1│ │ ┌─────────────────────────────────────────────────────┐ │
│ │   Unilateral Termination for Convenience (7 Days) │ │ │ [Source Serif 4]                                    │ │
│ │   Why: Short cure notice creates mobilization risk│ │ │ "The Supplier shall indemnify, defend and hold      │ │
│ └───────────────────────────────────────────────────┘ │ │ harmless the Authority from and against any and all  │ │
│ ┌───────────────────────────────────────────────────┐ │ │ claims, losses, damages, liabilities, costs and     │ │
│ │   [MEDIUM] [CONTRADICTIONS]     Page 38 · Sec 11.3│ │ │ expenses arising out of or related to this          │ │
│ │   Ambiguous 24/7 SLA Response Time ("Immediate")  │ │ │ Agreement without limitation."                      │ │
│ │   Why: Undefined MTTR exposes supplier to breach  │ │ └─────────────────────────────────────────────────────┘ │
│ └───────────────────────────────────────────────────┘ │                                                         │
│ ┌───────────────────────────────────────────────────┐ │ 4. ANALYST ACTION RECOMMENDATION:                       │
│ │   [LOW] [ELIGIBILITY]            Page 6 · Sec 2.1 │ │ Request insertion of an aggregate liability cap (100%   │
│ │   Mandatory ISO 27001 & 9001 Certifications Met   │ │ of contract value) during the formal clarification      │
│ │   Why: Confirmed in vendor capability repository  │ │ period.                                                 │
│ └───────────────────────────────────────────────────┘ │                                                         │
│                                                       │ 5. SURROUNDING DOCUMENT CONTEXT (Page 14):              │
│                                                       │ ┌─────────────────────────────────────────────────────┐ │
│                                                       │ │ [Extracted Text - Page 14 of 49]                    │ │
│                                                       │ │ 6.1 Governing Law and Dispute Resolution...         │ │
│                                                       │ │ 6.2 Indemnification: >>> The Supplier shall        │ │
│                                                       │ │ indemnify, defend and hold harmless the Authority...│ │
│                                                       │ │ without limitation. <<<                             │ │
│                                                       │ │ 6.3 Insurance Requirements and Coverage Minimums... │ │
│                                                       │ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SECONDARY AUDIT: 12-CATEGORY CRITICAL COVERAGE                                                                  │
│ [✓ ELIGIBILITY: Covered (3)] [✓ DATES: Covered (2)] [✓ TERMINATION: Covered (1)] [! LIABILITY: Review Req (1)]   │
│ [! PENALTIES: Review Req (1)] [? INSURANCE: Uncertain (0)] [? FINANCIAL: Uncertain (0)] [! EVALUATION: Review] │
│ [✓ SUBMISSION: Covered (2)] [? EMD BOND: Uncertain (0)] [? PERF SECURITY: Uncertain (0)] [! DOCUMENTS: Review] │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Hierarchy & Specification

### A. Workspace Header (`WorkspaceHeader.tsx`)
- **Container:** `h-14 bg-white border-b border-[#D9DEE5] px-6 flex items-center justify-between`
- **Left Group:**
  - `Brand Wordmark:` `RFPground` (`font-bold text-[14px] text-[#111827] tracking-tight`)
  - `Divider:` `h-4 w-px bg-[#D9DEE5]`
  - `Document Switcher Dropdown:` `MOT-2026-EXP.pdf ▾` (`text-[13px] font-semibold text-[#111827] hover:text-[#3157D5]`)
  - `Page Count Pill:` `49 Pages` (`text-[11px] font-medium bg-[#F5F6F4] text-[#475467] px-2 py-0.5 rounded border border-[#D9DEE5]`)
  - `Document Type Chip:` `RFP` (`text-[11px] font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded`)
  - `Status Beacon:` `● COMPLETE` (`text-[11px] font-semibold text-[#027A48] flex items-center gap-1.5`)
- **Right Group:**
  - `New Tender Button:` `+ New Tender` (`text-[12px] font-medium border border-[#D9DEE5] px-3 py-1.5 rounded hover:bg-gray-50`)
  - `Session Menu:` `Analyst Account` (`text-[12px] font-medium text-[#475467]`)

---

### B. Findings Ledger (`FindingsLedger.tsx` — Left Pane, 56% Width)
- **Container:** `p-6 flex flex-col bg-[#F5F6F4] overflow-y-auto border-r border-[#D9DEE5]`
- **Ledger Controls Strip:**
  - Category selector (`All Categories`, `Eligibility`, `Dates & Submission`, `Evaluation`, `Commercial`, `Liability & Risk`, `Termination`, `Contradictions`)
  - Severity priority pills: `ALL` (14) · `CRITICAL` (2) · `HIGH` (3) · `MEDIUM` (4) · `LOW` (5)
  - Search input for real-time string filtering across title and fact.
- **Finding Row Structure:**
  - Unselected Row: `bg-white border border-[#D9DEE5] rounded-sm p-4 hover:border-gray-400 transition-colors cursor-pointer mb-3`
  - Selected Row: `bg-white border border-[#3157D5] ring-1 ring-[#3157D5] border-l-4 border-l-[#3157D5] rounded-sm p-4 shadow-sm mb-3`
  - Row Content Elements:
    - **Header Row:** Category (`text-[11px] uppercase tracking-wider text-[#667085] font-semibold`) + Severity Pill (`CRITICAL` in `#B42318` / `#FEF3F2`, `HIGH` in `#B54708` / `#FFFAEB`, etc.) + Source Tag (`Page 14 · Sec 6.2`).
    - **Title & Fact:** `text-[15px] font-semibold text-[#111827] leading-snug mb-1.5`
    - **Business Implication (Snippet):** `text-[13px] text-[#475467] line-clamp-1`
    - **Verbatim Excerpt:** Single-line italic snippet in `font-serif text-[12px] text-[#344054]`

---

### C. Persistent Evidence Inspector (`EvidenceInspector.tsx` — Right Pane, 44% Width)
- **Container:** `p-6 bg-white overflow-y-auto flex flex-col`
- **Section 1: Finding Header**
  - Category and Severity badges
  - Title: `Uncapped Indemnification Obligation` (`text-[18px] font-bold text-[#111827]`)
  - Source Location: `Page 14 of 49 · Section 6.2` (`text-[12px] font-mono text-[#667085]`)
- **Section 2: Verified Fact**
  - Label: `WHAT WAS IDENTIFIED` (`text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1`)
  - Content: `text-[14px] text-[#111827] leading-relaxed`
- **Section 3: Business Implication**
  - Label: `WHY IT MATTERS` (`text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1`)
  - Content container: `p-3.5 bg-[#F8F9FC] border border-[#E0E8F9] rounded-sm text-[13px] text-[#1E3A8A] leading-relaxed`
- **Section 4: Verbatim Source Evidence (The Evidence Box)**
  - Label: `VERBATIM SOURCE EVIDENCE` (`text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5`)
  - Evidence Card: `p-4 bg-[#FBFBFA] border-l-3 border-[#3157D5] border-y border-r border-[#D9DEE5] rounded-r-sm`
  - Quote Typography: `font-serif text-[15px] leading-[1.6] text-[#111827]`
  - Page Attribution: `Page 14 · Character Count: 218`
- **Section 5: Action Recommendation**
  - Label: `ANALYST ACTION RECOMMENDATION` (`text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1`)
  - Content container: `p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-sm text-[13px] text-[#344054] leading-relaxed`
- **Section 6: Surrounding Page Context**
  - Label: `SURROUNDING DOCUMENT CONTEXT (PAGE 14)` (`text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5`)
  - Viewer Box: `p-4 bg-gray-50 border border-[#D9DEE5] rounded-sm font-mono text-[11.5px] leading-relaxed text-gray-700 max-h-56 overflow-y-auto whitespace-pre-wrap`
  - Active Quote Highlight: `bg-yellow-100 text-gray-900 px-1 py-0.5 border-b border-yellow-300`

---

### D. Secondary Audit Strip: 12-Category Critical Coverage (`CoverageAuditStrip.tsx`)
- **Placement:** Below the findings workspace, or accessible as a compact bottom audit tray.
- **Container:** `bg-white border-t border-[#D9DEE5] px-6 py-3 flex flex-col gap-2`
- **Header:** `text-[11px] font-bold uppercase tracking-wider text-[#667085]` with live status counts (`5 Covered · 4 Review Required · 3 Extraction Uncertain`).
- **12 Compact Category Pills:**
  - `COVERED` (Green): `✓ ELIGIBILITY (3)` (`bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6] text-[11px] font-semibold px-2.5 py-1 rounded`)
  - `REVIEW REQUIRED` (Amber): `! INDEMNITY (0 findings / 2 units)` (`bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] text-[11px] font-semibold px-2.5 py-1 rounded`)
  - `EXTRACTION UNCERTAIN` (Slate): `? FINANCIAL (0)` (`bg-[#F2F4F7] text-[#475467] border border-[#D0D5DD] text-[11px] font-semibold px-2.5 py-1 rounded`)
- **Click Behavior:** Clicking a category pill filters the Findings Ledger or, if `REVIEW_REQUIRED`, opens the relevant candidate page numbers directly in the Evidence Inspector for immediate manual verification.

---

## 4. Mobile Visual Prototype (< 1024px)

On mobile, the workspace eliminates the split pane and stacks into a sequential, high-speed investigation stream:

```text
┌────────────────────────────────────────────────────────┐
│ HEADER                                                 │
│ RFPground │ MOT-2026-EXP.pdf (49p) │ ● COMPLETE [Menu] │
├────────────────────────────────────────────────────────┤
│ COVERAGE AUDIT TRAY (Compact Scrollable Row)          │
│ [✓ Eligibility] [! Indemnity] [! Penalties] [? Insur]  │
├────────────────────────────────────────────────────────┤
│ FINDINGS STREAM (14 Findings)                          │
│                                                        │
│ [CRITICAL] [LIABILITY_RISK]         Page 14 · Sec 6.2  │
│ Uncapped Indemnification Obligation                    │
│                                                        │
│ Fact: Contractor indemnifies Authority without ceiling │
│                                                        │
│ Why it matters: Unlimited balance sheet liability.     │
│                                                        │
│ ┌─ VERBATIM EVIDENCE (Source Serif 4) ───────────────┐ │
│ │ "The Supplier shall indemnify, defend and hold     │ │
│ │ harmless the Authority from and against any and..." │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Action: Request 100% liability cap during Q&A window.  │
│                                                        │
│ [ View Full Page 14 in Context → ]                    │
├────────────────────────────────────────────────────────┤
│ [CRITICAL] [COMMERCIAL]             Page 22 · Sec 9.4  │
│ Milestone Delay Liquidated Damages ($15k/day)          │
│ ...                                                    │
└────────────────────────────────────────────────────────┘
```

---

## 5. Visual States & Edge Cases

### State 1: Analysis Processing (Inngest Async Execution)
- **Header:** Status displays `● PROCESSING` with a subtle spinning loader.
- **Main Area:** Informative operational state:
  ```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Analysing Document Pages: MOT-2026-EXP.pdf                             │
  │ Status: Targeted Extraction & Evidence Verification in Progress        │
  │ Current Stage: Category Retrieval & Clause Mapping                     │
  │                                                                        │
  │ 49 pages extracted · Running deterministic evidence validation...     │
  └────────────────────────────────────────────────────────────────────────┘
  ```

### State 2: Document Qualification Ambiguous (`AI_AMBIGUOUS`)
- **Banner:** Positioned directly below the header:
  ```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ ⚠️ Classification Uncertain                                            │
  │ DeepSeek classified this document with low procurement confidence.     │
  │ Reason: "Document contains operational guidelines but lacks schedules."│
  │ [ Confirm as Procurement Opportunity ]        [ Cancel Analysis ]      │
  └────────────────────────────────────────────────────────────────────────┘
  ```

### State 3: Analysis Completed with Zero Verified Findings
- **Ledger:** Shows a clear, non-punitive audit state:
  ```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ No Verified Findings Extracted                                         │
  │ Strict evidence validation found no confirmed clauses in standard      │
  │ categories.                                                            │
  │ Review the 12-Category Coverage Audit below to inspect candidate pages.│
  └────────────────────────────────────────────────────────────────────────┘
  ```

### State 4: `REVIEW_REQUIRED` Category Selected
- When clicking a category like `INDEMNITY` where `unitsCount > 0` but `findingsCount === 0`:
- **Ledger:** Displays:
  ```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Category: INDEMNITY — Manual Review Required                           │
  │ Status: REVIEW REQUIRED                                                │
  │ Reason: 2 candidate evidence units were identified on Page 14 and 15,   │
  │ but no finding met strict automated verification criteria.             │
  │ Action: Click below to inspect raw candidate pages.                    │
  │ [ Inspect Page 14 ]   [ Inspect Page 15 ]                              │
  └────────────────────────────────────────────────────────────────────────┘
  ```

### State 5: `EXTRACTION_UNCERTAIN` Category Selected
- When clicking a category like `FINANCIAL_REQUIREMENTS` where `unitsCount === 0 && findingsCount === 0`:
- **Ledger:** Displays:
  ```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │ Category: FINANCIAL_REQUIREMENTS — Extraction Uncertain                │
  │ Status: EXTRACTION UNCERTAIN                                           │
  │ Reason: Insufficient evidence units were identified in the document.  │
  │ Action: Verify manually if the tender omits this domain.               │
  └────────────────────────────────────────────────────────────────────────┘
  ```

---

## 6. Exact Data Source Mapping

| UI Element | Data Field | Source Entity / Table | Null / Fallback Handling |
|---|---|---|---|
| Header Filename | `original_filename` | `documents.original_filename` | Truncate gracefully if > 32 chars |
| Header Pages | `total_pages` | `count(document_pages)` | Render as `N Pages` |
| Header Doc Type | `document_type` | `documents.document_type` | Default to `'DOCUMENT'` |
| Header Run Status | `status` | `analysis_runs.status` | `'QUEUED'`, `'PROCESSING'`, `'COMPLETED'`, `'FAILED'` |
| Finding Category | `category` | `analysis_findings.category` | Render uppercase domain badge |
| Finding Severity | `severity` | `analysis_findings.severity` | `'CRITICAL'`, `'HIGH'`, `'MEDIUM'`, `'LOW'` |
| Finding Fact | `finding` | `analysis_findings.finding` | Mandatory string |
| Business Implication | `business_implication`| `analysis_findings.business_implication` | If null, hide implication block cleanly |
| Action Recommendation | `action_recommendation`|`analysis_findings.action_recommendation` | If null, hide action block cleanly |
| Cited Page Number | `page_number` | `analysis_finding_quotes.page_number` | Render as `Page N` |
| Verbatim Quote | `quote_text` | `analysis_finding_quotes.quote_text` | Render verbatim in `Source Serif 4` |
| Surrounding Page Text| `content` | `document_pages.content` | Exact text from PostgreSQL |
| 12 Coverage Statuses | `status` | `assessCriticalCoverage().status` | `'COVERED'`, `'REVIEW_REQUIRED'`, `'EXTRACTION_UNCERTAIN'` |

---

## 7. Unsupported Elements Explicitly Excluded

- ❌ Automated Go/No-Go bid decisions.
- ❌ Synthetic percentage scores (e.g. `98.5% Accuracy`, `82% Overall Coverage`).
- ❌ Artificial clause counts (e.g. `142 Clauses Parsed`).
- ❌ Fictional OCR quality gauges.
- ❌ Decorative charts, circular gauges, or gradient waveforms.
- ❌ Simulated financial impact not present in document quotes.

---

## 8. Implementation Notes & Technical Constraints

1. **No Code Duplication in Coverage:** The workspace consumes `assessCriticalCoverage()` directly from `lib/ai/coverage.ts` on the server, passing the resulting coverage dictionary to client components.
2. **Page Navigation Cache:** `document_pages` are loaded on demand or passed with the active document to enable instantaneous quote-highlight jumping.
3. **Typography Enforcement:** `Geist Sans` is applied to all UI chrome, while `Source Serif 4` is strictly scoped via CSS class `font-serif` to `quote_text` containers.

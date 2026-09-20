# RFPGround SaaS — Resilient Experience System: Phase 3B State & Recovery Matrix
**Document ID:** `docs/product/RESILIENT_EXPERIENCE_STATE_RECOVERY_MATRIX.md`  
**Phase:** Phase 3B (Product Contract Specification — Revised & Implementation-Ready)  
**Parent Inventory:** [`docs/product/RESILIENT_EXPERIENCE_STATE_INVENTORY.md`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/docs/product/RESILIENT_EXPERIENCE_STATE_INVENTORY.md)  
**Core Product Invariant:** *"No Dead Ends. No Silent Failures. No Unclear States."*  

---

## 1. Executive Summary & Foundational Principles

Phase 3A inventoried 38 baseline discovery states across 12 product domains in the RFPGround codebase. Phase 3B expands and refines those initial discovery findings into **53 concrete, actionable product state contracts** and **8 notification contracts**.

RFPGround already has substantial backend resilience (Phase 2A transactional entitlement ledger, Phase 2B atomic CAS dispatch with emergency release, and Phase 2C server-authoritative Razorpay webhook processor). However, the user-facing state and recovery layer is inconsistent:
1. **Error $\neq$ Empty:** Library and Workspace API fetch failures currently collapse into empty state cards, factually misrepresenting system reality.
2. **Asynchronous Continuity:** In-flight processing continues durably on the server, but the UI lacks real-time awareness and explicit leave/refresh/return semantics.
3. **Financial & Entitlement Integrity:** Actions such as "Override & Analyze", plan-gated findings, and subscription cancellations require explicit credit notices and self-serve controls.
4. **Server-Authoritative Lifecycle Truth:** Front-end status transitions must never get ahead of verified server/database state (e.g., subscription `AUTHENTICATED` does *not* grant paid entitlement until authoritative `ACTIVATED`).
5. **Decoupled Notification Subsystem:** Transactional email is a vital communication layer, but email delivery must never determine or block underlying database transactions.

---

## 2. Global Resiliency Invariants (The 6 Laws)

Every screen, component, and workflow in RFPGround must adhere to these six architectural UX laws:

1. **Law 1: The Integrity Rule (Error $\neq$ Empty)**  
   An error state (HTTP 5xx, 4xx, network drop, database timeout) must **NEVER** render an empty state UI. If an API request to fetch documents or findings fails, the UI must render an explicit error banner or card detailing the failure, with a prominent `"Retry"` action. Empty state cards (`"No documents in this view"`) are strictly reserved for verified 200 OK responses with empty arrays (`[]`).

2. **Law 2: The Continuous Background Law**  
   Long-running asynchronous operations (PDF extraction, candidate retrieval, LLM analysis synthesis) must never strand the user. If the user navigates away, closes the tab, or refreshes:
   - The operation continues durably on the server (Inngest worker or background runner).
   - The Document Library and Queue Drawer must actively reflect live progress.
   - The UI must explicitly inform the user: *"You can safely close this page. Processing will continue in the background."*

3. **Law 3: Truthful Quota & Lifecycle Accounting**  
   The user must never wonder whether a credit was deducted, preserved, or refunded:
   - Starting an analysis: Clearly indicates reservation (`RESERVED`).
   - AI Disqualification (Non-RFP): Explicitly states *"Your analysis credit was returned."*
   - Override & Analyze: Explicitly states *"Confirming this non-RFP will consume 1 analysis credit upon completion."*
   - Analysis Failure: Explicitly states *"Analysis could not be completed. Your credit has been restored."*
   - Subscription Checkout: Checkout authentication does *not* immediately grant paid entitlement. Paid quota unlocks only when the authoritative subscription activation is confirmed.

4. **Law 4: Meaningful Next Action (No Dead Ends)**  
   **Every non-success state must clearly communicate what the user can do next.**
   - *Recoverable states* (API failures, payment halts, quota limits) must provide an immediate recovery path (`"Retry"`, `"Update Card"`, `"Upgrade Plan"`).
   - *Informational terminal states* (e.g., zero verified findings extracted) must provide clear forward guidance (`"Inspect Candidate Pages in Coverage Audit"`).
   - Every 404 screen for authenticated users must offer a direct `"Return to Document Library"` action.

5. **Law 5: Authoritative Background Refresh Policy**  
   The UI must refresh authoritative processing state while work is active. The implementation may use polling or subscriptions; the canonical Phase 3C implementation enforces:
   - **Canonical Refresh Policy:** A 5-second background status refresh interval while an actively processing document (`PROCESSING`, `EXTRACTING`, `QUALIFYING`, `ANALYSING`) is visible in the Workspace or represented in the Document Library. Polling ceases immediately once terminal state (`COMPLETED`, `FAILED`, `REJECTED`) is confirmed.

6. **Law 6: Non-Blocking Notification Decoupling**  
   Email delivery must never determine or block underlying product transactions. All database mutations (committing findings, finalizing entitlement ledgers, updating subscription records) must complete and commit *before* email dispatch is attempted. If email service (e.g., Resend) is unavailable or fails, the core product transaction remains valid and completed.

---

## 3. Asynchronous Continuity Contract Definition

Every asynchronous operation in Section 5 defines standard continuity semantics using the following schema:
- **LEAVE:** `SAFE` (user can navigate away without terminating server execution) / `UNSAFE` (leaving aborts operation).
- **REFRESH:** `SAFE` (page reload preserves workflow state) / `UNSAFE` (reload loses in-memory data).
- **RETURN:** `SAFE` (user can return later and view completed state) / `UNSAFE`.
- **SERVER_CONTINUES:** `YES` (durable background execution) / `NO` (tied to browser fetch lifespan).
- **CREDIT_STATE:** Explicit entitlement ledger status (`NONE`, `RESERVED`, `CONSUMED`, `RELEASED`).

---

## 4. Phase 3A to Phase 3B State Traceability Matrix

| Phase 3A Discovery State / Dead-End | Phase 3B Expanded State Contract(s) | Relationship & Resolution Summary |
| :--- | :--- | :--- |
| `STATE-AUTH-01` | `STATE-AUTH-01` | 1:1 Identity mapping. Idle login screen. |
| `STATE-AUTH-02` | `STATE-AUTH-02` | 1:1 Identity mapping. Magic link in-flight state. |
| `STATE-AUTH-03` | `STATE-AUTH-03` | 1:1 Identity mapping. Magic link sent confirmation. |
| `STATE-AUTH-04` | `STATE-AUTH-04` | 1:1 Identity mapping. Auth error display. |
| `STATE-AUTH-05` / `DEAD-END-03` | `STATE-AUTH-05` | Direct resolution of `DEAD-END-03`: `LoginPage` reads `?error=auth-callback-failed` and renders amber banner. |
| `STATE-AUTH-06` | `STATE-AUTH-06` | Direct resolution: Middleware redirects to `/login?next={path}` to preserve deep link. |
| `STATE-DOC-01` | `STATE-DOC-01` | 1:1 Identity mapping. Skeleton card loaders during library fetch. |
| `STATE-DOC-02` | `STATE-DOC-02` | 1:1 Identity mapping. True empty library (verified 200 OK with `[]`). |
| `STATE-DOC-03` | `STATE-DOC-03` | 1:1 Identity mapping. Filter/search empty view with "Clear Filters" action. |
| `STATE-DOC-04` | `STATE-DOC-04` | Expanded into `STATE-DOC-04A` (Completed) and `STATE-DOC-04B` (In-Progress card representation). |
| `STATE-DOC-05` / `DEAD-END-01` | `STATE-DOC-05` | Direct resolution of `DEAD-END-01`: Law 1 enforced; API fetch error renders explicit red error card with retry. |
| `STATE-DOC-06` | `STATE-DOC-06` | 1:1 Identity mapping. Dangerous action deletion confirmation modal. |
| `STATE-DOC-07` | `STATE-DOC-07` | 1:1 Identity mapping. Deletion in-flight and storage-gate error handling. |
| `STATE-UPL-01` | `STATE-UPL-01` | 1:1 Identity mapping. Dropzone idle state. |
| `STATE-UPL-02` | `STATE-UPL-02` | 1:1 Identity mapping. Client-side oversized/non-PDF validation. |
| `STATE-UPL-03` | `STATE-UPL-03` | 1:1 Identity mapping. Valid PDF staged for ingestion. |
| `STATE-UPL-04` | `STATE-UPL-04` | 1:1 Identity mapping. Streaming binary upload to storage. |
| `STATE-UPL-05` | `STATE-UPL-05` | 1:1 Identity mapping. Upload failure with zero credit impact. |
| `STATE-EXT-01` | `STATE-EXT-01` | 1:1 Identity mapping. Page extraction and text density verification. |
| `STATE-EXT-02` | `STATE-EXT-02` | 1:1 Identity mapping. Scanned/raster PDF detection (`OCR_REQUIRED`). |
| `STATE-EXT-03` | `STATE-EXT-03` | 1:1 Identity mapping. Extraction failure (corrupt/encrypted PDF). |
| `STATE-ANA-01` | `STATE-ANA-01` | 1:1 Identity mapping. Automated qualification gate evaluation. |
| `STATE-ANA-02` | `STATE-ANA-02` | 1:1 Identity mapping. Ambiguous qualification gate confirmation. |
| `STATE-ANA-03` | `STATE-ANA-03` | 1:1 Identity mapping. Disqualified non-RFP with automatic credit release. |
| `STATE-ANA-04` / `DEAD-END-04` | `STATE-ANA-04` | Direct resolution of `DEAD-END-04`: Intake modal quota error embeds direct `"Upgrade Plan Now"` CTA button. |
| `STATE-ANA-05` | `STATE-ANA-05` | 1:1 Identity mapping. Analysis accepted and queued with background continuity. |
| `STATE-ANA-06` | `STATE-ANA-06` | 1:1 Identity mapping. Background polling with auto-redirect on completion. |
| `STATE-ANA-07` | `STATE-ANA-07` | 1:1 Identity mapping. Concurrent analysis conflict (HTTP 409) defense. |
| `STATE-WRK-01` | `STATE-WRK-01` | 1:1 Identity mapping. Workspace initial skeleton loading. |
| `STATE-WRK-02` | `STATE-WRK-02` | 1:1 Identity mapping. Active analysis processing screen in workspace. |
| `STATE-WRK-03` | `STATE-WRK-03` | 1:1 Identity mapping. Complete Decision Brief with verified findings. |
| `STATE-WRK-04` | `STATE-WRK-04` | 1:1 Identity mapping. Zero verified findings informational terminal state. |
| `STATE-WRK-05` | `STATE-WRK-05` | 1:1 Identity mapping. Gated Contract Exposure findings on Free/Plus tiers. |
| `STATE-WRK-06` / `DEAD-END-06` | `STATE-WRK-06` | Direct resolution of `DEAD-END-06`: Custom workspace 404 directs authenticated users to `/dashboard`. |
| `STATE-WRK-07` / `DEAD-END-02` | `STATE-WRK-07` | Direct resolution of `DEAD-END-02`: Law 1 enforced; workspace fetch failure renders explicit error card with retry. |
| `STATE-EXP-01` | `STATE-EXP-01` | 1:1 Identity mapping. Client-side JSON export download. |
| `STATE-EXP-02` | `STATE-EXP-02` | 1:1 Identity mapping. Client-side CSV export download. |
| `STATE-EXP-03` | `STATE-EXP-03` | 1:1 Identity mapping. Export button disabled when findings count is zero. |
| `STATE-BIL-01` | `STATE-BIL-01` | 1:1 Identity mapping. Free tier plan view and badge. |
| `STATE-BIL-02` | `STATE-BIL-02` | 1:1 Identity mapping. Active Plus/Pro subscription banner. |
| `STATE-BIL-03` | `STATE-BIL-03` | 1:1 Identity mapping. Subscription checkout opening state. |
| `STATE-BIL-04` | `STATE-BIL-04` | **Critical correction:** Replaced false immediate upgrade claim with "Payment setup received; awaiting authoritative activation". |
| `STATE-BIL-05` | `STATE-BIL-05` | 1:1 Identity mapping. Payment initiation failure alert. |
| `STATE-BIL-06` / `DEAD-END-05` | `STATE-BIL-06` | Direct resolution of `DEAD-END-05`: Defines self-serve cancellation UI contract in `SubscriptionView`. |
| `STATE-BIL-07` | `STATE-BIL-07` | 1:1 Identity mapping. Subscription halted / renewal failed grace period alert. |
| `STATE-ENT-01` | `STATE-ENT-01` | 1:1 Identity mapping. Quota available status badge. |
| `STATE-ENT-02` | `STATE-ENT-02` | 1:1 Identity mapping. Quota exhausted status badge and upgrade modal trigger. |
| `STATE-ENT-03` | `STATE-ENT-03` | 1:1 Identity mapping. Emergency dispatch failure with automatic credit release. |
| `STATE-NAV-01` | `STATE-NAV-01` | 1:1 Identity mapping. Global 404 page routing. |
| `STATE-NAV-02` | `STATE-NAV-02` | 1:1 Identity mapping. Global React error boundary with `reset()`. |
| `STATE-NAV-03` | `STATE-NAV-03` | 1:1 Identity mapping. Workspace document switcher dropdown. |
| `STATE-SYS-01` | `STATE-SYS-01` | 1:1 Identity mapping. Network disconnect during file upload. |
| `STATE-SYS-02` | `STATE-SYS-02` | 1:1 Identity mapping. External AI provider 5xx with automatic credit release. |
| `STATE-EML-01` (Missing) | `EMAIL-01` to `EMAIL-08` | Expanded 7 missing email events into explicit transactional notification contracts. |

---

## 5. Comprehensive State & Recovery Contracts

### Domain 01: Authentication (6 Contracts)

#### `STATE-AUTH-01`: Login Form Idle
- **Technical state:** `status = null`, `loading = false`, `email = ''`
- **RFPGround must show:** Clean split-canvas login form with email input, Google OAuth button, and verified tender evidence object preview.
- **User must understand:** Entering email sends a secure single-use magic link; Google login provides 1-click entry.
- **Available action:** Submit email or click "Google".
- **System preserves:** Clean idle state.

#### `STATE-AUTH-02`: Magic Link In Flight
- **Technical state:** `loading = true`
- **RFPGround must show:** Button spinner with text: *"Sending secure login link..."*. Form inputs disabled.
- **User must understand:** Magic link request is communicating with authentication service; duplicate submissions prevented.
- **Available action:** Wait (typically 1–2 seconds).
- **System preserves:** Typed email address in local component state.

#### `STATE-AUTH-03`: Magic Link Dispatched Successfully
- **Technical state:** `status = { type: 'success', text: '...' }`, `loading = false`
- **RFPGround must show:** Green confirmation card: *"Check your email. We sent a secure login link to {email}."* with button *"Resend link"*.
- **User must understand:** Link has been sent; valid for 15 minutes; user should check inbox and spam folders.
- **Available action:** Switch to email client. Secondary: *"Resend link"*.
- **System preserves:** Submitted email in input field.

#### `STATE-AUTH-04`: Authentication API Failure
- **Technical state:** `signInWithOtp` or `signInWithOAuth` returns error, or network throws.
- **RFPGround must show:** Red alert banner above form: *"Unable to complete sign in: {truthful reason}. Please check your connection and try again."*
- **User must understand:** Sign in attempt failed; user data and credentials remain secure.
- **Available action:** Re-check email and click "Continue". Secondary: Switch provider.
- **System preserves:** Preserves typed email in input field; re-enables inputs.

#### `STATE-AUTH-05`: Expired or Invalid Callback Token (`DEAD-END-03` Resolution)
- **Technical state:** `/auth/callback` code exchange fails, redirects to `/login?error=auth-callback-failed`.
- **RFPGround must show:** Prominent amber alert banner at top of login form: *"Your login link has expired or has already been used. Please enter your email to request a fresh link."*
- **User must understand:** Previous magic link is invalid; security session was not created.
- **Available action:** Re-enter email and click "Continue".
- **System preserves:** Clears stale error parameter on next submission.

#### `STATE-AUTH-06`: Protected Route Access Redirect
- **Technical state:** Unauthenticated request to `/dashboard` or `/documents/*` intercepted by proxy.
- **RFPGround must show:** Redirects to `/login?next={encodedPath}`.
- **User must understand:** Target workspace is private and requires authentication.
- **Available action:** Sign in via magic link or Google.
- **System preserves:** Target path preserved in `next` query parameter; redirects user directly to requested document upon successful session exchange.

---

### Domain 02: Document Library (7 Contracts)

#### `STATE-DOC-01`: Library Fetching Documents on Mount
- **Technical state:** `isLoading = true`, `documents = []`
- **RFPGround must show:** Table skeleton placeholders with text: *"Loading your tenders..."*.
- **User must understand:** System is querying database for user-owned tender records.
- **Available action:** Wait. Secondary: "Upload Tender" button remains active.
- **System preserves:** Active tab filter and search query.

#### `STATE-DOC-02`: Verified Empty Library (Zero Documents)
- **Technical state:** `isLoading = false`, `documents.length === 0`, response was 200 OK.
- **RFPGround must show:** Onboarding card: *"No tenders uploaded yet. Upload a procurement RFP (PDF) to extract clauses, evaluate mandatory criteria, and assess contract risks."*
- **User must understand:** Account currently has zero tenders; no data has been lost.
- **Available action:** Primary button: `"Upload Your First RFP"`.
- **System preserves:** Zero document state.

#### `STATE-DOC-03`: Filter Query Yields Zero Results
- **Technical state:** `filteredDocuments.length === 0`, while total `documents.length > 0`.
- **RFPGround must show:** Card: *"No tenders found matching '{query}'. Try searching for another filename or clear your active filters."*
- **User must understand:** Filter criteria excluded all documents, but documents exist in the library.
- **Available action:** Primary button: `"Clear Search & Filters"`.
- **System preserves:** Complete documents list in cache.

#### `STATE-DOC-04A`: Completed Document Cards
- **Technical state:** Document has `status = 'COMPLETED'` or `ANALYSIS_COMPLETE`.
- **RFPGround must show:** Card with filename, page count, upload time, qualification badge (`"Qualified RFP"`), green status beacon (`"Analysis Complete"`), evaluated pages counter, and blue `"Open Analysis"` button.
- **User must understand:** Document evaluation is finalized and ready for review.
- **Available action:** Click `"Open Analysis"` to view Decision Brief. Secondary: `"Delete"`.
- **System preserves:** Document record and findings.

#### `STATE-DOC-04B`: In-Progress Document Cards (Live Progress)
- **Technical state:** Document has `status = 'PROCESSING'`, `'EXTRACTING'`, or `'ANALYSING'`.
- **RFPGround must show:** Card with pulsing amber beacon (`"Analysis In Progress..."` or `"Extracting Pages..."`), and button `"View Status"`.
- **User must understand:** Document is currently undergoing automated background processing; card updates automatically when finished.
- **Available action:** Click `"View Status"` to open Queue Drawer.
- **System preserves:** Document processing state; refreshed every 5 seconds per Law 5.

#### `STATE-DOC-05`: Library Fetch Network or Server Error (`DEAD-END-01` Resolution)
- **Technical state:** `fetch('/api/documents')` returns non-200 or network throws.
- **RFPGround must show:** **Red error card (Law 1):** *"Unable to load document library. A network or server error occurred while retrieving your tenders. Your data is safe in our database."*
- **User must understand:** **A technical communication error occurred; tenders have NOT been deleted or erased.**
- **Available action:** Primary button: `"Retry Loading Tenders"`.
- **System preserves:** Preserves previous document cache if available; forbids empty library display.

#### `STATE-DOC-06`: Document Deletion Confirmation
- **Technical state:** `deletingDoc = doc`, `isDeleting = false`
- **RFPGround must show:** High-contrast modal: *"Permanently delete {filename}? This will permanently remove the uploaded file, its extracted pages, its analysis, and its evidence quotes. This action cannot be undone."*
- **User must understand:** Deletion is permanent and irreversible. Consumed quota is not refunded.
- **Available action:** Primary button (Red): `"Delete Permanently"`. Secondary: `"Cancel"`.
- **System preserves:** Document records intact until deletion is confirmed.

#### `STATE-DOC-07`: Document Deletion in Flight & Storage Gate Failure
- **Technical state:** `isDeleting = true`. If storage removal fails (HTTP 502), modal stays open with `deleteError`.
- **RFPGround must show:** Button spinner: *"Deleting permanently..."*. On error: Red alert banner: *"Deletion stopped: Storage deletion failed. The document could not be removed from secure storage, so database records were preserved. Please retry."*
- **User must understand:** Deletion was safely halted to prevent orphaned database records.
- **Available action:** Primary button: `"Retry Deletion"`. Secondary: `"Cancel"`.
- **System preserves:** Database records and storage objects guaranteed intact.

---

### Domain 03: Document Upload (5 Contracts)

#### `STATE-UPL-01`: Dropzone Idle
- **Technical state:** `stage = 'IDLE'`, `selectedFile = null`
- **RFPGround must show:** Dashed dropzone card: *"Click to select or drag and drop tender PDF. PDF format only · Maximum 10 MB"*. "Start" button disabled.
- **User must understand:** Only PDF files up to 10 MB are accepted.
- **Available action:** Select or drag/drop PDF file.
- **System preserves:** Idle intake state.

#### `STATE-UPL-02`: Client Validation Rejection (Format / Size)
- **Technical state:** Dropped file is non-PDF or `size > 10MB`.
- **RFPGround must show:** In-card red alert: *"File exceeds 10 MB limit ({size} MB). Please upload a smaller PDF."* OR *"Invalid file format. Only PDF files are supported."*
- **User must understand:** File was rejected locally before network upload; quota unaffected.
- **Available action:** Select a compliant PDF.
- **System preserves:** Resets file input cleanly.

#### `STATE-UPL-03`: Compliant PDF Staged
- **Technical state:** `selectedFile = File`, `stage = 'IDLE'`
- **RFPGround must show:** File badge: `{filename} • {size} MB • Ready for ingestion`. Blue button enabled: *"Start Tender Ingestion & Analysis"*.
- **User must understand:** File is verified and ready for upload.
- **Available action:** Click `"Start Tender Ingestion & Analysis"`. Secondary: Click dropzone to select another file.
- **System preserves:** Valid `File` object in browser memory.

#### `STATE-UPL-04`: Upload Streaming in Flight
- **Technical state:** `stage = 'UPLOADING'`, streaming to `/api/documents`.
- **RFPGround must show:** Progress spinner: *"Uploading tender document ({filename})... Please keep this window open while the file is transferring."*
- **User must understand:** PDF binary is actively uploading to secure private storage.
- **Available action:** Wait (typically 1–4 seconds).
- **Continuity:**
  - `LEAVE:` `UNSAFE` (browser aborts fetch)
  - `REFRESH:` `UNSAFE` (aborts transfer)
  - `RETURN:` `N/A`
  - `SERVER_CONTINUES:` `NO`
  - `CREDIT_STATE:` `NONE`
- **System preserves:** If interrupted, orphaned storage object is cleaned up by server.

#### `STATE-UPL-05`: Upload API Failure
- **Technical state:** POST `/api/documents` returns non-200.
- **RFPGround must show:** Red error card: *"Upload failed: {truthful error}. No analysis credits were consumed. Please check your connection and retry."*
- **User must understand:** Upload did not complete; file was not saved; zero credit deducted.
- **Available action:** Primary button: `"Retry Upload"`. Secondary: `"Select Another File"`.
- **System preserves:** Staged file in memory for immediate retry.

---

### Domain 04: Document Extraction (3 Contracts)

#### `STATE-EXT-01`: Page Text Extraction & Density Verification in Flight
- **Technical state:** `stage = 'EXTRACTING'`, calling `/api/process-document`.
- **RFPGround must show:** Active spinner: *"Extracting document pages and verifying text density... Found {N} pages. You can safely close this window; extraction will continue."*
- **User must understand:** Server is parsing page characters and evaluating text density.
- **Available action:** Wait or click `"Go to Dashboard"`.
- **Continuity:**
  - `LEAVE:` `SAFE` (server route executes up to 60s)
  - `REFRESH:` `SAFE`
  - `RETURN:` `SAFE`
  - `SERVER_CONTINUES:` `YES`
  - `CREDIT_STATE:` `NONE`
- **System preserves:** Upserts extracted pages into `document_pages` table.

#### `STATE-EXT-02`: Scanned / Raster PDF Blocked (`OCR_REQUIRED`)
- **Technical state:** >50% pages have $\le 20$ characters. Document status set to `'OCR_REQUIRED'`.
- **RFPGround must show:** Amber notice: *"OCR Required: This document contains scanned images or low-density text. RFPGround requires selectable text PDFs to extract verified evidence. Zero credits were consumed."*
- **User must understand:** Scanned PDFs cannot be verified by the character-based parser; no analysis credits were deducted.
- **Available action:** Primary button: `"Upload Selectable Text PDF"`. Secondary: `"Return to Dashboard"`.
- **System preserves:** Document record marked `OCR_REQUIRED`.

#### `STATE-EXT-03`: Text Extraction Failed (Corrupt PDF)
- **Technical state:** `/api/process-document` fails with parsing error.
- **RFPGround must show:** Red failure card: *"Document processing failed: PDF parsing error. The file may be password protected or corrupt. Zero credits were consumed."*
- **User must understand:** File could not be parsed; no analysis run was created; zero credits deducted.
- **Available action:** Primary button: `"Upload Another Tender"`. Secondary: `"Return to Dashboard"`.
- **System preserves:** Document marked `FAILED`.

---

### Domain 05: Analysis Lifecycle (7 Contracts)

#### `STATE-ANA-01`: Automated Procurement Qualification Gate in Flight
- **Technical state:** `stage = 'QUALIFYING'`, calling `/api/analyze-document`.
- **RFPGround must show:** Spinner: *"Evaluating procurement qualification... Checking if document represents a bona fide tender opportunity."*
- **User must understand:** System is verifying tender structure before deducting full analysis credit.
- **Available action:** Wait.
- **Continuity:**
  - `LEAVE:` `SAFE`
  - `REFRESH:` `SAFE`
  - `RETURN:` `SAFE`
  - `SERVER_CONTINUES:` `YES`
  - `CREDIT_STATE:` `RESERVED`
- **System preserves:** Analysis run in `PROCESSING`; entitlement ledger entry in `RESERVED`.

#### `STATE-ANA-02`: Qualification Ambiguous (`AI_AMBIGUOUS`)
- **Technical state:** Qualification gate classifies document with low confidence.
- **RFPGround must show:** Amber review card: *"Document Qualification Ambiguous: {reason}. Review candidate clauses before deciding to proceed."*
- **User must understand:** Document structure is non-standard; user confirmation required before running full extraction.
- **Available action:** Primary button: `"Confirm as Procurement Opportunity & Analyze"`. Secondary: `"Cancel & Return Credit"`.
- **System preserves:** Extracted pages and temporary reservation.

#### `STATE-ANA-03`: Disqualified Non-RFP (AI Rejected)
- **Technical state:** Qualification classifies document as non-procurement (`AI_REJECTED`). Ledger finalized to `RELEASED`.
- **RFPGround must show:** High-contrast card: *"Document Rejected as Non-Tender ({doc_type}). Reason: {reason}. Your analysis credit was returned."*
- **User must understand:** Document is not a tender (e.g. invoice, resume); credit was automatically restored; manual override is available.
- **Available action:** Primary button: `"Upload Another Tender"`. Secondary button (Black): `"Override & Analyze (Consumes 1 Credit)"`.
- **System preserves:** Previous reservation finalized to `RELEASED`. If override clicked, new reservation is created.

#### `STATE-ANA-04`: Quota Exceeded (`DEAD-END-04` Resolution)
- **Technical state:** `/api/analyze-document` returns HTTP 403 `QUOTA_EXCEEDED`.
- **RFPGround must show:** Red modal alert: *"Analysis Quota Reached. You have used all {limit} analyses for your current plan. Upgrade to unlock 15 analyses per month."* **Includes direct blue button:** `"Upgrade Plan Now"`.
- **User must understand:** Quota is exhausted; no credit was deducted; document pages are saved; user can upgrade immediately.
- **Available action:** Primary button: `"Upgrade Plan Now"` (opens `SubscriptionModal`). Secondary: `"Return to Dashboard"`.
- **System preserves:** Document preserved in `TEXT_EXTRACTED` status.

#### `STATE-ANA-05`: Analysis Accepted & Queued
- **Technical state:** `/api/analyze-document` responds with 200 `{ status: 'PROCESSING', runId: ... }`.
- **RFPGround must show:** Green card: *"Tender Accepted & Queued ({filename}). Background worker allocated. You can safely close this page or work on other tenders."*
- **User must understand:** Analysis is running asynchronously; tab does not need to stay open.
- **Available action:** Primary button: `"+ Upload Another Tender"`. Secondary: `"Go to Workspace"`.
- **Continuity:**
  - `LEAVE:` `SAFE`
  - `REFRESH:` `SAFE`
  - `RETURN:` `SAFE`
  - `SERVER_CONTINUES:` `YES`
  - `CREDIT_STATE:` `RESERVED`
- **System preserves:** Background Inngest / runner execution.

#### `STATE-ANA-06`: Polling & Auto-Transition
- **Technical state:** Intake modal polling `/api/analysis-status` every 5 seconds.
- **RFPGround must show:** Dynamic indicator: *"Analyzing tender requirements (Stage: {status})..."*. Transitions automatically to `/documents/[id]` when `COMPLETED`.
- **User must understand:** Analysis is making progress; screen will transition automatically when brief is ready.
- **Available action:** Wait or click `"Close to Background"`.
- **System preserves:** Database findings and quotes.

#### `STATE-ANA-07`: Concurrent Analysis Conflict Defense
- **Technical state:** `start_analysis_session` returns error: "An active analysis reservation already exists" (HTTP 409).
- **RFPGround must show:** Amber notice: *"An analysis run is already in progress for this document. Please monitor the active job in the Analysis Queue."*
- **User must understand:** System prevents duplicate dispatches and duplicate credit deductions.
- **Available action:** Primary button: `"Open Analysis Queue"`. Secondary: `"Dismiss"`.
- **System preserves:** Active running job and single reservation.

---

### Domain 06: Analysis Workspace (7 Contracts)

#### `STATE-WRK-01`: Workspace Initial Skeleton Loading
- **Technical state:** `isLoading = true`, `activeDocData = null`
- **RFPGround must show:** Skeleton Decision Brief with text: *"Loading Tender Intelligence... Evaluating citations & deterministic coverage"*.
- **User must understand:** Workspace is assembling findings, page quotes, and category coverage.
- **Available action:** Wait. Secondary: `"All Documents"` link in header.
- **System preserves:** Target document ID.

#### `STATE-WRK-02`: Active Processing in Workspace
- **Technical state:** Active document has `run.status === 'PROCESSING'`.
- **RFPGround must show:** Central card: *"Analysis is in progress for {filename}. Extracted {N} pages. Reviewing 12 critical procurement categories."* Pulsing header beacon (`"ANALYSING"`).
- **User must understand:** Analysis is currently executing; page will update automatically when complete.
- **Available action:** Primary button: `"Open Analysis Queue"`. Secondary: `"Back to All Documents"`.
- **Continuity:**
  - `LEAVE:` `SAFE`
  - `REFRESH:` `SAFE`
  - `RETURN:` `SAFE`
  - `SERVER_CONTINUES:` `YES`
  - `CREDIT_STATE:` `RESERVED`
- **System preserves:** Status refreshed every 5 seconds per Law 5.

#### `STATE-WRK-03`: Decision Brief (Analysis Complete)
- **Technical state:** `run.status === 'COMPLETED'`, findings loaded.
- **RFPGround must show:** Complete 4-tier Decision Brief:
  1. Dominant "What Deserves Attention" card with priority badge and verbatim page citation.
  2. Attention Lanes (01 Must Meet, 02 Could Hurt, 03 Still Unclear).
  3. Coverage Pulse strip with page examination accounting (e.g. "49 / 49 pages (100%)").
  4. Complete Findings Ledger & Coverage Audit buttons.
- **User must understand:** Tender evaluation is complete; all claims are backed by verifiable page quotes.
- **Available action:** Click any finding to inspect verbatim source page in Evidence Drawer. Secondary: Export JSON / CSV.
- **System preserves:** Immutable findings, quotes, and metrics in database.

#### `STATE-WRK-04`: Zero Verified Findings Extracted (Informational Terminal State)
- **Technical state:** `run.status === 'COMPLETED'`, `findings.length === 0`.
- **RFPGround must show:** High-contrast card: *"No Verified Findings Extracted. The tender text did not yield definitive criteria matching strict verification standards. Review the coverage audit to inspect candidate clauses."*
- **User must understand:** The document was thoroughly analyzed, but no statements met verified procurement thresholds. This is not a system error.
- **Available action:** Primary button: `"View Coverage Audit & Candidate Pages"`. Secondary: `"Return to Dashboard"`.
- **System preserves:** Complete page texts and candidate sets in database.

#### `STATE-WRK-05`: Gated Contract Exposure Findings (Free / Plus)
- **Technical state:** `userPlan !== 'PRO_GLOBAL'`, finding has `is_pro_gated === true`.
- **RFPGround must show:** Card with lock icon: *"Contractual Exposure Finding. Substantive contractual terms, uncapped liability, and indemnity risks are protected under Pro."* Verbatim quotes masked server-side.
- **User must understand:** Contractual exposure findings were detected, but viewing verbatim text requires Pro plan.
- **Available action:** Primary button: `"Upgrade to Pro to Inspect Clauses"`. Secondary: View other un-gated findings.
- **System preserves:** Masked server-side to prevent network payload leaks; unmasks dynamically when account upgrades.

#### `STATE-WRK-06`: Workspace Route Not Found (`DEAD-END-06` Resolution)
- **Technical state:** Document ID does not exist or belongs to another user (HTTP 404).
- **RFPGround must show:** Custom 404 card: *"Document Not Found. The tender you requested does not exist or you do not have permission to view it."* **Includes primary button:** `"Return to Document Library"`.
- **User must understand:** The link is invalid; user remains authenticated.
- **Available action:** Primary button: `"Return to Document Library"`. Secondary: `"Go to Home"`.
- **System preserves:** Clean authenticated session.

#### `STATE-WRK-07`: Workspace Analysis Fetch Failure (`DEAD-END-02` Resolution)
- **Technical state:** `/api/document-analysis` returns non-200.
- **RFPGround must show:** **Red error card (Law 1):** *"Unable to load analysis for this document: {truthful error}. Your tender data is safe in our database."*
- **User must understand:** **A query error occurred; the document has NOT been deleted.**
- **Available action:** Primary button: `"Retry Loading Analysis"`. Secondary: `"Return to Document Library"`.
- **System preserves:** Database records completely preserved.

---

### Domain 07: Export (3 Contracts)

#### `STATE-EXP-01`: Client-Side JSON Export
- **Technical state:** Client generates formatted JSON blob and triggers download.
- **RFPGround must show:** Browser file save dialog for `{filename}_findings.json`. Brief toast: *"Exported {N} findings to JSON"*.
- **User must understand:** Structured JSON file contains all currently authorized findings and citations.
- **Available action:** Save / open file.
- **System preserves:** Client findings array.

#### `STATE-EXP-02`: Client-Side CSV Export
- **Technical state:** Client generates RFC-4180 CSV blob and triggers download.
- **RFPGround must show:** Browser file save dialog for `{filename}_findings.csv`. Brief toast: *"Exported {N} findings to CSV"*.
- **User must understand:** Tabular spreadsheet contains categories, priorities, facts, implications, and page citations.
- **Available action:** Open in Excel / Google Sheets.
- **System preserves:** Client findings array.

#### `STATE-EXP-03`: Export Disabled on Empty/In-Progress Documents
- **Technical state:** Findings count is 0 or analysis in progress.
- **RFPGround must show:** Export button in header is disabled with tooltip: *"Exports become available once verified findings are extracted."*
- **User must understand:** Cannot export an empty or unfinished analysis.
- **Available action:** Wait for analysis completion.
- **System preserves:** Unfinished run state.

---

### Domain 08: Billing & Subscriptions (7 Contracts)

#### `STATE-BIL-01`: Free Plan State
- **Technical state:** User has no active subscription row; `plan === 'FREE'`.
- **RFPGround must show:** Header badge: `"Free • {consumed}/3 used"`. Subscription page: Free tier marked `"Current Plan"`.
- **User must understand:** User has 3 lifetime analyses; Contract Exposure findings are gated.
- **Available action:** Click `"Upgrade"` button.
- **System preserves:** Lifetime usage records in `analysis_entitlement_ledger`.

#### `STATE-BIL-02`: Plus / Pro Plan Active
- **Technical state:** `user_subscriptions.status === 'ACTIVE'`, plan is `PRO_INDIA` or `PRO_GLOBAL`.
- **RFPGround must show:** Header badge: `"Plus • {consumed}/15 this month"` or `"Pro • {consumed}/15 this month"`. Subscription page banner: *"Current Subscription: {Plan}. Renews on {date}."*
- **User must understand:** User has 15 analyses for the current billing cycle.
- **Available action:** Ingest tenders or click `"Manage Subscription"`.
- **System preserves:** Cycle dates and quota consumption counters.

#### `STATE-BIL-03`: Subscription Checkout Opening in Flight
- **Technical state:** Calling `/api/billing/create-subscription`; loading Razorpay SDK.
- **RFPGround must show:** Button spinner: *"Opening Checkout..."*. Razorpay popup appears.
- **User must understand:** Payment gateway is establishing a secure checkout session.
- **Available action:** Complete authentication in popup. Secondary: Dismiss popup.
- **System preserves:** Pre-activation row in `CREATED` status.

#### `STATE-BIL-04`: Payment Setup Received (Authoritative Activation Contract Correction)
- **Technical state:** Razorpay client checkout handler succeeds. Subscription is `AUTHENTICATED`, awaiting authoritative webhook activation.
- **RFPGround must show:** **Amber/Blue progress alert:** *"Payment setup received. We're confirming your subscription with Razorpay. Your paid plan will become active once activation is confirmed."* Button: `"Refresh Billing Status"`.
- **User must understand:** **Checkout authentication succeeded, but paid entitlement is granted only when authoritative activation is confirmed by the server.**
- **Available action:** Primary button: `"Refresh Billing Status"`. Secondary: Return to Dashboard.
- **System preserves:** Existing entitlement remains unchanged until authoritative activation event commits.

#### `STATE-BIL-05`: Payment Initiation Failure
- **Technical state:** `/api/billing/create-subscription` returns non-200 or script fails to load.
- **RFPGround must show:** Red alert banner: *"Payment initiation failed: {truthful error}. Your card was not charged. Please check your connection or try another payment method."*
- **User must understand:** Checkout session could not be established; zero funds deducted.
- **Available action:** Primary button: `"Try Again"`. Secondary: Dismiss alert.
- **System preserves:** Account remains in previous plan state.

#### `STATE-BIL-06`: Self-Serve Subscription Cancellation (`DEAD-END-05` Resolution)
- **Technical state:** Subscribed user visits `/subscription` and clicks `"Cancel Subscription"`.
- **RFPGround must show:** Confirmation modal: *"Cancel subscription renewal? Your access to {Plan} will remain active until {period_end}. After that date, your account will return to the Free plan and you will not be charged again."*
- **User must understand:** Cancellation prevents future renewal; paid access continues through paid period.
- **Available action:** Primary button (Red): `"Confirm Cancellation"`. Secondary: `"Keep Subscription"`.
- **System preserves:** Calls `/api/billing/cancel-subscription`, sets `cancel_at_period_end = true`.

#### `STATE-BIL-07`: Subscription Halted / Renewal Payment Failed
- **Technical state:** Razorpay webhook marks subscription `HALTED`.
- **RFPGround must show:** Persistent amber banner across Dashboard: *"Subscription Renewal Failed: Your recurring payment could not be processed. Please update your payment method to restore paid quota."*
- **User must understand:** Card charge failed; account is in grace period; paid analysis is temporarily paused.
- **Available action:** Primary button: `"Update Payment Method"`. Secondary: Contact Support.
- **System preserves:** Subscription ID and historical document records.

---

### Domain 09: Entitlement & Analysis Quota (3 Contracts)

#### `STATE-ENT-01`: Quota Available
- **Technical state:** `consumed < limit` in authoritative ledger.
- **RFPGround must show:** Neutral/blue pill badge: `{plan} • {consumed}/{limit} used`.
- **User must understand:** User has remaining quota to run tender analyses.
- **Available action:** Upload & analyze tenders.
- **System preserves:** Ledger consumption record.

#### `STATE-ENT-02`: Quota Exhausted
- **Technical state:** `consumed >= limit` in authoritative ledger.
- **RFPGround must show:** Red warning badge: `{plan} • {consumed}/{limit} used`. Intake modal shows upgrade prompt.
- **User must understand:** All analyses for this cycle/lifetime are consumed; new analyses blocked until upgrade or cycle reset.
- **Available action:** Primary button: `"Upgrade Plan"`.
- **System preserves:** All historical tender analyses remain fully accessible.

#### `STATE-ENT-03`: Entitlement Released (Emergency Dispatch Failure)
- **Technical state:** Pipeline dispatch fails; `finalize_analysis_entitlement(consumed=false)` commits.
- **RFPGround must show:** Red card: *"Unable to initiate analysis. Your analysis credit has been restored to your balance."*
- **User must understand:** System encountered a dispatch failure; credit was refunded automatically.
- **Available action:** Primary button: `"Retry Analysis"`. Secondary: `"Return to Dashboard"`.
- **System preserves:** Ledger record updated to `RELEASED`.

---

### Domain 10: Navigation & Routing (3 Contracts)

#### `STATE-NAV-01`: Global Route Not Found (404)
- **Technical state:** Unmatched Next.js URL route.
- **RFPGround must show:** Centered 404 page: *"404 - Page Not Found. The page you are looking for does not exist."*
- **User must understand:** URL path does not exist.
- **Available action:** For authenticated users: `"Return to Document Library"`. For visitors: `"Return Home"`.
- **System preserves:** Clean navigation state.

#### `STATE-NAV-02`: Unhandled React Error Boundary
- **Technical state:** React client rendering crash caught by `app/error.tsx`.
- **RFPGround must show:** Error card: *"An unexpected interface error occurred. Your tender data is safe."*
- **User must understand:** Interface encountered a rendering exception; database records are untouched.
- **Available action:** Primary button: `"Try Again"` (calls `reset()`). Secondary: `"Reload Application"`.
- **System preserves:** Browser state reset cleanly.

#### `STATE-NAV-03`: Workspace Document Context Switch
- **Technical state:** User selects different document in header dropdown.
- **RFPGround must show:** Dropdown updates active selection; workspace loads new findings smoothly with skeleton transitions.
- **User must understand:** Active workspace switched to selected tender without leaving the analysis interface.
- **Available action:** Inspect newly selected document findings.
- **System preserves:** Documents list in header dropdown.

---

### Domain 11: System & Network Failures (2 Contracts)

#### `STATE-SYS-01`: Network Disconnect During File Transfer
- **Technical state:** Browser network drops during PDF upload.
- **RFPGround must show:** Red error card: *"Network connection lost during file upload. No data was stored and zero credits were consumed."*
- **User must understand:** Upload was interrupted by local network drop; quota unaffected.
- **Available action:** Primary button: `"Re-upload Document"`. Secondary: Dismiss.
- **System preserves:** Clean state; prevents orphaned storage objects.

#### `STATE-SYS-02`: AI Provider Temporary Outage (DeepSeek 5xx)
- **Technical state:** Background runner catches provider 5xx/timeout; ledger finalized to `RELEASED`.
- **RFPGround must show:** Card in Queue Drawer & Library: *"Analysis Failed: AI Provider Temporary Outage. Your analysis credit was returned."*
- **User must understand:** External AI provider experienced a temporary outage; user quota was restored; job can be retried.
- **Available action:** Primary button: `"Retry Analysis"`. Secondary: `"Return to Dashboard"`.
- **System preserves:** Extracted pages preserved in database; ledger entry committed as `RELEASED`.

---

### Domain 12: Transactional Email & Notification Subsystem (8 Contracts)

In accordance with Law 6, **all email dispatch is decoupled and non-blocking**. Email sending attempts occur only after core database mutations have committed. If email sending fails, the underlying product transaction remains valid and completed.

| Email ID | Trigger Event | Recipient | Mandatory Subject | Mandatory Body Structure | Primary CTA | System Invariant |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`EMAIL-AUTH-OTP`** | Magic link requested | User email | *"Your RFPGround Login Link"* | Greeting, single-use authentication link, expiration notice (15m), security reminder. | `"Sign In to RFPGround"` | Supabase Auth native delivery. |
| **`EMAIL-ANA-DONE`** | Analysis `COMPLETED` | Document owner | *"Analysis Complete: {original_filename}"* | Tender title, page count, primary attention item highlight, qualified criteria count, direct deep link to workspace. | `"Open Decision Brief"` | Sent only after findings and quotes are committed to PostgreSQL. |
| **`EMAIL-ANA-FAIL`** | Analysis `FAILED` or AI Provider 5xx | Document owner | *"Analysis Failed: {original_filename} (Credit Restored)"* | Tender title, truthful error reason, explicit statement: *"Your analysis credit has been restored to your account"*, prompt to retry. | `"Review in RFPGround"` | **Invariant:** Dispatched ONLY after `RELEASED` ledger state has been successfully committed in PostgreSQL. |
| **`EMAIL-ANA-REJ`** | AI Disqualification (`AI_REJECTED`) | Document owner | *"Document Disqualified: {original_filename} (Credit Restored)"* | Tender title, classified document type, qualification gate reason, statement: *"Your credit was not consumed. You may upload another tender or override this decision in the workspace."* | `"View Qualification Details"` | **Invariant:** Dispatched ONLY after `RELEASED` ledger state has been successfully committed in PostgreSQL. |
| **`EMAIL-SUB-ACTV`** | Subscription activated (`subscription.activated`) | Account owner | *"Welcome to RFPGround {Plan} — Account Activated"* | Plan name, monthly analysis limit (15), renewal date, receipt amount, summary of features unlocked (e.g. Contract Exposure). | `"Go to Document Library"` | Sent only after authoritative webhook transaction commits `status = 'ACTIVE'`. |
| **`EMAIL-SUB-HALT`** | Recurring payment fails (`subscription.halted`) | Account owner | *"Urgent: Payment Failed for Your RFPGround Subscription"* | Notification of failed charge, grace period explanation, warning that paid quota is paused, instructions to update card. | `"Update Payment Method"` | Sent upon webhook processing `subscription.halted`. |
| **`EMAIL-SUB-CNCL`** | Subscription cancelled | Account owner | *"RFPGround Subscription Cancellation Scheduled"* | Confirmation that renewal has been cancelled, exact expiration date (`current_period_end`), assurance of active access until then. | `"Manage Subscription"` | Sent upon local cancellation or webhook processing. |
| **`EMAIL-QTA-WARN`** | Quota reaches 100% consumed | Account owner | *"Action Required: RFPGround Analysis Quota Exhausted"* | Current consumption (3/3 or 15/15), notice that new tenders cannot be analyzed, explanation of upgrade options. | `"Upgrade Analysis Quota"` | Sent once per cycle when `consumed == limit`. |

---

## 6. Dead-End Resolution Specification Summary

The 6 dead ends discovered in Phase 3A have **defined implementation contracts and recovery behavior specified in Phase 3B**; they will be implemented and verified in Phase 3C:

1. **`DEAD-END-01` (Library Fetch Masquerades as Empty):**  
   *Specification Resolution (`STATE-DOC-05`):* Enforces Law 1. The catch block in `DocumentLibrary.tsx` must set an explicit `fetchError` state that renders a high-contrast red error card with a `"Retry Loading Tenders"` button. Deceptive empty state display is strictly banned.
2. **`DEAD-END-02` (Workspace Fetch Masquerades as No Tender Selected):**  
   *Specification Resolution (`STATE-WRK-07`):* Enforces Law 1. If `/api/document-analysis` fails, `AnalysisWorkspace.tsx` must render an explicit error card detailing the failure with a `"Retry Loading Analysis"` button.
3. **`DEAD-END-03` (Silent Callback Token Failure):**  
   *Specification Resolution (`STATE-AUTH-05`):* `LoginPage` must inspect `useSearchParams()` for `error=auth-callback-failed` and render an amber banner informing the user that their magic link expired.
4. **`DEAD-END-04` (Quota Exceeded Missing Upgrade Action):**  
   *Specification Resolution (`STATE-ANA-04`):* The quota-exceeded error state in `DocumentIntake.tsx` must render a direct `"Upgrade Plan Now"` CTA button that opens `SubscriptionModal`.
5. **`DEAD-END-05` (Missing Self-Serve Subscription Cancellation UI):**  
   *Specification Resolution (`STATE-BIL-06`):* `SubscriptionView.tsx` must expose a `"Cancel Subscription"` button for active subscribers, opening a confirmation modal that calls `/api/billing/cancel-subscription` and informs the user their access continues until `current_period_end`.
6. **`DEAD-END-06` (404 Directs Authenticated Users to Landing Page):**  
   *Specification Resolution (`STATE-WRK-06` & `STATE-NAV-01`):* Workspace 404 cards must provide a direct `"Return to Document Library"` action for authenticated users.

---

## 7. Strict Phase 3C Scope Boundary & Roadmap

### Phase 3C Scope Boundary (Hard Rule)
> **Phase 3C must implement ONLY behavior already defined in the Phase 3B contract. Any new UX behavior, state, entitlement rule, billing behavior, or architecture change requires returning to the appropriate specification phase.**

### Prioritized 4-Sprint Implementation Plan
1. **Sprint 1: Error $\neq$ Empty & Routing Integrity**
   - Fix `DocumentLibrary.tsx` (`STATE-DOC-05`).
   - Fix `AnalysisWorkspace.tsx` (`STATE-WRK-07`).
   - Fix `LoginPage` error parameter parsing (`STATE-AUTH-05`).
   - Fix protected route redirect preserving deep-link (`STATE-AUTH-06`).
2. **Sprint 2: Background Continuity & Real-Time Polling**
   - Implement canonical 5-second background polling in `DocumentLibrary.tsx` for in-progress documents (`STATE-DOC-04B`).
   - Add background continuity messaging across intake modals (`STATE-ANA-05`).
3. **Sprint 3: Financial & Entitlement Transparency**
   - Implement self-serve cancellation modal in `SubscriptionView.tsx` (`STATE-BIL-06`).
   - Add direct `"Upgrade Plan Now"` CTA in `DocumentIntake.tsx` quota error (`STATE-ANA-04`).
   - Update `STATE-BIL-04` client UI to show "Payment setup received; awaiting authoritative activation".
   - Add explicit credit notice on `"Override & Analyze"` buttons (`STATE-ANA-03`).
4. **Sprint 4: Transactional Email Subsystem**
   - Implement decoupled, non-blocking email service using Resend.
   - Implement templates for `EMAIL-ANA-DONE`, `EMAIL-ANA-FAIL`, `EMAIL-ANA-REJ`, `EMAIL-SUB-ACTV`, `EMAIL-SUB-HALT`, `EMAIL-SUB-CNCL`, and `EMAIL-QTA-WARN`.
   - Wire email dispatch to Inngest completion events and Razorpay webhook processor.

---

## 8. Verification & Compliance Checklist

- [x] State count corrected: Phase 3A's 38 discovery states expanded into **53 actionable state contracts** and **8 notification contracts**.
- [x] State Traceability Matrix added mapping all 38 Phase 3A items to Phase 3B contracts.
- [x] `STATE-BIL-04` corrected: `AUTHENTICATED` state does *not* grant paid entitlement until server-authoritative activation commits.
- [x] Dead ends accurately designated as **contractually specified for implementation in Phase 3C**.
- [x] Polling interval contradiction resolved: exactly one canonical 5-second background status refresh policy defined (Law 5).
- [x] Non-success states differentiated between recoverable failures and informational terminal states (Law 4).
- [x] Standard `LEAVE` / `REFRESH` / `RETURN` / `SERVER_CONTINUES` / `CREDIT_STATE` semantics contracted for async operations.
- [x] Transactional email decoupled: email dispatch never determines or blocks underlying database transactions (Law 6).
- [x] Email credit-restoration wording strictly conditioned upon committed `RELEASED` ledger state.
- [x] Strict Phase 3C implementation boundary established.
- [x] Zero production application code, database schema, or APIs modified during Phase 3B specification.

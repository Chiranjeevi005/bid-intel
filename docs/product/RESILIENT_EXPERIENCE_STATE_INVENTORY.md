# RFPGround SaaS — Resilient Experience System: Phase 3A Product State Inventory
**Document ID:** `docs/product/RESILIENT_EXPERIENCE_STATE_INVENTORY.md`  
**Phase:** Phase 3A (Discovery and Documentation Only)  
**Product Principle:** *"No Dead Ends. No Silent Failures. No Unclear States."*  
**Scope:** Complete evidence-based audit of all user-facing states across the current RFPGround codebase.

---

## 1. Executive Summary

This document is the Phase 3A product state inventory for RFPGround SaaS. In accordance with Phase 3 instructions, this audit is **discovery and documentation only**. No application code, database migrations, API routes, or user interface components have been modified.

RFPGround is an automated tender qualification and contract exposure intelligence platform. Across Phases 1, 2A, 2B, and 2C, rigorous backend architectures were completed:
- **Phase 2A:** Hardened database schema, transactional entitlement ledgers (`analysis_entitlement_ledger`), strict row-level security, and quota isolation (`start_analysis_session` and `finalize_analysis_entitlement` RPCs).
- **Phase 2B:** Deterministic analysis dispatch with atomic Compare-and-Swap (CAS) claiming, Inngest durable queuing with background pipeline runner fallback, and automated emergency credit release upon dispatch failure.
- **Phase 2C:** Atomic Razorpay subscription webhook lifecycle processing, replay defense, watermark validation, and server-side Contract Exposure finding sanitization for unpaid tiers.

While the underlying systems are resilient and truthful at the database and API layer, the **frontend user experience layer contains significant gaps in asynchronous communication, recovery paths, notification routing, and error transparency**. Users encounter situations where async operations run in the background without persistent progress notifications, where failures display generic technical messages or dismiss into empty views, where manual overrides lack credit impact clarity, and where **zero transactional emails exist** for any lifecycle event.

---

## 2. Current Architecture Relevant to Resilient UX

### 2.1 Route Guarding & Authentication
- **Proxy/Middleware:** [`proxy.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/proxy.ts) calls [`lib/supabase/middleware.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/supabase/middleware.ts).
  - Unauthenticated requests to `/dashboard` or `/documents/*` redirect to `/login`.
  - Authenticated requests visiting `/login` redirect to `/dashboard`.
  - Direct routes `/dashboard` ([`app/dashboard/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/dashboard/page.tsx)) and `/documents/[documentId]` ([`app/documents/[documentId]/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/documents/[documentId]/page.tsx)) enforce server-side user checks.
- **Anti-Enumeration Ownership Check:**
  - Route `/documents/[documentId]` checks `user_id = user.id`. If missing or foreign, executes `notFound()` (Next.js 404).

### 2.2 Document Intake, Extraction, and Analysis Pipeline
- **Upload:** [`app/api/documents/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/documents/route.ts) POST accepts multipart PDF (<= 10MB), uploads to Supabase storage bucket `rfps` under `{userId}/{uuid}.pdf`, and inserts a record in `documents` table with status `'UPLOADED'`.
- **Extraction:** [`app/api/process-document/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/process-document/route.ts) POST downloads PDF from storage, parses text pages via `pdf-parse`, assesses page density, and sets document status to `'TEXT_EXTRACTED'`, `'OCR_REQUIRED'`, or `'FAILED'`.
- **Analysis Dispatch:** [`app/api/analyze-document/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analyze-document/route.ts) calls PostgreSQL RPC `start_analysis_session`. On success, atomically claims run via CAS, dispatches to Inngest (`rfp.analysis.requested`), and falls back to local runner [`lib/pipeline/runner.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/pipeline/runner.ts).
- **Entitlement Accounting:**
  - `start_analysis_session` inserts a `'RESERVED'` record in `analysis_entitlement_ledger`.
  - `executeAnalysisPipeline` calls `safeFinalizeEntitlement` which invokes `finalize_analysis_entitlement`:
    - On success: updates ledger status to `'CONSUMED'`.
    - On AI rejection / failure: updates ledger status to `'RELEASED'`.
- **Polling & Workspace Refresh:**
  - In intake modal: [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) polls `/api/analysis-status?runId=...` every 2500ms.
  - In workspace: [`components/workspace/AnalysisWorkspace.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx) polls `/api/analysis-queue` every 3000ms.
  - In document library: [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) only fetches once on mount and on modal completion (`fetchDocuments()`); does not auto-poll in the background.

### 2.3 Billing & Subscription Architecture
- Razorpay subscription integration managed via [`app/api/billing/create-subscription/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/create-subscription/route.ts) and [`lib/billing/webhook-processor.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/billing/webhook-processor.ts).
- Status checked via [`app/api/billing/status/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/status/route.ts).
- Plans: `FREE` (3 lifetime analyses), `PRO_INDIA` / Plus (15 analyses/cycle, ₹499/mo), `PRO_GLOBAL` / Pro (15 analyses/cycle, ₹999/mo with Contract Exposure findings unmasked).

---

## 3. Comprehensive State Inventory

### Domain 01: Authentication

#### STATE-AUTH-01: Login Form Idle
- **State ID:** `STATE-AUTH-01`
- **Domain:** Authentication
- **User journey:** Visitor -> Sign in
- **Technical state:** `status = null`, `loading = false`, `email = ''`
- **User-facing state:** Clean operational split-canvas screen with email input and Google OAuth option.
- **Trigger:** Navigating to `/login` or being redirected from a protected route.
- **Current UI:** [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L74-L228)
- **Current message:** *"Welcome back. Enter your workspace."*
- **Primary action:** Enter email & click "Continue" or click "Google".
- **Secondary action:** Support / Legal top links.
- **Can retry:** N/A (idle).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`app/(auth)/login/page.tsx:L74-L228`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L74-L228)
- **Status:** `IMPLEMENTED`

#### STATE-AUTH-02: Magic Link Sending
- **State ID:** `STATE-AUTH-02`
- **Domain:** Authentication
- **User journey:** Sign in -> Magic Link submit
- **Technical state:** `loading = true`
- **User-facing state:** Button spinner with "Sending..." label.
- **Trigger:** Submitting valid email in login form.
- **Current UI:** [`app/(auth)/login/page.tsx:L190-L198`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L190-L198)
- **Current message:** *"Sending..."*
- **Primary action:** Wait for API response (button disabled).
- **Secondary action:** None.
- **Can retry:** No while in flight.
- **Can leave page:** Yes (aborts client wait).
- **Can refresh:** Yes.
- **Data preserved:** Input retained unless unmounted.
- **Credit/payment impact:** None.
- **Email triggered:** Supabase Auth system email (configured via Supabase backend).
- **Recovery path:** Wait for response.
- **Terminal state:** No.
- **Evidence:** [`app/(auth)/login/page.tsx:L25-L48`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L25-L48)
- **Status:** `IMPLEMENTED`

#### STATE-AUTH-03: Magic Link Sent Success
- **State ID:** `STATE-AUTH-03`
- **Domain:** Authentication
- **User journey:** Sign in -> Magic Link confirmation
- **Technical state:** `status = { type: 'success', text: 'Check your email for the login link.' }`, `loading = false`
- **User-facing state:** Green banner with checkmark indicating magic link dispatched. Form re-enables.
- **Trigger:** Supabase `signInWithOtp` resolves with no error.
- **Current UI:** [`app/(auth)/login/page.tsx:L143-L158`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L143-L158)
- **Current message:** *"Check your email for the login link."*
- **Primary action:** User switches to email client to click magic link.
- **Secondary action:** User can enter another email and submit again.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes (resets state to idle).
- **Data preserved:** Email field retains value.
- **Credit/payment impact:** None.
- **Email triggered:** Supabase OTP email.
- **Recovery path:** Check spam folder or resend.
- **Terminal state:** No.
- **Evidence:** [`app/(auth)/login/page.tsx:L41`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L41)
- **Status:** `IMPLEMENTED`

#### STATE-AUTH-04: Magic Link / Google Auth Error
- **State ID:** `STATE-AUTH-04`
- **Domain:** Authentication
- **User journey:** Sign in -> Authentication failure
- **Technical state:** `status = { type: 'error', text: '...' }`, `loading = false`
- **User-facing state:** Red alert banner above form with specific or generic error text.
- **Trigger:** `signInWithOtp` or `signInWithOAuth` returns error, or client network throws.
- **Current UI:** [`app/(auth)/login/page.tsx:L143-L158`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L143-L158)
- **Current message:** *"Authentication failed. Please check your email and try again."* OR *"Google authentication failed. Please try again."* OR *"A network error occurred. Please try again."*
- **Primary action:** Re-check email and click Continue again.
- **Secondary action:** Switch to Google login or vice versa.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Email field preserved.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Re-enter email or try alternative provider.
- **Terminal state:** No.
- **Evidence:** [`app/(auth)/login/page.tsx:L39, L44, L65, L69`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L39-L69)
- **Status:** `IMPLEMENTED`

#### STATE-AUTH-05: OAuth Callback Code Exchange Error
- **State ID:** `STATE-AUTH-05`
- **Domain:** Authentication
- **User journey:** Auth Callback -> Redirect
- **Technical state:** `searchParams.get('code')` missing or `exchangeCodeForSession` fails.
- **User-facing state:** Redirects to `/login?error=auth-callback-failed`.
- **Trigger:** Expired token, invalid OAuth redirect, or missing code param.
- **Current UI:** [`app/auth/callback/route.ts:L35`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts#L35) redirects to `/login`. Note: [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx) **does not read the `error` query param** from the URL!
- **Current message:** **NONE**. The login page displays its standard idle state; the `auth-callback-failed` query parameter is completely ignored by the client component.
- **Primary action:** Try logging in again without knowing why it failed.
- **Secondary action:** None.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** None.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** User re-attempts login.
- **Terminal state:** No.
- **Evidence:** [`app/auth/callback/route.ts:L35`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts#L35) vs [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx) (no `useSearchParams` check).
- **Status:** `PARTIALLY_IMPLEMENTED` (Silent Failure / Lost error state).

#### STATE-AUTH-06: Unauthenticated Protected Route Access
- **State ID:** `STATE-AUTH-06`
- **Domain:** Authentication / Navigation
- **User journey:** Visitor -> Direct URL access to `/dashboard` or `/documents/*`
- **Technical state:** `!user && isProtected` in proxy/middleware; redirects to `/login`.
- **User-facing state:** Immediate browser redirect to `/login`.
- **Trigger:** Navigating to protected route without session cookies.
- **Current UI:** Login page. Note: Middleware redirect does not append `?next=` return URL parameter.
- **Current message:** Standard login welcome message.
- **Primary action:** Sign in.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Target intended destination URL is lost (middleware does not add `?next=`).
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Sign in -> Lands on default `/dashboard` rather than deep linked document.
- **Terminal state:** No.
- **Evidence:** [`lib/supabase/middleware.ts:L38-L46`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/supabase/middleware.ts#L38-L46)
- **Status:** `PARTIALLY_IMPLEMENTED` (Lost deep link context).

---

### Domain 02: Document Library

#### STATE-DOC-01: Document Library Initial Loading
- **State ID:** `STATE-DOC-01`
- **Domain:** Document Library
- **User journey:** Dashboard -> Library load
- **Technical state:** `isLoading = true`, `documents = []`
- **User-facing state:** Centered card with blue spinner: "Loading Document Library... Fetching verified tender records".
- **Trigger:** Mount of [`DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx).
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L330-L339`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L330-L339)
- **Current message:** *"Loading Document Library... Fetching verified tender records"*
- **Primary action:** Wait.
- **Secondary action:** Click "Upload Tender" button in header.
- **Can retry:** Refresh page.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Reload page.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L330-L339`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L330-L339)
- **Status:** `IMPLEMENTED`

#### STATE-DOC-02: Document Library Empty (Zero Documents)
- **State ID:** `STATE-DOC-02`
- **Domain:** Document Library
- **User journey:** Dashboard -> No documents uploaded
- **Technical state:** `isLoading = false`, `documents.length === 0`, `searchQuery = ''`
- **User-facing state:** Empty card with document icon: "No documents in this view", descriptive text, and a primary blue button: "Upload Your First RFP".
- **Trigger:** API `/api/documents` returns `{ documents: [] }`.
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L341-L362`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L341-L362)
- **Current message:** *"No documents in this view. Get started by uploading a Request for Proposal (RFP) to extract findings and verify requirements."*
- **Primary action:** "Upload Your First RFP" (opens intake modal).
- **Secondary action:** None.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Click upload button.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L341-L362`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L341-L362)
- **Status:** `IMPLEMENTED`

#### STATE-DOC-03: Search / Tab Filter Yields No Results
- **State ID:** `STATE-DOC-03`
- **Domain:** Document Library
- **User journey:** Dashboard -> Filter documents
- **Technical state:** `filteredDocuments.length === 0`, `searchQuery.length > 0` or active filter tab empty.
- **User-facing state:** Empty card: "No matching documents found". Does not show upload button if search query is active.
- **Trigger:** Search term matches no filename, qualification reason, or document type.
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L346-L352`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L346-L352)
- **Current message:** *"No matching documents found. No tender matched '{query}'. Try searching for another filename or qualification status."*
- **Primary action:** Clear search bar or change tab.
- **Secondary action:** None.
- **Can retry:** Yes (type different query).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Input query.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Clear search input.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L346-L352`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L346-L352)
- **Status:** `IMPLEMENTED`

#### STATE-DOC-04: Documents Available & Rendered
- **State ID:** `STATE-DOC-04`
- **Domain:** Document Library
- **User journey:** Dashboard -> View list
- **Technical state:** `filteredDocuments.length > 0`
- **User-facing state:** List of cards showing filename, page count, relative upload time, qualification badge, operational status tag, document summary preview, primary action button ("Open Analysis", "Review Qualification", "Review Intake", "View Error", "View Status"), and red "Delete" button.
- **Trigger:** Successful fetch of user documents.
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L364-L553`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L364-L553)
- **Current message:** Dynamic per document.
- **Primary action:** Open document workspace.
- **Secondary action:** Delete document.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Yes.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L364-L553`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L364-L553)
- **Status:** `IMPLEMENTED`

#### STATE-DOC-05: Document Fetch Failure
- **State ID:** `STATE-DOC-05`
- **Domain:** Document Library
- **User journey:** Dashboard -> Library network failure
- **Technical state:** `fetch('/api/documents')` throws or returns `!res.ok`. `isLoading` set to `false`.
- **User-facing state:** **Empty library state is rendered!** The catch block only logs `console.error('Failed to fetch document library:', err)` and leaves `documents = []`.
- **Trigger:** Network disconnect, 500 internal server error, or unauthorized session.
- **Current UI:** Renders empty state card: *"No documents in this view. Get started by uploading a Request for Proposal (RFP)..."*.
- **Current message:** No error message is displayed to the user. An error looks identical to an empty account!
- **Primary action:** None indicating error. User sees misleading "Upload Your First RFP".
- **Secondary action:** None.
- **Can retry:** Manual browser refresh.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** None.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** None provided in UI.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L70-L78`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L70-L78)
- **Status:** `MISSING` (Silent Failure: Network error rendered as zero documents).

#### STATE-DOC-06: Permanent Document Deletion Confirmation
- **State ID:** `STATE-DOC-06`
- **Domain:** Document Library
- **User journey:** Dashboard -> Click Delete on document card
- **Technical state:** `deletingDoc = doc`, `isDeleting = false`, `deleteError = null`
- **User-facing state:** High-contrast modal warning: "DELETE DOCUMENT? This will permanently delete: the uploaded file ({filename}), its extracted pages, its analysis, its evidence. This action cannot be undone."
- **Trigger:** User clicks Delete on a document item.
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L591-L685`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L591-L685)
- **Current message:** *"This will permanently delete: the uploaded file... its extracted pages... its analysis... its evidence. This action cannot be undone."*
- **Primary action:** "Delete permanently" (red button).
- **Secondary action:** "Cancel" or "X" button.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes (closes modal, preserves document).
- **Data preserved:** Document intact until confirmed.
- **Credit/payment impact:** None. Consumed quota is **not** refunded upon manual document deletion.
- **Email triggered:** None.
- **Recovery path:** Cancel closes modal.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L591-L685`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L591-L685)
- **Status:** `IMPLEMENTED`

#### STATE-DOC-07: Permanent Document Deletion in Flight & Error
- **State ID:** `STATE-DOC-07`
- **Domain:** Document Library
- **User journey:** Dashboard -> Confirm delete
- **Technical state:** In flight: `isDeleting = true`. On error: `isDeleting = false`, `deleteError = string`.
- **User-facing state:** Spinner with "Deleting permanently...". If server returns error (e.g. storage deletion gate fails), modal stays open with red alert banner showing exact server error message.
- **Trigger:** DELETE `/api/documents/[documentId]` returns non-200.
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L647-L652, L673-L681`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L647-L681)
- **Current message:** Error banner: *"Error: {deleteError}"*.
- **Primary action:** Retry deletion or Cancel.
- **Secondary action:** Close modal.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Data guaranteed preserved on backend error.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Retry or cancel.
- **Terminal state:** No.
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L85-L111, L647-L652`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L85-L111)
- **Status:** `IMPLEMENTED`

---

### Domain 03: Document Upload

#### STATE-UPL-01: Intake Idle / Dropzone Ready
- **State ID:** `STATE-UPL-01`
- **Domain:** Document Upload
- **User journey:** Upload Modal -> Idle
- **Technical state:** `stage = 'IDLE'`, `selectedFile = null`, `errorMessage = null`
- **User-facing state:** Modal containing dropzone: "Click to select or drag and drop tender PDF. PDF format only · Maximum 10 MB". Primary button "Start Tender Ingestion & Analysis" is disabled.
- **Trigger:** Opening upload modal from library or clicking "New Tender" in workspace header.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L285-L348`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L285-L348)
- **Current message:** *"Click to select or drag and drop tender PDF · PDF format only · Maximum 10 MB"*
- **Primary action:** Select file.
- **Secondary action:** Cancel / Close modal.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L285-L348`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L285-L348)
- **Status:** `IMPLEMENTED`

#### STATE-UPL-02: Invalid File Format or Oversized File Selected
- **State ID:** `STATE-UPL-02`
- **Domain:** Document Upload
- **User journey:** File selection validation
- **Technical state:** `stage = 'IDLE'`, `errorMessage = string`, `selectedFile = null`
- **User-facing state:** Red error banner inside the intake card.
- **Trigger:** User drops non-PDF file or PDF exceeding 10 MB.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L54-L67, L278-L283`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L54-L67)
- **Current message:** *"Invalid file format. Only PDF documents are supported."* OR *"File exceeds 10 MB limit ({size} MB). Please upload a smaller PDF."*
- **Primary action:** Select a valid file.
- **Secondary action:** Close modal.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Rejected file not loaded.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** User selects valid PDF file.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L54-L67`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L54-L67)
- **Status:** `IMPLEMENTED`

#### STATE-UPL-03: Valid File Staged
- **State ID:** `STATE-UPL-03`
- **Domain:** Document Upload
- **User journey:** File selected -> Ready to upload
- **Technical state:** `stage = 'IDLE'`, `selectedFile = File`, `errorMessage = null`
- **User-facing state:** Dropzone updates to display filename and size: `"{name} · {size} MB · Ready for analysis"`. "Start Tender Ingestion & Analysis" button becomes enabled.
- **Trigger:** Valid PDF selected.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L317-L325, L340-L346`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L317-L346)
- **Current message:** `"{name} · {size} MB · Ready for analysis"`
- **Primary action:** Click "Start Tender Ingestion & Analysis".
- **Secondary action:** Click dropzone to select a different file.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Local state in memory.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L317-L325`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L317-L325)
- **Status:** `IMPLEMENTED`

#### STATE-UPL-04: Uploading in Flight
- **State ID:** `STATE-UPL-04`
- **Domain:** Document Upload
- **User journey:** Ingestion pipeline start
- **Technical state:** `stage = 'UPLOADING'`, `statusMessage = 'Uploading PDF...'`
- **User-facing state:** Central card with spinning loader: "Uploading Tender Document... Uploading PDF...".
- **Trigger:** Calling POST `/api/documents` with FormData.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L351-L372`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L351-L372)
- **Current message:** *"Uploading Tender Document... Uploading PDF..."*
- **Primary action:** Wait for upload to complete.
- **Secondary action:** None (Close button hidden during upload).
- **Can retry:** No while in flight.
- **Can leave page:** Yes (cancels browser fetch; server may or may not complete write).
- **Can refresh:** Yes (aborts client connection).
- **Data preserved:** If fetch aborts, orphaned record cleanup is attempted in `/api/documents`.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** If connection drops, user returns to idle on reload.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L77-L100`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L77-L100)
- **Status:** `IMPLEMENTED`

#### STATE-UPL-05: Upload Server Failure
- **State ID:** `STATE-UPL-05`
- **Domain:** Document Upload
- **User journey:** Upload -> API failure
- **Technical state:** `stage = 'FAILED'`, `errorMessage = err.message`
- **User-facing state:** Red error card: "Processing Failed", filename, error explanation, and two buttons: "Upload Another Document" and "Retry Analysis".
- **Trigger:** POST `/api/documents` returns non-200 or throws network error.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L528-L576`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L528-L576)
- **Current message:** *"Processing Failed. {errorMessage}"*
- **Primary action:** "Upload Another Document" (resets to IDLE).
- **Secondary action:** "Retry Analysis" (NOTE: if upload itself failed, `docId` is null, so "Retry Analysis" button is hidden).
- **Can retry:** Yes via "Upload Another Document".
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** None.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Click "Upload Another Document".
- **Terminal state:** Yes (until user resets).
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L89-L92, L528-L576`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L89-L92)
- **Status:** `IMPLEMENTED`

---

### Domain 04: Document Extraction

#### STATE-EXT-01: Text Extraction & Density Evaluation in Flight
- **State ID:** `STATE-EXT-01`
- **Domain:** Document Extraction
- **User journey:** Upload success -> Extracting pages
- **Technical state:** `stage = 'EXTRACTING'`, `statusMessage = 'Extracting document pages and verifying text density...'`
- **User-facing state:** Spinning loader: "Extracting Document Pages... Extracting document pages and verifying text density...". If pages received, shows badge `{N} Pages Extracted`.
- **Trigger:** Invoking POST `/api/process-document` with `document_id`.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L351-L372`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L351-L372)
- **Current message:** *"Extracting Document Pages... Extracting document pages and verifying text density..."*
- **Primary action:** Wait.
- **Secondary action:** None.
- **Can retry:** No while in flight.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Document row exists in DB (`status = 'PROCESSING'`). If user leaves, backend continues processing for up to 60s.
- **Credit/payment impact:** None (no entitlement reserved yet).
- **Email triggered:** None.
- **Recovery path:** If page is refreshed, user lands back on library where document shows "Extracting Document Pages...".
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L103-L125`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L103-L125)
- **Status:** `IMPLEMENTED`

#### STATE-EXT-02: OCR Required (Scanned / Raster PDF Blocked)
- **State ID:** `STATE-EXT-02`
- **Domain:** Document Extraction
- **User journey:** Extraction -> Low density scanned PDF detected
- **Technical state:** `stage = 'OCR_REQUIRED'`, `processData.status === 'OCR_REQUIRED'`
- **User-facing state:** Yellow amber alert card: "OCR Required. This document contains scanned image pages or extremely low text density. The current text extractor yielded insufficient character data. Optical Character Recognition (OCR) is required before this document can be analyzed."
- **Trigger:** `/api/process-document` detects >50% pages have <=20 characters.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L415-L431`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L415-L431)
- **Current message:** *"OCR Required. This document contains scanned image pages or extremely low text density..."*
- **Primary action:** "Select Another Document" (resets intake to IDLE).
- **Secondary action:** None.
- **Can retry:** Cannot retry current file (blocked; no built-in OCR engine).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Document row remains in database with status `'OCR_REQUIRED'`.
- **Credit/payment impact:** Zero credit consumed.
- **Email triggered:** None.
- **Recovery path:** User must upload a selectable text PDF.
- **Terminal state:** Yes for this document.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L120-L124, L415-L431`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L120-L431)
- **Status:** `IMPLEMENTED`

#### STATE-EXT-03: Extraction Failed
- **State ID:** `STATE-EXT-03`
- **Domain:** Document Extraction
- **User journey:** Extraction -> Parsing error / corrupt PDF
- **Technical state:** `stage = 'FAILED'`, `errorMessage = 'Text extraction failed.'`
- **User-facing state:** Red failure card: "Processing Failed", filename, error message, "Upload Another Document" button.
- **Trigger:** `/api/process-document` returns 400 or 500.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L528-L576`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L528-L576)
- **Current message:** *"Processing Failed. Text extraction failed."*
- **Primary action:** "Upload Another Document".
- **Secondary action:** None (since `status !== 'TEXT_EXTRACTED'`, retry button will fail if clicked).
- **Can retry:** Through re-uploading.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Document marked `'FAILED'` in database.
- **Credit/payment impact:** Zero credit consumed.
- **Email triggered:** None.
- **Recovery path:** Upload an intact PDF.
- **Terminal state:** Yes.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L112-L115`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L112-L115)
- **Status:** `IMPLEMENTED`

---

### Domain 05: Analysis Lifecycle

#### STATE-ANA-01: Evaluating Procurement Qualification
- **State ID:** `STATE-ANA-01`
- **Domain:** Analysis
- **User journey:** Extraction complete -> Qualification gate
- **Technical state:** `stage = 'QUALIFYING'`, `statusMessage = 'Evaluating procurement qualification gate...'`
- **User-facing state:** Spinner: "Evaluating Procurement Qualification... Evaluating procurement qualification gate...".
- **Trigger:** Automated call to POST `/api/analyze-document`.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L138-L140, L351-L372`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L138-L372)
- **Current message:** *"Evaluating Procurement Qualification... Evaluating procurement qualification gate..."*
- **Primary action:** Wait.
- **Secondary action:** None.
- **Can retry:** No while in flight.
- **Can leave page:** Yes (session is already reserved on backend).
- **Can refresh:** Yes.
- **Data preserved:** Entitlement reserved in ledger.
- **Credit/payment impact:** Credit temporarily reserved in ledger (`status = 'RESERVED'`).
- **Email triggered:** None.
- **Recovery path:** Return later to dashboard or queue.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L138-L148`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L138-L148)
- **Status:** `IMPLEMENTED`

#### STATE-ANA-02: Document Qualification Ambiguous
- **State ID:** `STATE-ANA-02`
- **Domain:** Analysis
- **User journey:** Analysis -> Qualification check uncertain
- **Technical state:** `stage = 'AMBIGUOUS_CONFIRMATION'`, `ambiguityReason = string`
- **User-facing state:** Amber warning card: "Document Qualification Ambiguous. The automated qualification gate classified this document with low confidence. Reason: {ambiguityReason}".
- **Trigger:** `/api/analyze-document` or polling `/api/analysis-status` returns `status === 'AMBIGUOUS'` or `AI_AMBIGUOUS`.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L434-L463`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L434-L463)
- **Current message:** *"Document Qualification Ambiguous. The automated qualification gate classified this document with low confidence. Reason: {ambiguityReason}"*
- **Primary action:** "Confirm as Procurement Opportunity & Proceed" (blue button).
- **Secondary action:** "Cancel" (white button, resets intake).
- **Can retry:** Yes (user override).
- **Can leave page:** Yes.
- **Can refresh:** Yes (lands in document library where document card shows "Ambiguous Tender" and "Review Intake" button).
- **Data preserved:** Document and pages preserved.
- **Credit/payment impact:** If user proceeds, reserved credit will be consumed on completion. If cancelled, previous session was released.
- **Email triggered:** None.
- **Recovery path:** User confirms or uploads another tender.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L180-L185, L434-L463`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L180-L463)
- **Status:** `IMPLEMENTED`

#### STATE-ANA-03: Document Rejected (Non-RFP Detected)
- **State ID:** `STATE-ANA-03`
- **Domain:** Analysis
- **User journey:** Analysis -> Document is not a tender (invoice, resume, brochure)
- **Technical state:** `stage = 'REJECTED'`, `ambiguityReason = string`
- **User-facing state:** Red card with Ban icon: "Document Rejected. This document was identified as a non-procurement document (such as an internal resume, invoice, brochure, or marketing material) and cannot be processed as a tender. Reason: {reason}".
- **Trigger:** Qualification classifies document as non-RFP with high confidence.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L466-L525`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L466-L525)
- **Current message:** *"Document Rejected... Reason: {reason}"*
- **Primary action:** "Upload Another Document".
- **Secondary action:** "Override & Analyze" (black button, calls `triggerAnalysis(docId, true)`).
- **Can retry:** Yes (manual override).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Document record marked `qualification_status = 'AI_REJECTED'`.
- **Credit/payment impact:** Entitlement ledger released (`status = 'RELEASED'`). **Zero credit consumed**. If user clicks "Override & Analyze", a new session is reserved.
- **Email triggered:** None.
- **Recovery path:** Upload valid document or override.
- **Terminal state:** No (override available).
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L173-L178, L466-L525`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L173-L525)
- **Status:** `IMPLEMENTED`

#### STATE-ANA-04: Quota Exceeded (Free or Paid)
- **State ID:** `STATE-ANA-04`
- **Domain:** Analysis / Entitlement
- **User journey:** Analysis dispatch -> Limit reached
- **Technical state:** `/api/analyze-document` returns HTTP 403 with `code === 'QUOTA_EXCEEDED'`.
- **User-facing state:** Intake resets to `IDLE` and displays red banner: *"Analysis quota exceeded. Please upgrade to a paid plan for 15 analyses per month."*
- **Trigger:** `start_analysis_session` RPC detects FREE lifetime consumed >= 3 or PRO cycle consumed >= 15.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L153-L157, L278-L283`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L153-L283)
- **Current message:** *"Analysis quota exceeded. Please upgrade to a paid plan for 15 analyses per month."*
- **Primary action:** None directly in the error banner (user must manually navigate to Plans & Pricing or click BillingBadge).
- **Secondary action:** None.
- **Can retry:** Cannot analyze until upgrade or next cycle.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Document preserved in `'TEXT_EXTRACTED'` status.
- **Credit/payment impact:** No credit consumed. User blocked from analyzing.
- **Email triggered:** None.
- **Recovery path:** Navigate to `/subscription` to upgrade.
- **Terminal state:** Yes until account upgrades.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L153-L157`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L153-L157)
- **Status:** `PARTIALLY_IMPLEMENTED` (Missing direct upgrade button inside modal error banner).

#### STATE-ANA-05: Analysis Accepted & Queued Asynchronously
- **State ID:** `STATE-ANA-05`
- **Domain:** Analysis
- **User journey:** Analysis dispatched -> Background processing
- **Technical state:** `stage = 'ACCEPTED'`, `runId = string`
- **User-facing state:** Green success notification card: "Tender Accepted & Queued. {filename}. The document has been queued for analysis in the background. You can continue working, upload another tender, or inspect the analysis queue."
- **Trigger:** `/api/analyze-document` responds with 200 `{ status: 'PROCESSING', runId: ... }`.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L374-L412`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L374-L412)
- **Current message:** *"Tender Accepted & Queued. The document has been queued for analysis in the background. You can continue working, upload another tender, or inspect the analysis queue."*
- **Primary action:** "+ Upload Another Tender" (resets intake modal to upload next).
- **Secondary action:** "Go to Workspace" (navigates to `/documents/[documentId]`).
- **Can retry:** N/A.
- **Can leave page:** Yes (explicitly informed that work continues).
- **Can refresh:** Yes.
- **Data preserved:** Document processing in Inngest / background runner.
- **Credit/payment impact:** 1 analysis reserved.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L374-L412`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L374-L412)
- **Status:** `IMPLEMENTED`

#### STATE-ANA-06: Analysis Polling in Background & Auto-Redirect
- **State ID:** `STATE-ANA-06`
- **Domain:** Analysis
- **User journey:** Waiting inside intake modal
- **Technical state:** `pollAnalysisStatus` running interval every 2500ms against `/api/analysis-status`.
- **User-facing state:** If user stays on modal, `onAnalysisComplete(docId)` fires upon `status === 'COMPLETED'`, which automatically navigates user to `/documents/[documentId]`.
- **Trigger:** Polling resolves with `COMPLETED`.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L201-L251`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L201-L251)
- **Current message:** None (immediate route push).
- **Primary action:** User enters workspace.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Complete findings in database.
- **Credit/payment impact:** Ledger finalized to `'CONSUMED'`.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** Yes (transition to Workspace).
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L221-L224`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L221-L224)
- **Status:** `IMPLEMENTED`

#### STATE-ANA-07: Concurrent Analysis Conflict
- **State ID:** `STATE-ANA-07`
- **Domain:** Analysis
- **User journey:** Duplicate dispatch
- **Technical state:** `start_analysis_session` returns error starting with "An active analysis reservation already exists". HTTP 409 `CONCURRENT_ANALYSIS`.
- **User-facing state:** Red error banner: *"An analysis job is already in progress for this document."*
- **Trigger:** Multiple rapid clicks on Analyze or simultaneous dispatch requests.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L278-L283`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L278-L283)
- **Current message:** *"An analysis job is already in progress for this document."*
- **Primary action:** Close modal or check Queue Drawer.
- **Secondary action:** None.
- **Can retry:** No (must wait for active job to finish).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** In-progress run is protected.
- **Credit/payment impact:** No double reservation.
- **Email triggered:** None.
- **Recovery path:** Open Analysis Queue Drawer to monitor active run.
- **Terminal state:** No.
- **Evidence:** [`app/api/analyze-document/route.ts:L97-L103`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analyze-document/route.ts#L97-L103)
- **Status:** `IMPLEMENTED`

---

### Domain 06: Analysis Workspace

#### STATE-WRK-01: Initial Workspace Loading
- **State ID:** `STATE-WRK-01`
- **Domain:** Analysis Workspace
- **User journey:** Navigate to `/documents/[documentId]`
- **Technical state:** `isLoading = true`, `activeDocData = null`
- **User-facing state:** Centered spinner with message: "Loading Tender Intelligence... Evaluating citations & deterministic coverage".
- **Trigger:** Loading workspace for a specific document ID.
- **Current UI:** [`components/workspace/AnalysisWorkspace.tsx:L404-L413`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L404-L413)
- **Current message:** *"Loading Tender Intelligence... Evaluating citations & deterministic coverage"*
- **Primary action:** Wait.
- **Secondary action:** Back to "All Documents" via header.
- **Can retry:** Refresh page.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Return to dashboard.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/AnalysisWorkspace.tsx:L404-L413`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L404-L413)
- **Status:** `IMPLEMENTED`

#### STATE-WRK-02: Active Processing in Workspace
- **State ID:** `STATE-WRK-02`
- **Domain:** Analysis Workspace
- **User journey:** Returning to a document while background analysis is running
- **Technical state:** `activeDocData.document.status === 'PROCESSING' || activeDocData.run?.status === 'PROCESSING'`
- **User-facing state:** Card with blue spinner: "Analysis is being prepared. {filename} is currently undergoing AI segmentation, evidence extraction, and deterministic verification. Status: Processing pages & evidence candidates". Header operational beacon pulses "ANALYSING".
- **Trigger:** Opening workspace for a document whose analysis run is still active.
- **Current UI:** [`components/workspace/AnalysisWorkspace.tsx:L463-L476`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L463-L476)
- **Current message:** *"Analysis is being prepared. {filename} is currently undergoing AI segmentation, evidence extraction, and deterministic verification. Status: Processing pages & evidence candidates"*
- **Primary action:** None on screen. User must wait or open Analysis Queue Drawer.
- **Secondary action:** Navigate away via "All Documents".
- **Can retry:** N/A.
- **Can leave page:** Yes (work continues in background).
- **Can refresh:** Yes.
- **Data preserved:** In-flight job running.
- **Credit/payment impact:** Reserved.
- **Email triggered:** None.
- **Recovery path:** Check queue drawer or return later.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/AnalysisWorkspace.tsx:L463-L476`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L463-L476)
- **Status:** `IMPLEMENTED`

#### STATE-WRK-03: Decision Brief (Qualified Tender with Findings)
- **State ID:** `STATE-WRK-03`
- **Domain:** Analysis Workspace
- **User journey:** Review Workspace -> Complete Findings Available
- **Technical state:** `activeDocData` loaded, `run.status === 'COMPLETED'`, findings partitioned into lanes.
- **User-facing state:** Complete 3-stage intelligence screen:
  1. **Attention Brief:** Dominant "What Deserves Attention" card with priority badge, quote, and operational implication; followed by 3 Attention Lanes (01 Must Meet, 02 Could Hurt, 03 Still Unclear).
  2. **Coverage Pulse:** 12-category summary strip with page examination accounting (e.g. "49 / 49 pages (100%)", covered/review required counts).
  3. **Bottom Action Strip:** "Complete Findings Ledger & Domain Filters" with buttons to open Coverage Audit modal or Full Findings Ledger.
- **Trigger:** Document analysis completed successfully.
- **Current UI:** [`components/workspace/AnalysisWorkspace.tsx:L478-L532`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L478-L532)
- **Current message:** High-density structured procurement findings.
- **Primary action:** Inspect finding evidence.
- **Secondary action:** Export JSON / CSV, open Queue Drawer, or switch document.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Completely persisted.
- **Credit/payment impact:** Credit consumed (`'CONSUMED'`).
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** Yes (operational goal reached).
- **Evidence:** [`components/workspace/AnalysisWorkspace.tsx:L478-L532`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L478-L532)
- **Status:** `IMPLEMENTED`

#### STATE-WRK-04: Zero Findings Extracted
- **State ID:** `STATE-WRK-04`
- **Domain:** Analysis Workspace
- **User journey:** Review Workspace -> Document completed with 0 findings
- **Technical state:** `findings.length === 0`, `coverage = null` or all empty.
- **User-facing state:** Centered card: "No Verified Findings Extracted. No verified procurement findings were produced from the available evidence in this document. Review the coverage audit to inspect candidate pages and unverified clauses." Button: "View Coverage Audit".
- **Trigger:** Document parsed but LLM extracted no confirmed clauses matching strict quotation verification.
- **Current UI:** [`components/workspace/AttentionBrief.tsx:L39-L60`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AttentionBrief.tsx#L39-L60)
- **Current message:** *"No Verified Findings Extracted. No verified procurement findings were produced from the available evidence in this document..."*
- **Primary action:** "View Coverage Audit".
- **Secondary action:** None.
- **Can retry:** Re-trigger analysis via queue drawer if desired.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Page text preserved.
- **Credit/payment impact:** Credit consumed (pipeline finished).
- **Email triggered:** None.
- **Recovery path:** Inspect candidate pages in coverage audit.
- **Terminal state:** Yes.
- **Evidence:** [`components/workspace/AttentionBrief.tsx:L39-L60`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AttentionBrief.tsx#L39-L60)
- **Status:** `IMPLEMENTED`

#### STATE-WRK-05: Gated Contract Exposure (Free / Plus Tier)
- **State ID:** `STATE-WRK-05`
- **Domain:** Analysis Workspace / Billing
- **User journey:** Review Workspace -> Inspect Contract Risk
- **Technical state:** `userPlan !== 'PRO_GLOBAL'`, `f.is_pro_gated === true`
- **User-facing state:** Finding rendered with lock icon: "Contractual Exposure Finding. Substantive contractual finding details and risk exposure analysis are protected under the Pro plan." Quotes are redacted server-side. Clicking item opens `SubscriptionModal`.
- **Trigger:** Free or Plus user views liability, indemnification, penalty, or termination findings.
- **Current UI:** [`components/workspace/FindingsLedger.tsx:L285-L330`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/FindingsLedger.tsx#L285-L330) and [`components/workspace/AttentionBrief.tsx:L316-L352`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AttentionBrief.tsx#L316-L352)
- **Current message:** *"Substantive contractual finding details and risk exposure analysis are protected under the Pro plan. Upgrade to Pro to inspect verbatim clauses and liability exposure."*
- **Primary action:** "Upgrade to Pro" button.
- **Secondary action:** Dismiss modal.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Findings exist in DB; unmasked dynamically when upgraded to Pro.
- **Credit/payment impact:** None until upgrade.
- **Email triggered:** None.
- **Recovery path:** Upgrade to Pro Plan via Razorpay.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/FindingsLedger.tsx:L285-L330`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/FindingsLedger.tsx#L285-L330)
- **Status:** `IMPLEMENTED`

#### STATE-WRK-06: Non-Existent or Foreign Document Workspace Route
- **State ID:** `STATE-WRK-06`
- **Domain:** Analysis Workspace / Navigation
- **User journey:** Direct URL access to `/documents/invalid-id`
- **Technical state:** `app/documents/[documentId]/page.tsx` checks DB; record missing or `user_id !== user.id`. Calls Next.js `notFound()`.
- **User-facing state:** Next.js 404 page: "404 - The page you are looking for does not exist. Return Home".
- **Trigger:** Tampered URL, deleted document route, or foreign user document.
- **Current UI:** [`app/not-found.tsx:L1-L21`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/not-found.tsx#L1-L21)
- **Current message:** *"404 - The page you are looking for does not exist."*
- **Primary action:** "Return Home" (redirects to `/`).
- **Secondary action:** None (does not offer "Return to Document Library").
- **Can retry:** No.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Click "Return Home" and navigate to dashboard.
- **Terminal state:** Yes.
- **Evidence:** [`app/documents/[documentId]/page.tsx:L33-L36`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/documents/%5BdocumentId%5D/page.tsx#L33-L36)
- **Status:** `IMPLEMENTED`

#### STATE-WRK-07: Document Analysis API Error
- **State ID:** `STATE-WRK-07`
- **Domain:** Analysis Workspace
- **User journey:** Open document workspace -> API fails
- **Technical state:** `fetch(/api/document-analysis?documentId=...)` returns non-200. `activeDocData` remains null, `isLoading` set to `false`.
- **User-facing state:** Fallback empty screen: "No Tender Document Selected. Upload your first procurement tender document to run automated extraction." Button: "Ingest New Tender PDF".
- **Trigger:** Internal server error, database timeout, or temporary network failure during document data fetch.
- **Current UI:** [`components/workspace/AnalysisWorkspace.tsx:L644-L659`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L644-L659)
- **Current message:** *"No Tender Document Selected. Upload your first procurement tender document to run automated extraction."*
- **Primary action:** "Ingest New Tender PDF".
- **Secondary action:** None.
- **Can retry:** No direct retry button.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Database data unaffected.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Manual page refresh.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/AnalysisWorkspace.tsx:L187-L200, L644-L659`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L187-L659)
- **Status:** `MISSING` (Silent Failure: Server error masquerades as "No Document Selected").

---

### Domain 07: Export

#### STATE-EXP-01: Export Findings to JSON (Client-Side)
- **State ID:** `STATE-EXP-01`
- **Domain:** Export
- **User journey:** Workspace Header -> Export -> JSON
- **Technical state:** Pure client-side `Blob` creation and programmatic `<a>` download.
- **User-facing state:** Browser download dialog triggered immediately for `{filename}_findings.json`.
- **Trigger:** User clicks "Export" -> "JSON Findings" in header.
- **Current UI:** [`components/workspace/WorkspaceHeader.tsx:L180-L187`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/WorkspaceHeader.tsx#L180-L187) calling [`lib/export/findings-export.ts:L3-L33`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/export/findings-export.ts#L3-L33)
- **Current message:** Native browser download notification.
- **Primary action:** Save / open file.
- **Secondary action:** None.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Re-click export.
- **Terminal state:** Yes.
- **Evidence:** [`lib/export/findings-export.ts:L3-L33`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/export/findings-export.ts#L3-L33)
- **Status:** `IMPLEMENTED` (Client-side).

#### STATE-EXP-02: Export Findings to CSV (Client-Side)
- **State ID:** `STATE-EXP-02`
- **Domain:** Export
- **User journey:** Workspace Header -> Export -> CSV
- **Technical state:** Pure client-side RFC-4180 CSV generation and programmatic `<a>` download.
- **User-facing state:** Browser download dialog triggered immediately for `{filename}_findings.csv`.
- **Trigger:** User clicks "Export" -> "CSV Findings" in header.
- **Current UI:** [`components/workspace/WorkspaceHeader.tsx:L188-L195`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/WorkspaceHeader.tsx#L188-L195) calling [`lib/export/findings-export.ts:L35-L80`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/export/findings-export.ts#L35-L80)
- **Current message:** Native browser download notification.
- **Primary action:** Save / open file.
- **Secondary action:** None.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Re-click export.
- **Terminal state:** Yes.
- **Evidence:** [`lib/export/findings-export.ts:L35-L80`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/export/findings-export.ts#L35-L80)
- **Status:** `IMPLEMENTED` (Client-side).

#### STATE-EXP-03: Export Button Unavailable
- **State ID:** `STATE-EXP-03`
- **Domain:** Export
- **User journey:** Workspace Header with in-progress or zero findings document
- **Technical state:** `activeDocData && activeDocData.findings.length > 0 ? handleExportJSON : undefined`
- **User-facing state:** The "Export" dropdown button is completely removed from the header.
- **Trigger:** Document has 0 findings or is currently processing.
- **Current UI:** [`components/workspace/AnalysisWorkspace.tsx:L391-L392`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L391-L392)
- **Current message:** None (button simply absent).
- **Primary action:** None.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Wait for analysis completion.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/WorkspaceHeader.tsx:L168-L199`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/WorkspaceHeader.tsx#L168-L199)
- **Status:** `IMPLEMENTED`

---

### Domain 08: Billing & Subscriptions

#### STATE-BIL-01: Free Tier State
- **State ID:** `STATE-BIL-01`
- **Domain:** Billing
- **User journey:** Dashboard / Pricing inspection
- **Technical state:** `billing.plan === 'FREE'`, `billing.limit === 3`
- **User-facing state:**
  - Header badge: `"Free • {consumed}/3 used"` with blue `"Upgrade"` button.
  - Subscription page: Free tier marked `"Current Plan"`.
- **Trigger:** User has no active subscription row in `user_subscriptions`.
- **Current UI:** [`components/billing/BillingBadge.tsx:L49-L72`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L49-L72) and [`components/billing/SubscriptionView.tsx:L215-L260`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L215-L260)
- **Current message:** `"Free • {consumed}/3 used"`
- **Primary action:** "Upgrade" button (opens SubscriptionModal).
- **Secondary action:** "Plans & Pricing" navigation link.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Yes.
- **Credit/payment impact:** 3 lifetime analyses.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/billing/BillingBadge.tsx:L49-L72`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L49-L72)
- **Status:** `IMPLEMENTED`

#### STATE-BIL-02: Plus / Pro Active Tier State
- **State ID:** `STATE-BIL-02`
- **Domain:** Billing
- **User journey:** Dashboard / Pricing inspection
- **Technical state:** `billing.status === 'ACTIVE'`, `billing.plan === 'PRO_INDIA' | 'PRO_GLOBAL'`, `billing.limit === 15`
- **User-facing state:**
  - Header badge: Blue pill `"Plus • {consumed}/15 this month"` or `"Pro • {consumed}/15 this month"`.
  - Subscription page: Top active banner with renewal date (`"Cycle renews on {date}"`). Pricing card button disabled and labelled `"Active Plan"`.
- **Trigger:** Active row in `user_subscriptions`.
- **Current UI:** [`components/billing/BillingBadge.tsx:L50-L62`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L50-L62) and [`components/billing/SubscriptionView.tsx:L188-L210`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L188-L210)
- **Current message:** *"You have used {consumed} of 15 analyses for the current billing cycle. Cycle renews on {date}."*
- **Primary action:** Continue bidding.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Yes.
- **Credit/payment impact:** 15 monthly cycle quota.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/billing/SubscriptionView.tsx:L188-L210`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L188-L210)
- **Status:** `IMPLEMENTED`

#### STATE-BIL-03: Subscription Payment Initiation in Flight
- **State ID:** `STATE-BIL-03`
- **Domain:** Billing
- **User journey:** Subscription Modal / View -> Click Upgrade
- **Technical state:** `actionLoading === plan` or `isLoading === true`.
- **User-facing state:** Button spinner: "Opening Checkout...". Dynamically injects Razorpay Checkout SDK script and opens checkout modal.
- **Trigger:** Clicking "Upgrade to Plus" or "Upgrade to Pro".
- **Current UI:** [`components/billing/SubscriptionView.tsx:L328-L333`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L328-L333) and [`components/billing/SubscriptionModal.tsx:L47-L88`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionModal.tsx#L47-L88)
- **Current message:** *"Opening Checkout..."*
- **Primary action:** Complete payment in Razorpay modal.
- **Secondary action:** Dismiss Razorpay modal.
- **Can retry:** No while in flight.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Subscription row in `CREATED` status on backend.
- **Credit/payment impact:** Payment pending.
- **Email triggered:** None from RFPGround (Razorpay sends merchant receipt).
- **Recovery path:** If dismissed, resets to idle.
- **Terminal state:** No.
- **Evidence:** [`components/billing/SubscriptionView.tsx:L47-L107`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L47-L107)
- **Status:** `IMPLEMENTED`

#### STATE-BIL-04: Subscription Authenticated / Activating Account
- **State ID:** `STATE-BIL-04`
- **Domain:** Billing
- **User journey:** Payment success in Razorpay popup
- **Technical state:** `handler` callback fired from Razorpay. `success = 'Subscription authenticated! Activating your account...'`.
- **User-facing state:** Green success alert: "Subscription authenticated! Activating your account...". Modal auto-closes after 1500ms and re-fetches billing status.
- **Trigger:** Razorpay client payment authorized.
- **Current UI:** [`components/billing/SubscriptionModal.tsx:L71-L76`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionModal.tsx#L71-L76) and [`components/billing/SubscriptionView.tsx:L90-L95`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L90-L95)
- **Current message:** *"Subscription authenticated! Activating your account..."*
- **Primary action:** Wait for status refresh.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes (webhook activates backend independently).
- **Can refresh:** Yes.
- **Data preserved:** Backend webhook processes `subscription.activated`.
- **Credit/payment impact:** Quota reset to 15 for new cycle.
- **Email triggered:** None from RFPGround.
- **Recovery path:** Status re-fetched after 1.5s.
- **Terminal state:** Yes (upgraded).
- **Evidence:** [`components/billing/SubscriptionView.tsx:L90-L95`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L90-L95)
- **Status:** `IMPLEMENTED`

#### STATE-BIL-05: Payment Initiation Failure
- **State ID:** `STATE-BIL-05`
- **Domain:** Billing
- **User journey:** Click upgrade -> Network / Server error
- **Technical state:** `/api/billing/create-subscription` returns non-200 or script fails to load. `error = string`.
- **User-facing state:** Red alert banner: "Payment initiation failed." with dismiss 'X'.
- **Trigger:** Network failure, missing Razorpay credentials, or user already subscribed.
- **Current UI:** [`components/billing/SubscriptionView.tsx:L168-L174`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L168-L174)
- **Current message:** Red banner with error text.
- **Primary action:** Dismiss error and re-try.
- **Secondary action:** None.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** Zero payment charged.
- **Email triggered:** None.
- **Recovery path:** Dismiss and retry.
- **Terminal state:** No.
- **Evidence:** [`components/billing/SubscriptionView.tsx:L108-L113`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L108-L113)
- **Status:** `IMPLEMENTED`

#### STATE-BIL-06: Subscription Cancellation Scheduled at Period End
- **State ID:** `STATE-BIL-06`
- **Domain:** Billing
- **User journey:** Subscription management
- **Technical state:** `cancel_at_period_end === true`, `status === 'ACTIVE'`.
- **User-facing state:** Handled in backend API [`app/api/billing/cancel-subscription/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/cancel-subscription/route.ts). **However, there is NO cancel button in the UI!** Neither [`SubscriptionView.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx) nor [`SubscriptionModal.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionModal.tsx) exposes a "Cancel Subscription" button or cancellation UI.
- **Trigger:** API route `/api/billing/cancel-subscription` called directly.
- **Current UI:** **NONE**. Missing from frontend user interface.
- **Current message:** None.
- **Primary action:** None available in UI.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Backend preserves access through period end.
- **Credit/payment impact:** Future renewal stopped.
- **Email triggered:** None.
- **Recovery path:** User cannot cancel self-serve through the UI; must contact support.
- **Terminal state:** No.
- **Evidence:** Grep of `cancel-subscription` across `components/` yields 0 matches. Route exists at [`app/api/billing/cancel-subscription/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/cancel-subscription/route.ts).
- **Status:** `MISSING` in UI (Backend API implemented, UI trigger absent).

#### STATE-BIL-07: Subscription Halted / Payment Pending
- **State ID:** `STATE-BIL-07`
- **Domain:** Billing
- **User journey:** Webhook marks subscription HALTED
- **Technical state:** `status === 'HALTED'`.
- **User-facing state:** When `/api/billing/status` returns `status: 'HALTED'`, `SubscriptionView.tsx` evaluates `isPro = false` (since `status !== 'ACTIVE'`). The user falls back to Free plan UI with consumed quota calculated against Free tier. No specific "Payment Halted / Update Card" banner is rendered.
- **Trigger:** Recurring payment charge failure via Razorpay webhook.
- **Current UI:** [`components/billing/SubscriptionView.tsx:L116`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L116)
- **Current message:** Generic Free tier message.
- **Primary action:** Upgrade again.
- **Secondary action:** None.
- **Can retry:** Re-subscribe.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Past document records preserved.
- **Credit/payment impact:** Paid quota locked.
- **Email triggered:** None.
- **Recovery path:** User must re-subscribe.
- **Terminal state:** No.
- **Evidence:** [`app/api/billing/status/route.ts:L44-L70`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/status/route.ts#L44-L70)
- **Status:** `PARTIALLY_IMPLEMENTED` (Degrades to Free silently without explaining why subscription halted).

---

### Domain 09: Entitlement & Analysis Quota

#### STATE-ENT-01: Available Quota
- **State ID:** `STATE-ENT-01`
- **Domain:** Entitlement
- **User journey:** Dashboard / Workspace Header
- **Technical state:** `consumed < limit`
- **User-facing state:** Billing badge shows neutral / blue styling: `"Free • 1/3 used"` or `"Plus • 4/15 this month"`.
- **Trigger:** Status API returns `consumed < limit`.
- **Current UI:** [`components/billing/BillingBadge.tsx:L49-L62`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L49-L62)
- **Current message:** `"{plan} • {consumed}/{limit} {period}"`
- **Primary action:** Ingest and analyze tenders.
- **Secondary action:** Upgrade (if on Free).
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** Quota available.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/billing/BillingBadge.tsx:L49-L62`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L49-L62)
- **Status:** `IMPLEMENTED`

#### STATE-ENT-02: Quota Full / Exhausted
- **State ID:** `STATE-ENT-02`
- **Domain:** Entitlement
- **User journey:** Dashboard / Workspace Header
- **Technical state:** `consumed >= limit`
- **User-facing state:** Billing badge turns red: `"Free • 3/3 used"` with light red background and red border.
- **Trigger:** `consumed >= limit`.
- **Current UI:** [`components/billing/BillingBadge.tsx:L52-L54`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L52-L54)
- **Current message:** `"{plan} • {consumed}/{limit} {period}"` (in red badge).
- **Primary action:** "Upgrade" button next to badge.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** Blocked from starting new analyses.
- **Email triggered:** None.
- **Recovery path:** Upgrade plan or await next billing cycle.
- **Terminal state:** No.
- **Evidence:** [`components/billing/BillingBadge.tsx:L52-L54`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L52-L54)
- **Status:** `IMPLEMENTED`

#### STATE-ENT-03: Entitlement Reservation & Release (Emergency Failure)
- **State ID:** `STATE-ENT-03`
- **Domain:** Entitlement
- **User journey:** Analysis Dispatch failure
- **Technical state:** Inngest dispatch fails AND local runner throws. `safeFinalizeEntitlement` called with `consumed = false`.
- **User-facing state:** Intake error banner: *"Unable to initiate background analysis. Entitlement reservation was successfully released."*
- **Trigger:** `analyze-document` catches fatal dispatch failure and executes emergency release.
- **Current UI:** [`app/api/analyze-document/route.ts:L298-L302`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analyze-document/route.ts#L298-L302) rendered via intake error state.
- **Current message:** *"Unable to initiate background analysis. Entitlement reservation was successfully released."*
- **Primary action:** Try again.
- **Secondary action:** None.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Document intact.
- **Credit/payment impact:** Quota completely restored (`'RELEASED'`).
- **Email triggered:** None.
- **Recovery path:** Re-try analysis.
- **Terminal state:** Yes.
- **Evidence:** [`app/api/analyze-document/route.ts:L298-L302`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analyze-document/route.ts#L298-L302)
- **Status:** `IMPLEMENTED`

---

### Domain 10: Navigation & Routing

#### STATE-NAV-01: Global 404 Route
- **State ID:** `STATE-NAV-01`
- **Domain:** Navigation
- **User journey:** Visitor / User navigates to non-existent route
- **Technical state:** Next.js route unmatched or `notFound()` called.
- **User-facing state:** Clean centered card: "404 - The page you are looking for does not exist. Return Home".
- **Trigger:** Arbitrary unmatched URL path.
- **Current UI:** [`app/not-found.tsx:L1-L21`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/not-found.tsx#L1-L21)
- **Current message:** *"404 - The page you are looking for does not exist."*
- **Primary action:** "Return Home" (`/`).
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** N/A.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Navigate home.
- **Terminal state:** Yes.
- **Evidence:** [`app/not-found.tsx:L1-L21`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/not-found.tsx#L1-L21)
- **Status:** `IMPLEMENTED`

#### STATE-NAV-02: Global Root Error Boundary
- **State ID:** `STATE-NAV-02`
- **Domain:** Navigation / System
- **User journey:** Unhandled React rendering exception
- **Technical state:** Next.js App Router error boundary caught.
- **User-facing state:** Centered card: "Something went wrong. An unexpected error occurred. Please try again." Button: "Try again".
- **Trigger:** Unhandled exception in client React component tree.
- **Current UI:** [`app/error.tsx:L1-L33`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/error.tsx#L1-L33)
- **Current message:** *"Something went wrong. An unexpected error occurred. Please try again."*
- **Primary action:** "Try again" (calls `reset()`).
- **Secondary action:** None.
- **Can retry:** Yes (`reset()`).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** In-memory state reset.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Click Try again or reload page.
- **Terminal state:** No.
- **Evidence:** [`app/error.tsx:L1-L33`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/error.tsx#L1-L33)
- **Status:** `IMPLEMENTED`

#### STATE-NAV-03: Workspace Document Switcher
- **State ID:** `STATE-NAV-03`
- **Domain:** Navigation
- **User journey:** Inside `/documents/[documentId]` -> Switch document via header dropdown
- **Technical state:** Select dropdown change triggers `handleSelectDocument(id)`: updates `activeDocId` and calls `router.push('/documents/${id}')`.
- **User-facing state:** Dropdown updates active selection, closes any open drawers (evidence, ledger, coverage), loads new document analysis.
- **Trigger:** User selects different tender in header dropdown.
- **Current UI:** [`components/workspace/WorkspaceHeader.tsx:L91-L104`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/WorkspaceHeader.tsx#L91-L104) and [`components/workspace/AnalysisWorkspace.tsx:L330-L337`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L330-L337)
- **Current message:** Dropdown displays active document filename.
- **Primary action:** Select document.
- **Secondary action:** "All Documents" link back to library.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Yes.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** N/A.
- **Terminal state:** No.
- **Evidence:** [`components/workspace/AnalysisWorkspace.tsx:L330-L337`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L330-L337)
- **Status:** `IMPLEMENTED`

---

### Domain 11: System & Network Failures

#### STATE-SYS-01: Network Failure During File Upload
- **State ID:** `STATE-SYS-01`
- **Domain:** System
- **User journey:** Upload PDF -> Network drops
- **Technical state:** `fetch('/api/documents')` throws `TypeError: Failed to fetch`. Caught in catch block.
- **User-facing state:** Stage set to `FAILED`. Red error card: "Processing Failed. Failed to fetch".
- **Trigger:** Lost internet connection during upload.
- **Current UI:** [`components/workspace/DocumentIntake.tsx:L130-L133, L528-L576`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L130-L576)
- **Current message:** *"Processing Failed. Failed to fetch"*
- **Primary action:** "Upload Another Document".
- **Secondary action:** None.
- **Can retry:** Yes (re-select file).
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Local file must be re-selected.
- **Credit/payment impact:** None.
- **Email triggered:** None.
- **Recovery path:** Re-connect to internet and upload file.
- **Terminal state:** Yes.
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L130-L133`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L130-L133)
- **Status:** `IMPLEMENTED`

#### STATE-SYS-02: LLM Service Failure / AI Provider 5xx
- **State ID:** `STATE-SYS-02`
- **Domain:** System / Analysis
- **User journey:** Analysis processing -> DeepSeek API 5xx/timeout
- **Technical state:** Background runner catches error, updates `analysis_runs.status = 'FAILED'`, `last_error = err.message`. Safe finalization releases entitlement (`status = 'RELEASED'`).
- **User-facing state:**
  - In Document Library: card shows red badge `"Analysis Failed ({last_error})"`. Action button: `"View Error"`.
  - In Queue Drawer: job listed under Failed/Action Required with last error message and `"Retry Analysis"` button.
  - In Polling modal: displays red card `"Processing Failed. {error}"`.
- **Trigger:** AI provider outage or rate-limit ceiling.
- **Current UI:** [`components/dashboard/DocumentLibrary.tsx:L470-L482`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L470-L482) and [`components/workspace/AnalysisQueueDrawer.tsx:L215-L255`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisQueueDrawer.tsx#L215-L255)
- **Current message:** Dynamic error description from provider or runner.
- **Primary action:** "Retry Analysis".
- **Secondary action:** View details.
- **Can retry:** Yes.
- **Can leave page:** Yes.
- **Can refresh:** Yes.
- **Data preserved:** Pages preserved in database.
- **Credit/payment impact:** Entitlement released (`'RELEASED'`). **Zero credit consumed**.
- **Email triggered:** None.
- **Recovery path:** Click "Retry Analysis" from queue drawer.
- **Terminal state:** No.
- **Evidence:** [`lib/pipeline/runner.ts:L525-L538`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/pipeline/runner.ts#L525-L538)
- **Status:** `IMPLEMENTED`

---

### Domain 12: Email & Notifications

#### STATE-EML-01: Transactional Emails for Lifecycle Events
- **State ID:** `STATE-EML-01`
- **Domain:** Email / Notifications
- **User journey:** All user journeys (Sign up, Document upload, Analysis complete, Analysis failed, Quota exhausted, Payment success, Payment failure)
- **Technical state:** Search across entire codebase for email service providers (`resend`, `nodemailer`, `sendgrid`, `postmark`, `ses`) reveals **ZERO email sending code or templates**.
- **User-facing state:** **NO EMAILS ARE EVER SENT TO USERS**.
- **Trigger:** Lifecycle events occur silently without email notifications.
- **Current UI:** None.
- **Current message:** None.
- **Primary action:** None.
- **Secondary action:** None.
- **Can retry:** N/A.
- **Can leave page:** N/A.
- **Can refresh:** N/A.
- **Data preserved:** N/A.
- **Credit/payment impact:** User receives no email receipt for consumed credits or successful payments.
- **Email triggered:** **NONE**.
- **Recovery path:** None.
- **Terminal state:** N/A.
- **Evidence:** Global grep of codebase for `resend` and `email` yields zero transactional mailers or email sending functions. Only Supabase Auth built-in OTP email is handled externally by Supabase.
- **Status:** `MISSING` across the entire application.

---

## 4. Loading State Inventory

| Location | Operation | Current Loading UI | Communicates What is Happening? | Communicates Duration/Expectation? | Can User Leave? | Persistent After Refresh? | Failure Fallback? | Recovery Action? | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`app/loading.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/loading.tsx) | Next.js route transition | Full-screen spinner + `"Loading..."` | No (generic) | No | Yes | No | None | None | `PARTIALLY_IMPLEMENTED` | [`app/loading.tsx:L1-L11`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/loading.tsx#L1-L11) |
| [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx) | Magic link dispatch | Button spinner + `"Sending..."` | Yes ("Sending...") | No | Yes | No | Reset on error | Resubmit form | `IMPLEMENTED` | [`login/page.tsx:L193`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L193) |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | Fetching user documents | Centered card + spinner: `"Loading Document Library... Fetching verified tender records"` | Yes | No | Yes | Yes (re-triggers fetch) | Silent empty state fallback (flaw) | Browser reload | `PARTIALLY_IMPLEMENTED` | [`DocumentLibrary.tsx:L330-L339`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L330-L339) |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | Permanent document deletion | Button spinner: `"Deleting permanently..."` (disabled buttons) | Yes | No | No (modal blocks) | Yes | Modal displays red error banner | Close or Retry | `IMPLEMENTED` | [`DocumentLibrary.tsx:L675-L681`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L675-L681) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | PDF upload to Supabase storage | Modal spinner: `"Uploading Tender Document... Uploading PDF..."` | Yes | No | Yes | No | Catches error -> `stage = 'FAILED'` | Upload Another Document | `IMPLEMENTED` | [`DocumentIntake.tsx:L351-L372`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L351-L372) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Text extraction & density evaluation | Modal spinner: `"Extracting Document Pages... Extracting document pages and verifying text density..."` | Yes | No | Yes | Document row preserved | Catches error -> `stage = 'FAILED'` | Upload Another Document | `IMPLEMENTED` | [`DocumentIntake.tsx:L351-L372`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L351-L372) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Procurement qualification evaluation | Modal spinner: `"Evaluating Procurement Qualification... Evaluating procurement qualification gate..."` | Yes | No | Yes | Document row preserved | Catches error -> `stage = 'FAILED'` | Upload Another Document | `IMPLEMENTED` | [`DocumentIntake.tsx:L351-L372`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L351-L372) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | In-progress background analysis polling | Dynamic message: `"Analysing document pages (Stage: {status})..."` | Yes | No | Yes | Run continues in Inngest | Shows error message if run fails | Retry analysis | `IMPLEMENTED` | [`DocumentIntake.tsx:L245`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L245) |
| [`components/workspace/AnalysisWorkspace.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx) | Initial workspace load | Centered spinner: `"Loading Tender Intelligence... Evaluating citations & deterministic coverage"` | Yes | No | Yes | Yes (re-triggers fetch) | Silent empty workspace fallback (flaw) | Return to Dashboard | `PARTIALLY_IMPLEMENTED` | [`AnalysisWorkspace.tsx:L404-L413`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L404-L413) |
| [`components/workspace/AnalysisWorkspace.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx) | Document processing in workspace | Centered spinner: `"Analysis is being prepared. {filename} is currently undergoing AI segmentation..."` | Yes | No | Yes | Yes (polls every 3s via queue) | Shows failed run in queue | Open Queue Drawer | `IMPLEMENTED` | [`AnalysisWorkspace.tsx:L463-L476`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L463-L476) |
| [`components/billing/SubscriptionView.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx) | Subscription checkout opening | Button spinner: `"Opening Checkout..."` | Yes | No | Yes | No | Red error banner | Dismiss & re-click | `IMPLEMENTED` | [`SubscriptionView.tsx:L328-L333`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L328-L333) |
| [`components/billing/SubscriptionBadge.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx) | Billing status initial load | Component returns `null` (invisible) | No | No | Yes | Yes | None | None | `IMPLEMENTED` | [`BillingBadge.tsx:L31-L33`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx#L31-L33) |

---

## 5. Empty State Inventory

| Location | Why Empty | Current Message | Primary Action | Secondary Action | Explains Why Empty? | Tells User What to Do? | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | User has never uploaded a tender | *"No documents in this view. Get started by uploading a Request for Proposal (RFP) to extract findings and verify requirements."* | "Upload Your First RFP" | None | Yes | Yes | `IMPLEMENTED` | [`DocumentLibrary.tsx:L345-L362`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L345-L362) |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | Search query returned no matches | *"No matching documents found. No tender matched '{query}'. Try searching for another filename or qualification status."* | None | Clear query | Yes | Yes | `IMPLEMENTED` | [`DocumentLibrary.tsx:L345-L352`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L345-L352) |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | Active filter tab (Ready/Processing/Review/Failed/Rejected) has 0 items | *"No documents in this view. Get started by uploading a Request for Proposal (RFP)..."* | "Upload Your First RFP" | None | Partially (generic) | Yes | `PARTIALLY_IMPLEMENTED` | [`DocumentLibrary.tsx:L345-L362`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L345-L362) |
| [`components/workspace/AttentionBrief.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AttentionBrief.tsx) | No verified findings extracted from PDF | *"No Verified Findings Extracted. No verified procurement findings were produced from the available evidence in this document. Review the coverage audit to inspect candidate pages and unverified clauses."* | "View Coverage Audit" | None | Yes | Yes | `IMPLEMENTED` | [`AttentionBrief.tsx:L39-L60`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AttentionBrief.tsx#L39-L60) |
| [`components/workspace/AnalysisWorkspace.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx) | No active document selected | *"No Tender Document Selected. Upload your first procurement tender document to run automated extraction."* | "Ingest New Tender PDF" | None | Yes | Yes | `IMPLEMENTED` | [`AnalysisWorkspace.tsx:L644-L659`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L644-L659) |
| [`components/workspace/EvidenceInspector.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/EvidenceInspector.tsx) | Evidence drawer opened with nothing selected | *"Evidence & Source Inspector. Select any finding from the Decision Snapshot or Review Queue to inspect its verbatim source quotation, commercial implication, and page context."* | Select a finding | None | Yes | Yes | `IMPLEMENTED` | [`EvidenceInspector.tsx:L89-L100`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/EvidenceInspector.tsx#L89-L100) |
| [`components/workspace/AnalysisQueueDrawer.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisQueueDrawer.tsx) | User has zero active or completed jobs | *"No Analysis Jobs. Documents uploaded for analysis will appear here."* | None | None | Yes | Yes | `IMPLEMENTED` | [`AnalysisQueueDrawer.tsx:L128-L135`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisQueueDrawer.tsx#L128-L135) |
| [`components/workspace/FindingsLedger.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/FindingsLedger.tsx) | Domain or severity filter yields 0 findings | *"No findings match the selected filters. Try changing category or clearing search query."* | "Clear Filters" | None | Yes | Yes | `IMPLEMENTED` | [`FindingsLedger.tsx:L252-L268`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/FindingsLedger.tsx#L252-L268) |

---

## 6. Error State Inventory

| Location | Trigger | Technical Error | Current User-Facing Message | User Impact | Data Impact | Credit Impact | Payment Impact | Retry Available | Recovery Available | Support Path | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx) | Invalid email format | Regex validation failed | *"Please enter a valid email address."* | Form blocked | None | None | None | Yes | Re-type email | None | `IMPLEMENTED` | [`login/page.tsx:L21`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L21) |
| [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx) | Supabase Auth API failure | `signInWithOtp` returns error | *"Authentication failed. Please check your email and try again."* | Cannot log in | None | None | None | Yes | Re-submit | Top "Support" link | `IMPLEMENTED` | [`login/page.tsx:L39`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L39) |
| [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx) | Google OAuth initiation failure | `signInWithOAuth` returns error | *"Google authentication failed. Please try again."* | Cannot log in | None | None | None | Yes | Re-click Google | Top "Support" link | `IMPLEMENTED` | [`login/page.tsx:L65`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L65) |
| [`app/auth/callback/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts) | OAuth code exchange failure | Missing code or expired session | Redirects to `/login?error=auth-callback-failed`. **No message shown!** | User lands on login page without explanation | None | None | None | Yes | Re-try login | None | `PARTIALLY_IMPLEMENTED` | [`route.ts:L35`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts#L35) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Oversized file selection | `file.size > 10MB` | *"File exceeds 10 MB limit ({size} MB). Please upload a smaller PDF."* | File rejected | None | None | None | Yes | Pick smaller file | None | `IMPLEMENTED` | [`DocumentIntake.tsx:L64`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L64) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Non-PDF file dropped | `file.type !== 'application/pdf'` | *"Invalid file format. Only PDF documents are supported."* | File rejected | None | None | None | Yes | Pick PDF file | None | `IMPLEMENTED` | [`DocumentIntake.tsx:L56`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L56) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Storage upload failure | POST `/api/documents` returns non-200 | *"Processing Failed. {error}"* | Document not uploaded | None | Zero consumed | None | Yes | "Upload Another Document" | None | `IMPLEMENTED` | [`DocumentIntake.tsx:L91`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L91) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Text extraction failed | POST `/api/process-document` fails | *"Processing Failed. Text extraction failed."* | Document cannot be analyzed | Document marked FAILED | Zero consumed | None | Yes via re-upload | Re-upload | None | `IMPLEMENTED` | [`DocumentIntake.tsx:L114`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L114) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Scanned / Raster PDF | Page density <= 20 chars on >50% pages | *"OCR Required. This document contains scanned image pages or extremely low text density..."* | Pipeline halted | Document marked OCR_REQUIRED | Zero consumed | None | Cannot retry current file | Select Another Document | None | `IMPLEMENTED` | [`DocumentIntake.tsx:L415-L431`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L415-L431) |
| [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx) | Analysis Quota Exceeded | HTTP 403 `QUOTA_EXCEEDED` | *"Analysis quota exceeded. Please upgrade to a paid plan for 15 analyses per month."* | Analysis blocked | Document preserved in TEXT_EXTRACTED | Zero consumed | Must upgrade | Blocked | Navigate to subscription | None | `PARTIALLY_IMPLEMENTED` | [`DocumentIntake.tsx:L154`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L154) |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | Document list fetch error | HTTP 500 or network drop | **None shown**. Shows empty library view! | User thinks their library was erased | None | None | None | Manual refresh | None in UI | None | `MISSING` | [`DocumentLibrary.tsx:L74-L78`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L74-L78) |
| [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx) | Storage deletion gate fails | HTTP 502 from `/api/documents/[id]` | *"Error: Storage deletion failed. The document could not be removed from secure storage, so database records were preserved. Please retry."* | Document deletion stopped | Database records guaranteed preserved | None | None | Yes | Click Delete permanently again or Cancel | None | `IMPLEMENTED` | [`DocumentLibrary.tsx:L647-L652`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L647-L652) |
| [`components/workspace/AnalysisWorkspace.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx) | Document analysis API fetch failure | HTTP 500 from `/api/document-analysis` | **None shown**. Displays "No Tender Document Selected". | User cannot view analysis | None | None | None | Manual reload | None in UI | None | `MISSING` | [`AnalysisWorkspace.tsx:L188-L191`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L188-L191) |
| [`components/billing/SubscriptionView.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx) | Razorpay script load failure | Network blocked `checkout.js` | *"Unable to load Razorpay payment gateway. Please check your connection."* | Upgrade blocked | None | None | None | Yes | Re-click upgrade | None | `IMPLEMENTED` | [`SubscriptionView.tsx:L82`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L82) |
| [`components/billing/SubscriptionView.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx) | Subscription initiation API failure | HTTP 500 from `/api/billing/create-subscription` | Red alert banner with server error | Upgrade blocked | None | None | None | Yes | Dismiss & retry | None | `IMPLEMENTED` | [`SubscriptionView.tsx:L110`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx#L110) |
| [`app/error.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/error.tsx) | Uncaught React render error | React component crash | *"Something went wrong. An unexpected error occurred. Please try again."* | Page crashed | State reset | None | None | Yes | Click "Try again" | None | `IMPLEMENTED` | [`app/error.tsx:L19-L28`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/error.tsx#L19-L28) |

---

## 7. Async Workflow Inventory

| # | Async Operation Question | 1. PDF Upload | 2. Text Extraction | 3. Analysis Dispatch | 4. Inngest / AI Pipeline | 5. Permanent Deletion | 6. Razorpay Subscription |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Does the user know that work is happening? | Yes (Spinner + status text) | Yes (Spinner + status text) | Yes (Spinner: "Evaluating...") | Yes (Queue Drawer + Header pulse) | Yes (Modal spinner: "Deleting...") | Yes ("Opening Checkout...") |
| 2 | Does the user know what is happening? | Yes ("Uploading PDF...") | Yes ("Extracting pages & text density...") | Yes ("Evaluating qualification...") | Partially (Stages in queue drawer, but not on main library card) | Yes ("Deleting permanently...") | Yes (Payment checkout) |
| 3 | Does the user know whether they can leave the page? | No (No copy advises whether safe to leave) | No (No copy advises whether safe to leave) | No (In flight) | **YES** ("You can continue working, upload another tender...") | No (Modal blocks) | No |
| 4 | Does the operation continue if they leave? | No (Client upload fetch aborts) | Yes (Server route runs up to 60s) | Yes (Session already created in DB) | **YES** (Durable Inngest / runner background execution) | Yes (Server executes cascading deletion) | Yes (Webhook activates independently) |
| 5 | Can they safely refresh? | Yes (Resets to IDLE) | Yes (DB row stays in `PROCESSING`) | Yes (DB row claimed) | **YES** (Queue drawer & status API poll run status) | Yes | Yes |
| 6 | Can they return later? | Yes | Yes | Yes | **YES** (Documents and findings persist in PostgreSQL) | Yes | Yes |
| 7 | Is there a persistent state? | Yes (`documents.status = 'UPLOADED'`) | Yes (`documents.status = 'TEXT_EXTRACTED'`) | Yes (`analysis_runs.status = 'PROCESSING'`) | Yes (`analysis_findings` & `analysis_runs`) | Yes (Cascade removes row) | Yes (`user_subscriptions.status = 'ACTIVE'`) |
| 8 | Is there a retry mechanism? | Yes ("Upload Another Document") | Yes (Re-upload) | Yes ("Override & Analyze" / "Retry") | Yes ("Retry Analysis" in Queue Drawer) | Yes (Modal stays open on error with retry button) | Yes (Re-click button) |
| 9 | Can duplicate actions occur? | Yes (If user uploads same PDF twice, two documents created) | No (Idempotent upsert on `document_pages`) | **NO** (Strict CAS in `start_analysis_session` + unique constraint) | **NO** (Deduplication + single active run per doc) | No (Storage and DB deletes are idempotent) | **NO** (Provider event deduplication + unique active sub constraint) |
| 10 | Does the user know whether their quota/credit was affected? | Yes (No credit impact stated/incurred) | Yes (No credit impact stated/incurred) | Partially (No credit balance displayed in modal) | Partially (Only reflected in header BillingBadge) | Yes (Modal explains deletion does not refund quota) | Partially (Badge increments limit to 15) |

---

## 8. Billing & Entitlement State Inventory

### 8.1 Plan States
- **`FREE` Tier:**
  - Hard limit: **3 lifetime analyses** (`analysis_entitlement_ledger.plan_at_start = 'FREE'`).
  - Gating: Contract exposure categories (liability, indemnity, termination, liquidated damages) are masked server-side in `/api/document-analysis`. Verbatim quotes redacted to `[]`.
  - Export: Full JSON & CSV exports supported for all unmasked findings.
- **`PRO_INDIA` (Plus) Tier:**
  - Price: ₹499/month.
  - Hard limit: **15 analyses per billing cycle** (`subscription_id` + `period_start` / `period_end`).
  - Gating: Same as Free (Tender Qualification focus; Contract Exposure findings masked server-side).
  - Badge: Displays `"Plus • {consumed}/15 this month"`.
- **`PRO_GLOBAL` (Pro) Tier:**
  - Price: ₹999/month.
  - Hard limit: **15 analyses per billing cycle**.
  - Gating: **Zero gating**. Full verbatim quotations, risk implications, and action recommendations unmasked for all 12 procurement categories.
  - Badge: Displays `"Pro • {consumed}/15 this month"`.

### 8.2 Entitlement Lifecycle Transitions
1. **Request:** Client calls `/api/analyze-document`.
2. **Reservation:** `start_analysis_session` atomically locks `user_usage`, verifies remaining quota, and inserts ledger row with `status = 'RESERVED'`.
3. **Dispatch:** CAS claims `analysis_runs.status = 'PROCESSING'`.
4. **Execution:** Background Inngest / runner executes extraction and validation.
5. **Finalization:**
   - **Success (`COMPLETED`):** Calls `finalize_analysis_entitlement(ledger_id, success=true, consumed=true)`. Ledger becomes `'CONSUMED'`.
   - **Rejection (`AI_REJECTED`):** Calls `finalize_analysis_entitlement(ledger_id, success=false, consumed=false)`. Ledger becomes `'RELEASED'`. Quota restored.
   - **Failure (`FAILED`):** Calls `finalize_analysis_entitlement(ledger_id, success=false, consumed=false)`. Ledger becomes `'RELEASED'`. Quota restored.
   - **Emergency Dispatch Failure:** `/api/analyze-document` catches failure and immediately invokes `finalize_analysis_entitlement(..., consumed=false)`. Ledger becomes `'RELEASED'`.
   - **Document Deletion Cascade:** If document is deleted while analysis is running, foreign key cascade deletes document, pages, run, and ledger entry safely.

---

## 9. Current Email Inventory

| Email ID | Trigger | Recipient | Subject | Purpose | Template Location | Current Body Structure | Primary CTA | Failure Handling | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `EMAIL-AUTH-OTP` | User enters email on login page | User email | Supabase default: *"Your Magic Link"* | Authenticate session | Supabase Hosted Auth Service | Supabase default email template | Magic Link URL | Logged in Supabase dashboard | `IMPLEMENTED` (External) | [`login/page.tsx:L31`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx#L31) |
| `EMAIL-UPL-CONF` | Document successfully uploaded | User email | N/A | Confirm file received | None | None | None | None | `MISSING` | Global codebase search |
| `EMAIL-ANA-DONE` | Tender analysis completes | User email | N/A | Notify user tender brief is ready | None | None | None | None | `MISSING` | Global codebase search |
| `EMAIL-ANA-FAIL` | Tender analysis fails | User email | N/A | Explain failure and credit restore | None | None | None | None | `MISSING` | Global codebase search |
| `EMAIL-SUB-ACTV` | Subscription activated | User email | N/A | Welcome to Plus/Pro & receipt | None | None | None | None | `MISSING` | Global codebase search |
| `EMAIL-SUB-HALT` | Subscription payment fails | User email | N/A | Alert payment failure & grace period | None | None | None | None | `MISSING` | Global codebase search |
| `EMAIL-SUB-CNCL` | Subscription cancelled | User email | N/A | Confirm cancellation at period end | None | None | None | None | `MISSING` | Global codebase search |
| `EMAIL-QTA-WARN` | Quota reaches 80% or 100% | User email | N/A | Warn user before bid deadline | None | None | None | None | `MISSING` | Global codebase search |

---

## 10. User Journey State Matrix

| Journey Stage | NORMAL | SLOW | FAILED | BLOCKED | EMPTY | RECOVERY |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01. Visitor** | Renders Landing page with clean typography & hero demo | Normal static load | 500 error boundary ([`app/error.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/error.tsx)) | N/A | N/A | Reload page |
| **02. Sign In** | Magic link sent banner / Google OAuth redirect | Spinner on button ("Sending...") | Alert: "Authentication failed" | Form validation error: "Please enter valid email" | N/A | Re-type email / Retry |
| **03. Dashboard** | Renders Document Library cards | Loader: "Loading Document Library..." | **MISSING**: Silent error (renders empty library) | Unauthenticated redirects to `/login` | Centered card: "No documents in this view" | Click "Upload Your First RFP" |
| **04. Upload** | File staged in dropzone, Start button enabled | Spinner: "Uploading PDF..." | Red card: "Processing Failed. {error}" | Oversized (>10MB) or Non-PDF blocked with banner | Idle dropzone prompt | Re-select valid PDF |
| **05. Extraction** | Pages extracted badge (`{N} Pages Extracted`) | Spinner: "Extracting pages & text density..." | Red card: "Processing Failed. Text extraction failed." | Scanned/Raster PDF blocked: "OCR Required" | 0 pages extracted marked FAILED | "Select Another Document" |
| **06. Qualification** | Transitions to background analysis | Spinner: "Evaluating qualification gate..." | Red card: "Document Rejected (Non-RFP)" | Ambiguous intake card requires confirmation | Non-RFP document | "Override & Analyze" / Confirm |
| **07. Analysis Queue** | Green card: "Tender Accepted & Queued" | Spinner: "Analysing document pages..." | Red card: "Processing Failed" | Quota exceeded (403): "Analysis quota exceeded" | Empty Queue Drawer | "Retry Analysis" from queue drawer |
| **08. Workspace** | Decision Brief (Attention Brief + Coverage Pulse) | Spinner: "Loading Tender Intelligence..." | **MISSING**: Renders "No Tender Selected" on API error | Foreign document returns Next.js 404 | Card: "No Verified Findings Extracted" | Return to Dashboard / Coverage Audit |
| **09. Review Findings**| Verbatim quotes, implications & page badges | Drawer slides in with highlighted text | Missing quote logs warning | Gated Contract Exposure findings show lock icon | Empty search filter shows "Clear Filters" | Click "Upgrade to Pro" to unlock |
| **10. Export** | Immediate client download of JSON/CSV | Instant (client Blob) | Export button hidden if 0 findings | N/A | N/A | Re-click export |
| **11. Subscription**| Pricing page shows active plan and quotas | Button spinner: "Opening Checkout..." | Red banner: "Payment initiation failed" | Already subscribed returns 409 | N/A | Re-click checkout |
| **12. Return Later**| Document Library shows "Analysis Complete" | Document card shows "Analysis In Progress..." | Document card shows "Analysis Failed" | Document card shows "Non-RFP Rejected" | N/A | Click "Open Analysis" / "View Error" |

---

## 11. Dead-End Inventory

### DEAD-END-01: Document Library Fetch Failure Masquerades as Empty State
- **ID:** `DEAD-END-01`
- **Location:** [`components/dashboard/DocumentLibrary.tsx:L70-L78`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L70-L78)
- **User action that leads there:** User visits `/dashboard` while experiencing a network glitch, or during a temporary backend 500.
- **Observed behavior:** The `fetchDocuments` catch block only calls `console.error` and sets `isLoading(false)`. The screen renders the empty library card: *"No documents in this view. Get started by uploading a Request for Proposal (RFP)..."*.
- **Why it is a dead end:** The user believes all their previously analyzed tenders and data were deleted. There is no error message, no retry button, and no indication that a network or server failure occurred.
- **Severity:** `P0` (Extreme ambiguity regarding user data safety).
- **Evidence:** [`components/dashboard/DocumentLibrary.tsx:L70-L78`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx#L70-L78)

### DEAD-END-02: Document Analysis API Error Masquerades as "No Document Selected"
- **ID:** `DEAD-END-02`
- **Location:** [`components/workspace/AnalysisWorkspace.tsx:L187-L200`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L187-L200)
- **User action that leads there:** User navigates to `/documents/[documentId]` but `/api/document-analysis` returns an error (e.g. 500, database connection timeout).
- **Observed behavior:** `activeDocData` remains null and `isLoading` becomes false. The component renders: *"No Tender Document Selected. Upload your first procurement tender document to run automated extraction."*
- **Why it is a dead end:** The user navigated directly to an existing document, but is told no document is selected and prompted to upload a new tender. There is no error notification and no retry mechanism.
- **Severity:** `P1` (Important workflow blocked and deceptive error display).
- **Evidence:** [`components/workspace/AnalysisWorkspace.tsx:L187-L200, L644-L659`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx#L187-L659)

### DEAD-END-03: OAuth Callback Failure Swallowed Silently
- **ID:** `DEAD-END-03`
- **Location:** [`app/auth/callback/route.ts:L35`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts#L35) vs [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx)
- **User action that leads there:** User clicks an expired magic link or an invalid OAuth callback redirect occurs.
- **Observed behavior:** The route redirects to `/login?error=auth-callback-failed`. The login page does not inspect `searchParams`, so it renders the normal idle login screen with zero error messages.
- **Why it is a dead end:** The user was just told to check their email for a magic link, clicked it, and was dumped right back on the login screen with no explanation of why they were not logged in.
- **Severity:** `P1` (Core authentication loop failure).
- **Evidence:** [`app/auth/callback/route.ts:L35`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts#L35) and [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx)

### DEAD-END-04: Quota Exceeded in Intake Modal Lacks Upgrade CTA
- **ID:** `DEAD-END-04`
- **Location:** [`components/workspace/DocumentIntake.tsx:L153-L157`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L153-L157)
- **User action that leads there:** User on Free tier uploads their 4th document and clicks Start Ingestion & Analysis.
- **Observed behavior:** API returns 403. Modal displays error banner: *"Analysis quota exceeded. Please upgrade to a paid plan for 15 analyses per month."*
- **Why it is a dead end:** The error banner contains no link or button to upgrade. The user is stuck in the upload modal and must manually close it, locate the "Plans & Pricing" link in the header, and navigate away.
- **Severity:** `P2` (Recoverable usability and monetization blocker).
- **Evidence:** [`components/workspace/DocumentIntake.tsx:L153-L157`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L153-L157)

### DEAD-END-05: Absence of Self-Serve Subscription Cancellation UI
- **ID:** `DEAD-END-05`
- **Location:** [`components/billing/SubscriptionView.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx)
- **User action that leads there:** Subscribed user on Plus or Pro wants to cancel their recurring subscription.
- **Observed behavior:** The user visits `/subscription` or opens the subscription modal. There is no "Cancel Subscription" button anywhere in the application.
- **Why it is a dead end:** The user is financially locked into recurring charges with no self-serve mechanism in the UI to cancel, even though the backend API route [`app/api/billing/cancel-subscription/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/cancel-subscription/route.ts) is fully implemented.
- **Severity:** `P0` (Financial ambiguity and regulatory compliance risk).
- **Evidence:** Grep of `cancel-subscription` across `components/` yields zero results.
- **Status:** `P0` Dead End.

### DEAD-END-06: 404 Page Returns Home Instead of Document Library
- **ID:** `DEAD-END-06`
- **Location:** [`app/not-found.tsx:L11-L16`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/not-found.tsx#L11-L16)
- **User action that leads there:** Logged-in user clicks a stale link or enters an invalid document ID.
- **Observed behavior:** Next.js renders `NotFoundState` with only one button: "Return Home" (`/`).
- **Why it is a dead end:** An authenticated user who is deep in their document workflow is redirected all the way back to the marketing landing page (`/`) rather than their authenticated workspace (`/dashboard`).
- **Severity:** `P3` (Minor navigation friction).
- **Evidence:** [`app/not-found.tsx:L11-L16`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/not-found.tsx#L11-L16)

---

## 12. High-Risk Ambiguity Inventory

### AMBIGUITY-01: Document Library Lacks Real-Time Polling for In-Progress Analyses
- **Location:** [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx)
- **The Issue:** When a document is dispatched and the user navigates back to `/dashboard`, the document card displays `"Analysis In Progress..."`. However, `DocumentLibrary.tsx` **does not poll `/api/documents` or `/api/analysis-queue`**. If the background job finishes 30 seconds later, the card remains indefinitely in `"Analysis In Progress..."` until the user manually refreshes the browser page.
- **User confusion:** The user does not know whether the analysis completed, crashed, or hung.

### AMBIGUITY-02: Credit Impact Transparency on Document Override
- **Location:** [`components/workspace/DocumentIntake.tsx:L514-L523`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx#L514-L523)
- **The Issue:** When a document is rejected by AI qualification, the previous entitlement reservation is released (0 credits consumed). The UI shows an "Override & Analyze" button. However, the copy does not inform the user that clicking "Override & Analyze" will consume an analysis credit from their quota upon completion.
- **User confusion:** The user is uncertain whether manual override is free or deducts from their quota.

### AMBIGUITY-03: Completely Silent Email Lifecycle
- **Location:** Entire codebase.
- **The Issue:** There are zero transactional emails sent for tender completion, analysis failures, subscription renewals, or billing receipts. If an analyst uploads a 100-page tender and closes their laptop, they receive no email notification when the tender analysis is ready for review.
- **User confusion:** The user must repeatedly check the web app to find out if processing completed.

---

## 13. Coverage Summary

- **Total States Identified:** 38
  - **Implemented:** 27
  - **Partially Implemented:** 5
  - **Missing:** 6
  - **Unverified:** 0
- **Dead Ends Discovered:** 6
  - **P0:** 2 (`DEAD-END-01` Library Fetch Failure Masquerade, `DEAD-END-05` Missing Subscription Cancel UI)
  - **P1:** 2 (`DEAD-END-02` Workspace Fetch Error Masquerade, `DEAD-END-03` Silent OAuth Callback Failure)
  - **P2:** 1 (`DEAD-END-04` Quota Exceeded Missing Upgrade Action)
  - **P3:** 1 (`DEAD-END-06` 404 Route Directs Authenticated Users to Landing Page)
- **Async Workflows Inspected:** 6 (Upload, Extraction, Dispatch, Background Pipeline, Deletion, Subscription Checkout)
- **Loading States Inspected:** 12
- **Empty States Inspected:** 8
- **Error States Inspected:** 16
- **Email Lifecycle Events Inspected:** 8 (1 implemented externally via Supabase Auth, 7 missing)

---

## 14. Evidence & Source Map

1. **Authentication & Session Routing:**
   - [`proxy.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/proxy.ts)
   - [`lib/supabase/middleware.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/supabase/middleware.ts)
   - [`app/(auth)/login/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/(auth)/login/page.tsx)
   - [`app/auth/callback/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/auth/callback/route.ts)
   - [`app/dashboard/LogoutButton.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/dashboard/LogoutButton.tsx)

2. **Document Library & Ingestion:**
   - [`app/dashboard/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/dashboard/page.tsx)
   - [`components/dashboard/DocumentLibrary.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/dashboard/DocumentLibrary.tsx)
   - [`app/api/documents/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/documents/route.ts)
   - [`app/api/documents/[documentId]/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/documents/%5BdocumentId%5D/route.ts)
   - [`components/workspace/DocumentIntake.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/DocumentIntake.tsx)
   - [`app/api/process-document/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/process-document/route.ts)

3. **Analysis Engine & Workspace:**
   - [`app/documents/[documentId]/page.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/documents/%5BdocumentId%5D/page.tsx)
   - [`components/workspace/AnalysisWorkspace.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisWorkspace.tsx)
   - [`components/workspace/WorkspaceHeader.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/WorkspaceHeader.tsx)
   - [`components/workspace/AttentionBrief.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AttentionBrief.tsx)
   - [`components/workspace/CoveragePulse.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/CoveragePulse.tsx)
   - [`components/workspace/CoverageAuditTray.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/CoverageAuditTray.tsx)
   - [`components/workspace/FindingsLedger.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/FindingsLedger.tsx)
   - [`components/workspace/EvidenceInspector.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/EvidenceInspector.tsx)
   - [`components/workspace/AnalysisQueueDrawer.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/workspace/AnalysisQueueDrawer.tsx)
   - [`app/api/document-analysis/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/document-analysis/route.ts)
   - [`app/api/analyze-document/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analyze-document/route.ts)
   - [`app/api/analysis-status/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analysis-status/route.ts)
   - [`app/api/analysis-queue/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/analysis-queue/route.ts)
   - [`lib/pipeline/runner.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/pipeline/runner.ts)
   - [`lib/inngest/functions.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/inngest/functions.ts)

4. **Billing & Entitlement Foundation:**
   - [`supabase/migrations/20260919074600_add_billing_and_entitlement.sql`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/supabase/migrations/20260919074600_add_billing_and_entitlement.sql)
   - [`lib/billing/config.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/billing/config.ts)
   - [`lib/billing/auth.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/billing/auth.ts)
   - [`lib/billing/razorpay.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/billing/razorpay.ts)
   - [`lib/billing/webhook-processor.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/billing/webhook-processor.ts)
   - [`app/api/billing/status/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/status/route.ts)
   - [`app/api/billing/create-subscription/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/create-subscription/route.ts)
   - [`app/api/billing/cancel-subscription/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/cancel-subscription/route.ts)
   - [`app/api/billing/webhook/route.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/api/billing/webhook/route.ts)
   - [`components/billing/BillingBadge.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/BillingBadge.tsx)
   - [`components/billing/SubscriptionModal.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionModal.tsx)
   - [`components/billing/SubscriptionView.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/components/billing/SubscriptionView.tsx)

5. **Exports & Global Handlers:**
   - [`lib/export/findings-export.ts`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/lib/export/findings-export.ts)
   - [`app/error.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/error.tsx)
   - [`app/loading.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/loading.tsx)
   - [`app/not-found.tsx`](file:///c:/Users/Chiranjeevi%20PK/Desktop/bid-intel/app/not-found.tsx)

---

## 15. Phase 3A Findings

1. **Robust Backend Safety vs Fragile Frontend Error Feedback:**
   The backend database schema and server-side RPCs guarantee entitlement safety, CAS claiming, and emergency release. However, when errors occur (such as network drops or API 500s), the frontend frequently swallows the error into a silent empty state (`DocumentLibrary` and `AnalysisWorkspace` both render "No documents" on fetch failure instead of an error message).
2. **Missing Real-Time Library Updates:**
   While `AnalysisWorkspace` and `DocumentIntake` poll analysis status, the primary `DocumentLibrary` does not poll. If a user uploads a document and returns to the dashboard, the card stays in `"Analysis In Progress..."` until an explicit browser refresh.
3. **No Self-Serve Subscription Cancellation UI:**
   While the backend route `/api/billing/cancel-subscription` exists and updates `cancel_at_period_end`, the frontend provides no button or interface for users to trigger it.
4. **Complete Absence of Transactional Emails:**
   Zero transactional email infrastructure exists in RFPGround today. Users cannot receive notifications outside of the browser window.

---

## 16. Explicit List of Things NOT Changed

In strict compliance with Phase 3 instructions, the following remained completely unchanged:
- **NO** application code modified in `app/`, `components/`, or `lib/`.
- **NO** components refactored.
- **NO** UI designs or layouts altered.
- **NO** database migrations added or modified.
- **NO** API routes created or changed.
- **NO** billing or subscription logic altered (Phase 2A, 2B, 2C work untouched).
- **NO** analysis or AI extraction logic changed.
- **NO** email templates created.

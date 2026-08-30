# RFPground — BUILD-016 Concurrency & Resilience Test Protocol

**Status**: SPECIFICATION & TEST PLAN  
**Release**: BUILD-016

---

## 1. Concurrency Test Matrix

| Concurrency Level | Test Document Mix | Queue Target | Processing Target | Total Expected Time | Data Isolation Validation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 PDF** (Baseline) | 33-Page Dense Tender (`scam_anoynomous.pdf`) | 0 ms | ≤ 28.0 s | ≤ 28.0 s | 100% Verified Quotes |
| **3 PDFs** | 1 Dense Tender + 1 Municipal RFP + 1 Job Spec | < 500 ms | ≤ 32.0 s (Parallel) | ≤ 35.0 s | Zero finding bleeding across docs |
| **5 PDFs** | Mixed Real-World Tenders (Dense, Medium, Sparse) | < 1,000 ms | ≤ 40.0 s | ≤ 45.0 s | Each run maintains atomic boundary |
| **10 PDFs** (Stress) | 10 Concurrent Tenders | < 2,000 ms | Batch concurrency | Measured | No 429 rate limit errors |

---

## 2. Failure & Resilience Test Cases

1. **Worker Crash & Retry**:
   - Intentionally interrupt worker mid-execution (`VERIFYING`).
   - Trigger retry.
   - Verify zero duplicate findings inserted.
2. **Duplicate Document Upload**:
   - Upload `scam_anoynomous.pdf` twice consecutively.
   - Verify two distinct `document_id` and `analysis_runs` records are created without unique index crash.
3. **Browser Disconnect / Navigation**:
   - Upload a 33-page document and immediately close the tab.
   - Re-open dashboard after 40 seconds.
   - Verify document is marked `ANALYSIS READY` and all findings are loaded.
4. **Non-Tender Auto-Rejection during Queueing**:
   - Upload non-tender document.
   - Verify queue marks status as `REJECTED` with exact explanation and allows 1-click override.

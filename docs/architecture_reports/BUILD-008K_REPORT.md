# BUILD-008K Final Evaluation Report

## Executive Summary

BUILD-008K successfully proved that **dynamic, page-based batch splitting (K2) eliminates infinite identical retries**. The bounded extraction logic correctly caught output ceilings and dynamically split dense batches (down to depth=3) without repeating identical payloads.

However, **BUILD-008K FAILED the production gates** (Critical Recall ≥ 90%, p90 E2E ≤ 90s, 0 Identical Retries). While identical truncation retries were reduced to 0, overall recall crashed to **56.6%**. 

**Verdict: DO NOT DEPLOY TO PRODUCTION.**

---

## 1. Production Gates Validation

| Gate | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| **Identical Truncation Retries** | 0 | **0** | ✅ **PASS** |
| **Critical Concept Recall** | ≥ 90% | **56.6%** | ❌ **FAIL** (Severe Regression) |
| **p90 E2E Latency** | ≤ 90s | **111.44s** | ❌ **FAIL** |

---

## 2. Benchmark Metrics

| Metric | Result |
| ------ | ------ |
| **Documents** | 15 |
| **Critical Recall** | 56.6% |
| **High Recall** | 36.7% |
| **Overall Gold Recall** | 37.9% |
| **p50 E2E Latency** | 27.87s |
| **p90 E2E Latency** | 111.44s |
| **Max E2E Latency** | 126.18s |
| **Total Ceiling Hits** | 23 |
| **Total Splits** | 54 |
| **Maximum Split Depth** | 3 |
| **Successful Extraction Completion Rate** | 65.7% |
| **Avg Cost / Doc** | $0.0048 |

---

## 3. Why Critical Recall Crashed

The severe drop in recall (56.6%) was caused by two critical implementation flaws that caused entire documents to abort and return 0 findings:

### A. The Retry Block Trap (e.g. DOC-006)
In `functions.ts:analyzeBatchBounded`, if the model returns a schema error, we retry it once. However, if the *retry attempt* hits the `OUTPUT_CEILING`, the error is thrown inside the `catch` block and bubbles up entirely uncaught, crashing the entire document extraction.
- **DOC-006 (49 pages):** Crashed during `Legal/Risk/B/A` because the retry hit the output ceiling. Returned 0 items (missed 11/11 Critical items).

### B. Chunked Mapping Schema Fragility (e.g. DOC-008)
In `mapping.ts:mapDocumentPagesChunked`, large documents (>40 pages) are mapped in 30-page chunks. If *any single chunk* hallucinates a category enum (e.g. returning something outside the strictly enforced Zod `CategoryEnum`), the schema validation fails for the entire merged map, aborting the whole document before extraction even begins.
- **DOC-008 (131 pages):** Failed entirely at the mapping stage due to an invalid enum. Returned 0 items (missed 5/5 Critical items).

---

## 4. Why Latency Remained High

p90 Latency (111.4s) failed the ≤90s gate because of the **cumulative cost of deep splitting**. 
While bounded concurrency (`runWithConcurrencyLimit(3)`) prevented provider rate-limiting, splitting a 20-page batch into 10+10, then 5+5, then 2+3 (Depth=3) effectively forces sequential execution of the split levels. When `finish_reason === "length"` occurs, the 48s spent generating the truncated output is wasted wall-clock time. If this happens multiple times recursively, the document's E2E latency easily breaches 120s.

---

## 5. Recommended Next Steps (BUILD-008L)

To stabilize the architecture and pass the gates, I recommend the following fixes for **BUILD-008L**:

1. **Fix the Retry Block:** Move the `OUTPUT_CEILING` check to apply to the retry attempt as well, or simply wrap the retry in another bounded call so that ceiling hits on retries trigger proper splitting instead of crashing the batch.
2. **Resilient Chunked Mapping:** In `mapDocumentPagesChunked`, catch chunk-level schema validation errors and gracefully discard the invalid chunks rather than throwing and aborting the entire 131-page document.
3. **Optimized Initial Splitting:** Since we now know that batches >10 pages frequently hit the output ceiling, we should proactively split batches that exceed 15 pages *before* sending them to the model, eliminating the wasted 48s generation time of the inevitable first ceiling hit.

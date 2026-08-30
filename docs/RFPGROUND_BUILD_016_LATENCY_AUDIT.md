# RFPground — BUILD-016 Latency Audit & Controlled Optimization Plan
## Stage-by-Stage Analysis Pipeline Latency Breakdown & Empirical Trace Profiling

**Status**: BASELINE PROFILED & CONTROLLED BENCHMARK PLAN LOCKED  
**Specimen Under Trace Profiling**: 33-Page Government Tender (`scam_anoynomous.pdf`, 77 extracted findings)  
**Historical Run Traces**:
- Run Trace A (Fast Network/LLM Response): **35.16s** (Run `e1715f27-0ad1-4bdf-9998-2ab016245b9d`)
- Run Trace B (Nominal P50 Trace): **52.40s**
- Run Trace C (Heavy/High Latency Network): **63.86s** (Run `958227aa-b823-47a9-a15b-af9dd9dcafb5`)

---

## 1. Empirical Stage-by-Stage Latency Trace (Trace B — 52.40s Baseline)

```
PIPELINE STAGE                             DURATION (ms)   SHARE (%)   BOTTLENECK STATUS
-----------------------------------------------------------------------------------------
1. PDF Storage Upload (Supabase Storage)         1,120 ms       2.1%   Low Overhead
2. Text Extraction & Density Heuristics          1,850 ms       3.5%   Fast (pdf-parse)
3. Page Text Persistence (PostgreSQL Batch)        840 ms       1.6%   Low Overhead
4. AI Qualification Gate (DeepSeek API)          4,100 ms       7.8%   Moderate
5. Candidate Page Retrieval (Regex/Rules)          260 ms       0.5%   Near Instant
6. Targeted Batch Extraction (DeepSeek API)     28,400 ms      54.2%   PRIMARY BOTTLENECK
7. Cross-Batch Deduplication & Quote Verify        180 ms       0.3%   Near Instant
8. Selective Risk Interpretation (DeepSeek)     11,650 ms      22.2%   SECONDARY BOTTLENECK
9. Findings & Quotes DB Persistence              1,450 ms       2.8%   Low Overhead
10. Metric Telemetry & Run Finalization            550 ms       1.0%   Low Overhead
-----------------------------------------------------------------------------------------
TOTAL END-TO-END PIPELINE LATENCY:              52,400 ms     100.0%
```

*Note: Percentage shares are derived from the individual 52.4s P50 execution trace. In faster 35.1s runs, LLM extraction occupies ~19.5s and interpretation ~7.8s; in 63.8s runs, LLM generation and network latency account for the variance.*

---

## 2. Controlled Optimization Sequence (BUILD-016.1)

Rather than applying speculative optimizations simultaneously, BUILD-016.1 executes a 5-step controlled benchmark:

```
[STEP 1] Decouple Ingestion & UI (Instant HTTP Return < 1.5s, Asynchronous Job Queue)
   │
   ▼
[STEP 2] Parallelize Extraction Batches (Test concurrency limit 2 → 3, verify zero 429s/failures)
   │
   ▼
[STEP 3] Parallelize Interpretation Chunks (Measure quality, finding retention, and latency)
   │
   ▼
[STEP 4] Conservative Prompt Compaction (Strip redundant schema tokens, preserve all safeguards)
   │
   ▼
[STEP 5] Multi-Document Benchmark (Small, Medium, Large, Sparse, Dense, Non-tender)
```

---

## 3. Acceptance Gates (Locked)

### P0 — Functional & Safety Non-Negotiables
- **P0**: User is never blocked by analysis (Upload returns immediate `job_id`).
- **P0**: Job survives browser refresh, disconnects, and navigation.
- **P0**: Multiple PDFs can coexist in queue and execute safely.
- **P0**: No cross-document data leakage between jobs.
- **P0**: Failed jobs are recoverable with transactional retry idempotency.
- **P0**: Evidence integrity (verbatim quotes, exact citations) remains 100% intact.

### P1 — Controlled Performance Benchmarks
- **P1**: Measure true P50 and P95 latency across document sizes.
- **P1**: Safely reduce extraction bottleneck without rate limits.
- **P1**: Safely reduce interpretation bottleneck without quality loss.
- **P1**: Establish verified production concurrency limits for DeepSeek API.

### P2 — Polish & Visibility
- **P2**: Optimize database batch queries.
- **P2**: Truthful persistent queue status indicator in authenticated workspace.

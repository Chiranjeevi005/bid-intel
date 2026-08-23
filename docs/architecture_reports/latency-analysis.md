# BUILD-008J Latency Analysis

## Root Cause: Output Token Ceiling

The primary cause of 100–250s latency outliers is **output token truncation**.

When an extraction batch is dense enough to produce >8,192 completion tokens:
1. Provider streams 8,192 tokens and stops
2. JSON is truncated mid-string → invalid
3. Retry fires → same batch, same context, same result
4. Each retry wastes 30–50s of provider time

### Token/Second Rates (measured)

| Document | Stage | Output Tokens | Generation Time | Tokens/sec |
| -------- | ----- | ------------: | --------------: | ---------: |
| DOC-007 | extraction/Eligibility | 1,085 | 7.06s | ~154 |
| DOC-007 | extraction/Legal | 1,266 | 8.34s | ~152 |
| DOC-009 | extraction/Eligibility | 5,056 | 30.67s | ~165 |
| DOC-009 | extraction/Commercial | 3,309 | 21.48s | ~154 |
| DOC-012 | extraction/Commercial | **8,192 (ceiling)** | 48.28s | ~170 |
| DOC-012 | extraction/Legal | **8,192 (ceiling)** | 48.95s | ~167 |

**The model generates at a very consistent 150–170 tokens/second.**
Latency variance is entirely explained by output volume — not provider queueing, not TTFT.

## Implication for BUILD-008K

Target: ≤4,000 completion tokens per extraction call.
At 160 tok/s, that equals ~25 seconds maximum per batch.
To achieve p90 ≤ 60s E2E: qual (2s) + mapping (4s) + 3 batches × 25s (sequential) = 81s → parallelism needed.
With parallel batches: qual (2s) + mapping (4s) + max(batch) (25s) = ~31s → well within target.

**The fix is: constrain output, not input.**

## BUILD-008I-0 Latency Decomposition Results

| Document | Pages | Qual TTFT | Qual Gen | Intel TTFT | Intel Gen | Zod | Ev Val | Persist | Tokens (In / Cache / Out) |
| -------- | ----: | --------: | -------: | ---------: | --------: | --: | -----: | ------: | ------------------------: |
| DOC-007 | 2 | 403ms | 1590ms | 257ms | 9571ms | 3ms | 1ms | 2781ms | 3059 / 2944 / 1663 |
| DOC-013 | 33 | 489ms | 2144ms | 543ms | 16513ms | 1ms | 1ms | 1616ms | 37489 / 37376 / 3090 |
| DOC-006 | 49 | 647ms | 2162ms | 654ms | 27662ms | 1ms | 1ms | 2307ms | 56911 / 56832 / 4999 |
| DOC-008 | 131 | 828ms | 1766ms | 954ms | 34242ms | 1ms | 1ms | 2580ms | 135159 / 68096 / 5915 |

### Detailed Breakdown
```json
[
  {
    "document": "DOC-007",
    "pages": 2,
    "qualification_ms": 1993.7123000000001,
    "qualification_ttft_ms": 403.24519999999995,
    "qualification_generation_ms": 1590.4671,
    "intelligence_ms": 9828.4213,
    "intelligence_ttft_ms": 257.1187,
    "intelligence_generation_ms": 9571.3026,
    "zod_ms": 2.747599999999693,
    "evidence_validation_ms": 0.7453000000004977,
    "persistence_ms": 2781.3665,
    "prompt_tokens": 3059,
    "cached_tokens": 2944,
    "completion_tokens": 1663,
    "reasoning_tokens": 0
  },
  {
    "document": "DOC-013",
    "pages": 33,
    "qualification_ms": 2632.8526,
    "qualification_ttft_ms": 488.5660000000007,
    "qualification_generation_ms": 2144.2865999999995,
    "intelligence_ms": 17056.470400000002,
    "intelligence_ttft_ms": 543.4575000000004,
    "intelligence_generation_ms": 16513.0129,
    "zod_ms": 0.6837999999952444,
    "evidence_validation_ms": 0.9335999999966589,
    "persistence_ms": 1615.8392000000022,
    "prompt_tokens": 37489,
    "cached_tokens": 37376,
    "completion_tokens": 3090,
    "reasoning_tokens": 0
  },
  {
    "document": "DOC-006",
    "pages": 49,
    "qualification_ms": 2808.2941999999966,
    "qualification_ttft_ms": 646.765999999996,
    "qualification_generation_ms": 2161.5282000000007,
    "intelligence_ms": 28316.713699999993,
    "intelligence_ttft_ms": 654.2391999999963,
    "intelligence_generation_ms": 27662.474499999997,
    "zod_ms": 0.558100000002014,
    "evidence_validation_ms": 1.2888000000093598,
    "persistence_ms": 2306.8972000000067,
    "prompt_tokens": 56911,
    "cached_tokens": 56832,
    "completion_tokens": 4999,
    "reasoning_tokens": 0
  },
  {
    "document": "DOC-008",
    "pages": 131,
    "qualification_ms": 2594.9244000000035,
    "qualification_ttft_ms": 828.491200000004,
    "qualification_generation_ms": 1766.4331999999995,
    "intelligence_ms": 35196.0738,
    "intelligence_ttft_ms": 954.1552000000083,
    "intelligence_generation_ms": 34241.91859999999,
    "zod_ms": 0.5582000000140397,
    "evidence_validation_ms": 0.8972999999969034,
    "persistence_ms": 2579.6361999999936,
    "prompt_tokens": 135159,
    "cached_tokens": 68096,
    "completion_tokens": 5915,
    "reasoning_tokens": 0
  }
]
```

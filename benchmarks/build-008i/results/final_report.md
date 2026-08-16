| Metric | Result |
| ------ | ------ |
| Documents | 15 |
| Qualification FAR | 0.0% |
| Qualification FRR | 18.2% |
| Critical Recall | 50.9% |
| High Recall | 40.0% |
| Overall Gold Recall | 39.1% |
| Critical Miss Rate | 49.1% |
| Evidence Acceptance | 99.8% |
| Critical Evidence Failure | 0.0% |
| p50 E2E | 15.93s |
| p90 E2E | 102.29s |
| Max E2E | 161.32s |
| Avg Cost | $0.0098 |
| p90 Cost | $0.0268 |

| ID | Type | Pages | Qualification | Gold Items | Recalled | Critical Recall | Evidence | E2E | Cost |
| -------- | ---- | ----: | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DOC-001 | RFP | 2 | FAIL (FRR) | 7 | 0 | 0/3 | N/A | 1.94s | $0.0002 |
| DOC-002 | JOB_DESCRIPTION | 1 | PASS | 0 | 0 | 0/0 | N/A | 1.32s | $0.0001 |
| DOC-003 | OTHER | 1 | PASS | 0 | 0 | 0/0 | N/A | 1.20s | $0.0001 |
| DOC-004 | OTHER | 1 | PASS | 0 | 0 | 0/0 | N/A | 1.36s | $0.0001 |
| DOC-005 | OTHER | 1 | PASS | 0 | 0 | 0/0 | N/A | 1.16s | $0.0001 |
| DOC-006 | RFP | 49 | PASS | 32 | 17 | 4/11 | 100.0% | 67.19s | $0.0268 |
| DOC-007 | RFP | 2 | PASS | 2 | 1 | 1/1 | 100.0% | 12.65s | $0.0021 |
| DOC-008 | RFP | 131 | PASS | 26 | 4 | 0/5 | 98.5% | 102.29s | $0.0394 |
| DOC-009 | TENDER | 22 | PASS | 18 | 6 | 1/3 | 100.0% | 61.41s | $0.0145 |
| DOC-010 | RFP | 24 | PASS | 14 | 9 | 5/9 | 100.0% | 49.56s | $0.0106 |
| DOC-011 | RFQ | 23 | PASS | 19 | 9 | 5/7 | 100.0% | 59.52s | $0.0160 |
| DOC-012 | RFQ | 23 | PASS | 15 | 8 | 4/6 | 100.0% | 161.32s | $0.0204 |
| DOC-013 | RFQ | 33 | PASS | 23 | 6 | 4/5 | 100.0% | 74.74s | $0.0133 |
| DOC-014 | RFI | 10 | FAIL (FRR) | 2 | 0 | 0/0 | N/A | 2.05s | $0.0006 |
| DOC-015 | EOI | 5 | PASS | 3 | 3 | 3/3 | 100.0% | 15.93s | $0.0023 |


# Latency Decomposition (Per Document)

**DOC-006**
Queue wait:       N/A (Local Runner)
Qualification:    2.6s
Mapping:          6.3s
Extraction:       42.9s
Reasoning:        15.4s
Validation:       N/A (Local Runner)
-----------------------
E2E:              67.19s

**DOC-007**
Queue wait:       N/A (Local Runner)
Qualification:    1.9s
Mapping:          0.9s
Extraction:       9.8s
Reasoning:        0.0s
Validation:       N/A (Local Runner)
-----------------------
E2E:              12.65s

**DOC-008**
Queue wait:       N/A (Local Runner)
Qualification:    2.6s
Mapping:          35.1s
Extraction:       34.3s
Reasoning:        30.3s
Validation:       N/A (Local Runner)
-----------------------
E2E:              102.29s

**DOC-009**
Queue wait:       N/A (Local Runner)
Qualification:    2.8s
Mapping:          3.7s
Extraction:       28.3s
Reasoning:        26.6s
Validation:       N/A (Local Runner)
-----------------------
E2E:              61.41s

**DOC-010**
Queue wait:       N/A (Local Runner)
Qualification:    2.8s
Mapping:          3.5s
Extraction:       29.5s
Reasoning:        13.8s
Validation:       N/A (Local Runner)
-----------------------
E2E:              49.56s

**DOC-011**
Queue wait:       N/A (Local Runner)
Qualification:    2.4s
Mapping:          4.0s
Extraction:       27.9s
Reasoning:        25.2s
Validation:       N/A (Local Runner)
-----------------------
E2E:              59.52s

**DOC-012**
Queue wait:       N/A (Local Runner)
Qualification:    2.6s
Mapping:          4.0s
Extraction:       76.6s
Reasoning:        78.1s
Validation:       N/A (Local Runner)
-----------------------
E2E:              161.32s

**DOC-013**
Queue wait:       N/A (Local Runner)
Qualification:    2.7s
Mapping:          3.7s
Extraction:       62.1s
Reasoning:        6.3s
Validation:       N/A (Local Runner)
-----------------------
E2E:              74.74s

**DOC-015**
Queue wait:       N/A (Local Runner)
Qualification:    2.7s
Mapping:          1.6s
Extraction:       11.6s
Reasoning:        0.0s
Validation:       N/A (Local Runner)
-----------------------
E2E:              15.93s


# Failure Register

**DOC: DOC-001**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-001**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-001**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-001**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-001**
Missed:
  - Gold concept: Unusual obligations
  - Priority: CRITICAL
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-001**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 2
  - Root cause: Matching / Extraction

**DOC: DOC-001**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 2
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 4
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 6
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 9
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 9
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 13
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 16
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 16
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 26
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 29
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 32
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 33
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 35
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 37
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 37
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 37
  - Root cause: Matching / Extraction

**DOC: DOC-007**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Evidence failure:
  - Generated quote: "A background check must be completed with the Bureau of Criminal Identification and Investigation prior to construction start."
  - Verification result: FAIL
  - Customer impact: MEDIUM
  - Root cause: Evidence Generation

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 2
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 3
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 5
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 5
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 8
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 10
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 10
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 14
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 16
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Unusual obligations
  - Priority: CRITICAL
  - Expected page: 16
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 24
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 25
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 35
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 59
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 60
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 69
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 71
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 76
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 85
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 92
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 96
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 112
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 2
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 3
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 4
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 6
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 9
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 10
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 15
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 17
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 17
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 20
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 22
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Unusual obligations
  - Priority: CRITICAL
  - Expected page: 22
  - Root cause: Matching / Extraction

**DOC: DOC-010**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 2
  - Root cause: Matching / Extraction

**DOC: DOC-010**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 5
  - Root cause: Matching / Extraction

**DOC: DOC-010**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 8
  - Root cause: Matching / Extraction

**DOC: DOC-010**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 13
  - Root cause: Matching / Extraction

**DOC: DOC-010**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 17
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 6
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 8
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 10
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 11
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 17
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 18
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 19
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 20
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 20
  - Root cause: Matching / Extraction

**DOC: DOC-011**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 22
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 6
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 9
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 11
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 17
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 18
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 19
  - Root cause: Matching / Extraction

**DOC: DOC-012**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 21
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 5
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 6
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 9
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 10
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 11
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 14
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 15
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 15
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 16
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 20
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 21
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 21
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 21
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 27
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 30
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 31
  - Root cause: Matching / Extraction

**DOC: DOC-013**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 32
  - Root cause: Matching / Extraction

**DOC: DOC-014**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-014**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 5
  - Root cause: Matching / Extraction

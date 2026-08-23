| Metric | Result |
| ------ | ------ |
| Documents | 15 |
| Qualification FAR | 0.0% |
| Qualification FRR | 9.1% |
| Critical Recall | 56.6% |
| High Recall | 36.7% |
| Overall Gold Recall | 37.9% |
| Critical Miss Rate | 43.4% |
| Evidence Acceptance | 100.0% |
| Critical Evidence Failure | 0.0% |
| p50 E2E | 27.87s |
| p90 E2E | 111.44s |
| Max E2E | 126.18s |
| Avg Cost | $0.0048 |
| p90 Cost | $0.0177 |
| Total ceiling hits | 23 |
| Total splits | 54 |
| Maximum split depth | 3 |
| Identical truncation retries | 0 |
| Reasoning tokens | 0 |
| successful extraction completion rate | 65.7% |
| percentage of extraction requests ending with finish_reason = length | 34.3% |

| ID | Type | Pages | Qualification | Gold Items | Recalled | Critical Recall | Evidence | E2E | Cost |
| -------- | ---- | ----: | :---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DOC-001 | RFP | 2 | PASS | 7 | 6 | 3/3 | 100.0% | 32.14s | $0.0015 |
| DOC-002 | JOB_DESCRIPTION | 1 | PASS | 0 | 0 | 0/0 | N/A | 1.95s | $0.0002 |
| DOC-003 | OTHER | 1 | PASS | 0 | 0 | 0/0 | N/A | 3.43s | $0.0002 |
| DOC-004 | OTHER | 1 | PASS | 0 | 0 | 0/0 | N/A | 2.85s | $0.0002 |
| DOC-005 | OTHER | 1 | PASS | 0 | 0 | 0/0 | N/A | 3.60s | $0.0002 |
| DOC-006 | RFP | 49 | PASS | 32 | 0 | 0/11 | N/A | 111.44s | $0.0000 |
| DOC-007 | RFP | 2 | PASS | 2 | 1 | 1/1 | 100.0% | 17.12s | $0.0013 |
| DOC-008 | RFP | 131 | PASS | 26 | 0 | 0/5 | N/A | 16.75s | $0.0000 |
| DOC-009 | TENDER | 22 | PASS | 18 | 7 | 2/3 | 100.0% | 98.80s | $0.0086 |
| DOC-010 | RFP | 24 | PASS | 14 | 11 | 7/9 | 100.0% | 54.13s | $0.0073 |
| DOC-011 | RFQ | 23 | PASS | 19 | 9 | 5/7 | 100.0% | 108.41s | $0.0140 |
| DOC-012 | RFQ | 23 | PASS | 15 | 9 | 4/6 | 100.0% | 126.18s | $0.0177 |
| DOC-013 | RFQ | 33 | PASS | 23 | 15 | 5/5 | 100.0% | 100.00s | $0.0179 |
| DOC-014 | RFI | 10 | FAIL (FRR) | 2 | 0 | 0/0 | N/A | 27.87s | $0.0015 |
| DOC-015 | EOI | 5 | PASS | 3 | 3 | 3/3 | 100.0% | 21.33s | $0.0014 |


# Latency Decomposition (Per Document)


# Failure Register

**DOC: DOC-001**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 1
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 2
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 3
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
  - Gold concept: Mandatory eligibility
  - Priority: CRITICAL
  - Expected page: 6
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Key dates / deadlines
  - Priority: CRITICAL
  - Expected page: 7
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
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 12
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
  - Expected page: 13
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 14
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
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 20
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 21
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 22
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 24
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 25
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 25
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 26
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 26
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 27
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 29
  - Root cause: Matching / Extraction

**DOC: DOC-006**
Missed:
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 30
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

**DOC: DOC-006**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 44
  - Root cause: Matching / Extraction

**DOC: DOC-007**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 1
  - Root cause: Matching / Extraction

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
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 4
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
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 12
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 14
  - Root cause: Matching / Extraction

**DOC: DOC-008**
Missed:
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 15
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
  - Expected page: 101
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
  - Gold concept: Liability / indemnity
  - Priority: HIGH
  - Expected page: 12
  - Root cause: Matching / Extraction

**DOC: DOC-009**
Missed:
  - Gold concept: Commercial requirements
  - Priority: HIGH
  - Expected page: 12
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
  - Expected page: 13
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
  - Gold concept: Opportunity / scope
  - Priority: MEDIUM
  - Expected page: 14
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
  - Gold concept: Termination rights
  - Priority: HIGH
  - Expected page: 31
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

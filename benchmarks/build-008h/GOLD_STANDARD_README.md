# BUILD-008H Gold Standard Methodology

This document outlines the independent human gold-standard rules used to establish ground truth for the BUILD-008H benchmark. These gold standards were created directly from source PDFs via a hybrid extraction + human review methodology, entirely uninfluenced by previous AI outputs or model evaluations.

## Definition of a Gold-Standard Item
A gold-standard item represents intelligence that a competent pre-bid analyst must recognize. It answers the question:
> "If this information were missed by a pre-bid analyst, could it materially affect the decision to bid, ability to qualify, ability to submit, commercial exposure, contractual exposure, or required preparation?"

Trivial observations or generic headers are explicitly excluded.

## Priority Rules
Gold-standard items are strictly categorized into the following priorities without inflation:

- **CRITICAL:** Eligibility failure, inability to submit, severe/unbounded financial exposure, major mandatory security/financial requirements, material bid disqualification condition.
- **HIGH:** Significant commercial/legal exposure, termination rights, substantial penalties, major mandatory obligations, important evaluation thresholds.
- **MEDIUM:** Meaningful operational requirements, material preparation requirements, moderate commercial obligations.
- **LOW:** Useful but non-decisive information.

## Treatment of Contradictions
A contradiction is only considered a gold-standard contradiction when two statements genuinely and materially conflict. 
It must be recorded with both quotes independently cited and verifiable. Mere wording differences are excluded.

## Treatment of Missing Information
Information is only marked as missing if its absence is genuinely material to a bidder's decision or submission. We do not promote every unspecified detail into a missing-information item.

## Treatment of Cross-Page Evidence
If intelligence spans multiple pages, each relevant page and quote is independently verified and recorded separately to ensure exact structural verification against the source PDF.

## Limitations
- These standards assume a competent generalist bidder perspective. Highly niche technical specifications may be excluded unless they trigger a broad material risk or operational boundary.
- For deceptive or non-procurement documents, the standard reflects only the minimum required identification (e.g., qualifying the document as `DECEPTIVE` or `NON_PROCUREMENT`) along with relevant adversarial risks.

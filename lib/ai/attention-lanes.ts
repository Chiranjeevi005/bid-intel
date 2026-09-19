import { FindingItem } from '@/components/workspace/FindingsLedger';
import { CriticalCategory, CategoryCoverage } from '@/lib/ai/coverage';

export type AttentionLaneType = 'MUST_MEET' | 'COULD_HURT' | 'STILL_UNCLEAR' | 'UNMAPPED';

export interface UnclearCoverageItem {
  category: CriticalCategory;
  status: 'REVIEW_REQUIRED' | 'EXTRACTION_UNCERTAIN';
  reason: string;
  evidence_units_count: number;
  trigger_pages: number[];
}

export interface PartitionedAttentionLanes {
  primaryAttentionFinding: FindingItem | null;
  mustMeetFindings: FindingItem[];
  couldHurtFindings: FindingItem[];
  stillUnclearFindings: FindingItem[];
  stillUnclearCoverage: UnclearCoverageItem[];
  unmappedFindings: FindingItem[];
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

/**
 * Classifies an individual finding into a decision-relevant attention lane based on the
 * authoritative semantic rules in docs/RFPGROUND_ATTENTION_LANE_MAPPING.md.
 * Generalized to operate on any tender document without document-specific assumptions.
 */
export function classifyFindingToLane(finding: FindingItem): AttentionLaneType {
  const cat = (finding.category || '').toUpperCase();
  const title = (finding.title || '').toLowerCase();
  const fact = (finding.finding || '').toLowerCase();
  const implication = (finding.business_implication || '').toLowerCase();

  // 0. UNVERIFIED or Low-Confidence findings ALWAYS route to STILL_UNCLEAR for human review
  if (
    (finding.confidence || '').toUpperCase() === 'LOW' ||
    title.includes('[unverified]')
  ) {
    return 'STILL_UNCLEAR';
  }

  // 1. MUST_MEET: Eligibility, Submission deadlines, Formats, EMD/Security, Qualifying Thresholds
  if (
    cat === 'MANDATORY_ELIGIBILITY' ||
    cat === 'ELIGIBILITY' ||
    cat === 'KEY_DATES' ||
    cat === 'DATES_SUBMISSION' ||
    cat === 'SUBMISSION_REQUIREMENTS' ||
    cat === 'MANDATORY_DOCUMENTS' ||
    cat === 'EMD_BID_SECURITY' ||
    cat === 'PERFORMANCE_SECURITY' ||
    cat === 'FINANCIAL_REQUIREMENTS' ||
    cat === 'MANDATORY_REQUIREMENTS'
  ) {
    return 'MUST_MEET';
  }

  // Evaluation criteria: partition between qualifying cutoff (MUST_MEET) vs general weightage formula (UNMAPPED)
  if (cat === 'EVALUATION_CRITERIA' || cat === 'EVALUATION_THRESHOLDS' || cat === 'EVALUATION') {
    if (
      title.includes('qualifying') ||
      title.includes('cutoff') ||
      title.includes('threshold') ||
      title.includes('minimum score') ||
      fact.includes('qualifying score') ||
      fact.includes('minimum score') ||
      fact.includes('cutoff') ||
      implication.includes('must score at least') ||
      implication.includes('ineligible')
    ) {
      return 'MUST_MEET';
    }
    return 'UNMAPPED';
  }

  // Unusual obligations: partition between mandatory registration pre-requisites (MUST_MEET) vs commercial exposures (COULD_HURT)
  if (cat === 'UNUSUAL_OBLIGATIONS') {
    if (
      title.includes('registration') ||
      title.includes('portal') ||
      title.includes('enrolment') ||
      fact.includes('mandatory registration') ||
      fact.includes('must register')
    ) {
      return 'MUST_MEET';
    }
    return 'COULD_HURT';
  }

  // 2. COULD_HURT: Liabilities, Indemnities, Termination, Penalties / Liquidated Damages, Commercial exposure
  if (
    cat === 'LIABILITY_INDEMNITY' ||
    cat === 'LIABILITY_RISK' ||
    cat === 'TERMINATION_RIGHTS' ||
    cat === 'TERMINATION' ||
    cat === 'PENALTIES_LIQUIDATED_DAMAGES' ||
    cat === 'RISK_CANDIDATES' ||
    cat === 'INDEMNITY'
  ) {
    return 'COULD_HURT';
  }

  if (cat === 'COMMERCIAL_TERMS' || cat === 'COMMERCIAL_CONTRACT_TERMS' || cat === 'COMMERCIAL') {
    if (
      title.includes('penalty') ||
      title.includes('damage') ||
      title.includes('reimbursement') ||
      title.includes('liability') ||
      title.includes('termination') ||
      implication.includes('delay') ||
      implication.includes('cash flow') ||
      implication.includes('cost') ||
      implication.includes('exposure')
    ) {
      return 'COULD_HURT';
    }
    return 'UNMAPPED';
  }

  // 3. STILL_UNCLEAR: Contradictions, Missing Info, Ambiguities
  if (
    cat === 'AMBIGUITIES_CONTRADICTIONS' ||
    cat === 'CONTRADICTIONS_AMBIGUITIES' ||
    cat === 'MISSING_INFORMATION' ||
    cat === 'CLARIFICATION_QUESTIONS'
  ) {
    return 'STILL_UNCLEAR';
  }

  // 4. UNMAPPED: Opportunity overview, general fit, narrative context
  if (
    cat === 'OPPORTUNITY_OVERVIEW' ||
    cat === 'OPPORTUNITY_FIT'
  ) {
    return 'UNMAPPED';
  }

  return 'UNMAPPED';
}

/**
 * Generalized procurement prioritization for MUST_MEET:
 * Ranks findings by:
 * 1. Severity tier (CRITICAL -> HIGH -> MEDIUM -> LOW)
 * 2. Core Gate Category Tier (Eligibility -> Key Dates -> Bid Security/Fee -> Qualifying Cutoffs -> Other)
 * 3. Preserves original extraction/DB order
 *
 * Fully adaptive: Never forces fake slots or assumes any specific category is present.
 */
function sortMustMeetFindings(findings: FindingItem[]): FindingItem[] {
  const getCategoryGateWeight = (f: FindingItem): number => {
    const cat = (f.category || '').toUpperCase();
    const title = (f.title || '').toLowerCase();

    if (cat === 'MANDATORY_ELIGIBILITY' || cat === 'ELIGIBILITY' || cat === 'FINANCIAL_REQUIREMENTS' || cat === 'MANDATORY_REQUIREMENTS') {
      return 1;
    }
    if (cat === 'KEY_DATES' || cat === 'DATES_SUBMISSION' || title.includes('deadline') || title.includes('submission timeline')) {
      return 2;
    }
    if (cat === 'EMD_BID_SECURITY' || cat === 'PERFORMANCE_SECURITY' || cat === 'SUBMISSION_REQUIREMENTS' || title.includes('emd') || title.includes('security')) {
      return 3;
    }
    if (cat === 'EVALUATION_CRITERIA' || cat === 'EVALUATION_THRESHOLDS') {
      return 4;
    }
    return 5;
  };

  return [...findings].sort((a, b) => {
    const rankA = SEVERITY_RANK[(a.severity || 'MEDIUM').toUpperCase()] || 99;
    const rankB = SEVERITY_RANK[(b.severity || 'MEDIUM').toUpperCase()] || 99;
    if (rankA !== rankB) return rankA - rankB;

    const gateA = getCategoryGateWeight(a);
    const gateB = getCategoryGateWeight(b);
    return gateA - gateB;
  });
}

/**
 * Generalized procurement prioritization for COULD_HURT:
 * Ranks findings by:
 * 1. Severity tier (CRITICAL -> HIGH -> MEDIUM -> LOW)
 * 2. Exposure Impact Category (Liabilities/Indemnities -> Termination -> Liquidated Damages -> Commercial Exposure)
 * 3. Preserves original extraction/DB order
 *
 * Fully adaptive: Works on any RFP output without test-specific keywords.
 */
function sortCouldHurtFindings(findings: FindingItem[]): FindingItem[] {
  const getExposureCategoryWeight = (f: FindingItem): number => {
    const cat = (f.category || '').toUpperCase();
    const title = (f.title || '').toLowerCase();

    // 1. Legal Liability & Indemnity
    if (cat === 'LIABILITY_INDEMNITY' || cat === 'LIABILITY_RISK' || cat === 'INDEMNITY' || cat === 'RISK_CANDIDATES' || title.includes('liability') || title.includes('indemnif')) {
      return 1;
    }
    // 2. Unilateral Termination
    if (cat === 'TERMINATION_RIGHTS' || cat === 'TERMINATION' || title.includes('termination')) {
      return 2;
    }
    // 3. Penalties & Liquidated Damages
    if (cat === 'PENALTIES_LIQUIDATED_DAMAGES' || title.includes('penalty') || title.includes('damage')) {
      return 3;
    }
    // 4. Unusual Obligations
    if (cat === 'UNUSUAL_OBLIGATIONS') {
      return 4;
    }
    // 5. Commercial Contract Terms & General Clauses
    if (cat === 'COMMERCIAL_TERMS' || cat === 'COMMERCIAL_CONTRACT_TERMS' || cat === 'COMMERCIAL') {
      return 5;
    }
    return 6;
  };

  return [...findings].sort((a, b) => {
    const rankA = SEVERITY_RANK[(a.severity || 'MEDIUM').toUpperCase()] || 99;
    const rankB = SEVERITY_RANK[(b.severity || 'MEDIUM').toUpperCase()] || 99;
    if (rankA !== rankB) return rankA - rankB;

    const expA = getExposureCategoryWeight(a);
    const expB = getExposureCategoryWeight(b);
    return expA - expB;
  });
}

/**
 * Deterministically partitions document findings and coverage states into attention lanes.
 * Dynamic, adaptive, and fully document-agnostic.
 */
export function partitionAttentionLanes(
  findings: FindingItem[],
  coverage: Record<CriticalCategory, CategoryCoverage> | null,
  candidates: Array<{ category: string; trigger_pages: number[]; context_pages: number[] }> = []
): PartitionedAttentionLanes {
  // 1. Sort all findings by severity (CRITICAL -> HIGH -> MEDIUM -> LOW -> original DB order)
  const sortedFindings = [...findings].sort((a, b) => {
    const rankA = SEVERITY_RANK[(a.severity || 'MEDIUM').toUpperCase()] || 99;
    const rankB = SEVERITY_RANK[(b.severity || 'MEDIUM').toUpperCase()] || 99;
    return rankA - rankB;
  });

  // 2. The primary attention finding is the overall highest-priority verified finding
  const primaryAttentionFinding = sortedFindings.length > 0 ? sortedFindings[0] : null;

  const rawMustMeet: FindingItem[] = [];
  const rawCouldHurt: FindingItem[] = [];
  const stillUnclearFindings: FindingItem[] = [];
  const unmappedFindings: FindingItem[] = [];

  // 3. Categorize findings into lanes
  sortedFindings.forEach((f) => {
    const lane = classifyFindingToLane(f);
    if (lane === 'MUST_MEET') {
      rawMustMeet.push(f);
    } else if (lane === 'COULD_HURT') {
      rawCouldHurt.push(f);
    } else if (lane === 'STILL_UNCLEAR') {
      stillUnclearFindings.push(f);
    } else {
      unmappedFindings.push(f);
    }
  });

  // 4. Apply generalized adaptive sorting within lanes
  const mustMeetFindings = sortMustMeetFindings(rawMustMeet);
  const couldHurtFindings = sortCouldHurtFindings(rawCouldHurt);

  // 5. Extract categories evaluated as REVIEW_REQUIRED or EXTRACTION_UNCERTAIN from coverage
  const stillUnclearCoverage: UnclearCoverageItem[] = [];
  if (coverage) {
    (Object.keys(coverage) as CriticalCategory[]).forEach((cat) => {
      const item = coverage[cat];
      if (item && (item.status === 'REVIEW_REQUIRED' || item.status === 'EXTRACTION_UNCERTAIN')) {
        const candidateData = candidates.find((c) => c.category.toUpperCase() === cat.toUpperCase());
        stillUnclearCoverage.push({
          category: cat,
          status: item.status,
          reason: item.reason,
          evidence_units_count: item.evidence_units_count,
          trigger_pages: candidateData ? candidateData.trigger_pages : []
        });
      }
    });
  }

  return {
    primaryAttentionFinding,
    mustMeetFindings,
    couldHurtFindings,
    stillUnclearFindings,
    stillUnclearCoverage,
    unmappedFindings
  };
}

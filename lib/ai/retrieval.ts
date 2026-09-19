import { Category, CategoryEnum } from './schema';

export const PROCUREMENT_LEXICON: Record<Category, string[]> = {
  ELIGIBILITY: [
    'eligibility', 'qualification', 'mandatory', 'must have', 'turnover', 'experience', 'certification', 'iso', 'financial capacity', 'minimum criteria', 'pre-qualification', 'eligible bidder', 'net worth', 'financial turnover', 'similar work'
  ],
  DATES_SUBMISSION: [
    'submission', 'deadline', 'due date', 'emd', 'earnest money', 'security deposit', 'format of proposal', 'how to apply', 'portal', 'upload', 'schedule', 'timeline', 'key dates', 'important dates', 'q&a', 'clarification', 'validity', 'closing date', 'days', 'calendar days', 'working days', 'bid submission', 'pre-bid'
  ],
  EVALUATION: [
    'evaluation', 'scoring', 'weight', 'weightage', 'criteria', 'technical score', 'financial score', 'qcbs', 'l1', 'minimum qualifying', 'threshold', 'marks', 'disqualification'
  ],
  COMMERCIAL: [
    'payment', 'pricing', 'milestone', 'invoice', 'penalty', 'liquidated damages', 'sla', 'service level agreement', 'warranty', 'taxes', 'reimbursement', 'financial obligation', 'sponsorship', 'funding obligation'
  ],
  LIABILITY_RISK: [
    'liability', 'indemnity', 'indemnification', 'damages', 'hold harmless', 'consequential', 'indirect damages', 'liability cap', 'vicarious', 'loss', 'claim', 'warranties', 'unilateral', 'unusual'
  ],
  TERMINATION: [
    'termination', 'terminate', 'breach', 'default', 'convenience', 'force majeure', 'suspension', 'cancel', 'suspend', 'termination without cause'
  ],
  CONTRADICTIONS_AMBIGUITIES: [
    // This category is primarily handled by cross-referencing and AI, but we can seed it with structural keywords.
    'notwithstanding', 'subject to', 'conflict', 'inconsistency', 'ambiguity', 'prevail', 'supersede', 'amendment', 'corrigendum'
  ]
};

const EXPANSION_MARKERS = [
  'as stated above',
  'as mentioned earlier',
  'in accordance with clause',
  'refer to section',
  'as per annexure',
  'defined in section',
  'the aforesaid',
  'hereunder',
  'subject to clause'
];

export interface CandidateSet {
  category: Category;
  trigger_pages: number[];
  context_pages: number[];
  context_expansion_reason?: string[];
}

/**
 * Deterministically scans document pages for category keywords.
 * Applies context expansion (Page N-1, N, N+1) and checks for cross-reference markers for further expansion.
 */
export function getCategoryCandidates(pages: { page_number: number; content: string }[]): CandidateSet[] {
  const candidateSets: Record<string, CandidateSet> = {};

  // Initialize candidate sets
  for (const category of CategoryEnum.options) {
    candidateSets[category] = {
      category: category as Category,
      trigger_pages: [],
      context_pages: [],
      context_expansion_reason: []
    };
  }

  const pageContents = new Map(pages.map(p => [p.page_number, p.content.toLowerCase()]));

  for (const page of pages) {
    const text = page.content.toLowerCase();

    for (const [category, keywords] of Object.entries(PROCUREMENT_LEXICON)) {
      if (keywords.length === 0) continue;
      
      const hasHit = keywords.some(keyword => text.includes(keyword.toLowerCase()));
      
      if (hasHit) {
        const set = candidateSets[category];
        if (!set.trigger_pages.includes(page.page_number)) {
          set.trigger_pages.push(page.page_number);
        }

        // Base expansion: N-1, N, N+1
        const toAdd = [page.page_number - 1, page.page_number, page.page_number + 1];
        
        // Check for expansion markers in the trigger page
        let expanded = false;
        for (const marker of EXPANSION_MARKERS) {
          if (text.includes(marker)) {
            expanded = true;
            if (!set.context_expansion_reason?.includes(marker)) {
              set.context_expansion_reason?.push(marker);
            }
            break;
          }
        }

        if (expanded) {
          // If expansion marker found, aggressively pull N-2 and N+2
          toAdd.push(page.page_number - 2);
          toAdd.push(page.page_number + 2);
        }

        for (const pg of toAdd) {
          // Only add valid pages
          if (pageContents.has(pg) && !set.context_pages.includes(pg)) {
            set.context_pages.push(pg);
          }
        }
      }
    }
  }

  // Sort context pages
  for (const set of Object.values(candidateSets)) {
    set.context_pages.sort((a, b) => a - b);
    set.trigger_pages.sort((a, b) => a - b);
  }

  return Object.values(candidateSets);
}

export interface PageCoverageAudit {
  total_pages: number;
  evaluated_pages: number[];
  unexamined_pages: number[];
  evaluated_count: number;
  unexamined_count: number;
  evaluation_percentage: number;
}

/**
 * Deterministically computes page evaluation accounting:
 * - evaluated_pages: union of all context pages sent to category AI extraction
 * - unexamined_pages: pages in document never matched by any category candidate set
 */
export function getPageCoverageAudit(
  pages: { page_number: number; content: string }[],
  candidateSets: CandidateSet[]
): PageCoverageAudit {
  const evaluatedSet = new Set<number>();
  candidateSets.forEach((set) => {
    set.context_pages.forEach((p) => evaluatedSet.add(p));
  });

  const evaluated_pages = Array.from(evaluatedSet).sort((a, b) => a - b);
  const total_pages = pages.length;
  const unexamined_pages = pages
    .map((p) => p.page_number)
    .filter((p) => !evaluatedSet.has(p))
    .sort((a, b) => a - b);

  return {
    total_pages,
    evaluated_pages,
    unexamined_pages,
    evaluated_count: evaluated_pages.length,
    unexamined_count: unexamined_pages.length,
    evaluation_percentage: total_pages > 0 ? Math.round((evaluated_pages.length / total_pages) * 100) : 0
  };
}

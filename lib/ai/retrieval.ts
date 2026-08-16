import { CategoryEnum } from './schema';
import { Category } from './schema';

export const PROCUREMENT_LEXICON: Record<Category, string[]> = {
  OPPORTUNITY_FIT: [
    'scope of work', 'background', 'objective', 'overview', 'project description', 'deliverables', 'purpose of this rfp'
  ],
  MANDATORY_ELIGIBILITY: [
    'eligibility', 'qualification', 'mandatory', 'must have', 'turnover', 'experience', 'certification', 'iso', 'financial capacity', 'minimum criteria'
  ],
  SUBMISSION_REQUIREMENTS: [
    'submission', 'deadline', 'due date', 'emd', 'earnest money', 'security deposit', 'format of proposal', 'how to apply', 'portal', 'upload'
  ],
  KEY_DATES: [
    'schedule', 'timeline', 'key dates', 'important dates', 'q&a', 'clarification', 'validity', 'closing date'
  ],
  EVALUATION_CRITERIA: [
    'evaluation', 'scoring', 'weight', 'weightage', 'criteria', 'technical score', 'financial score', 'qcbs', 'l1'
  ],
  COMMERCIAL_TERMS: [
    'payment', 'pricing', 'milestone', 'invoice', 'penalty', 'liquidated damages', 'sla', 'service level agreement', 'warranty', 'taxes'
  ],
  LIABILITY_INDEMNITY: [
    'liability', 'indemnity', 'indemnification', 'damages', 'hold harmless', 'consequential', 'indirect damages', 'liability cap'
  ],
  TERMINATION_RIGHTS: [
    'termination', 'terminate', 'breach', 'default', 'convenience', 'force majeure', 'suspension', 'cancel'
  ],
  UNUSUAL_OBLIGATIONS: [
    'intellectual property', 'ip rights', 'escrow', 'audit rights', 'exclusivity', 'non-compete', 'step-in rights'
  ],
  AMBIGUITIES_CONTRADICTIONS: [], // Handled by AI, not keywords
  MISSING_INFORMATION: [] // Handled by AI, not keywords
};

/**
 * Deterministically scans a page's content for keywords associated with each category.
 * Returns an array of Categories that had keyword hits on this page.
 */
export function getKeywordSignalsForPage(content: string): Category[] {
  const text = content.toLowerCase();
  const signals: Category[] = [];

  for (const [category, keywords] of Object.entries(PROCUREMENT_LEXICON)) {
    if (keywords.length === 0) continue;
    
    // Check if any keyword in this category is present in the text
    const hasHit = keywords.some(keyword => text.includes(keyword.toLowerCase()));
    
    if (hasHit) {
      signals.push(category as Category);
    }
  }

  return signals;
}

/**
 * Consolidates AI mapped signals and deterministic keyword signals for a document.
 */
export function consolidatePageSignals(
  pages: { page_number: number; content: string }[],
  aiMappedSignals?: { page_number: number, signals: Category[] }[]
): Record<number, Category[]> {
  const consolidated: Record<number, Category[]> = {};

  for (const page of pages) {
    // 1. Get deterministic signals
    const keywordSignals = getKeywordSignalsForPage(page.content);
    
    // 2. Get AI signals for this page
    const aiSignals = aiMappedSignals?.find(m => m.page_number === page.page_number)?.signals || [];
    
    // 3. Union
    const combinedSet = new Set([...keywordSignals, ...aiSignals]);
    consolidated[page.page_number] = Array.from(combinedSet);
  }

  return consolidated;
}

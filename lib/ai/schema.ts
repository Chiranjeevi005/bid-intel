import { z } from 'zod';

export const CategoryEnum = z.enum([
  'OPPORTUNITY_OVERVIEW',
  'KEY_DATES',
  'MANDATORY_REQUIREMENTS',
  'SUBMISSION_REQUIREMENTS',
  'EVALUATION_CRITERIA',
  'COMMERCIAL_CONTRACT_TERMS',
  'RISK_CANDIDATES',
  'AMBIGUITIES_CONTRADICTIONS',
  'CLARIFICATION_QUESTIONS'
]);

export const SeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const ConfidenceEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const FindingSchema = z.object({
  category: CategoryEnum,
  title: z.string().min(1),
  finding: z.string().min(1),
  severity: SeverityEnum.optional(),
  confidence: ConfidenceEnum,
  status: z.enum(['CONFIRMED', 'UNSUPPORTED']),
  quotes: z.array(z.object({
    page_number: z.number().int(),
    quote: z.string().min(1)
  })).optional()
}).refine((data) => {
  // If confirmed, quotes must be present and have at least 1 item
  if (data.status === 'CONFIRMED') {
    if (!data.quotes || data.quotes.length === 0) return false;
    
    // Contradictions MUST have at least 2 quotes
    if (data.category === 'AMBIGUITIES_CONTRADICTIONS' && data.quotes.length < 2) {
      return false;
    }
  }
  return true;
}, {
  message: "Confirmed findings must include quotes. Contradictions must have at least 2 quotes."
});

export const AnalysisResultSchema = z.object({
  findings: z.array(FindingSchema)
});

export type Category = z.infer<typeof CategoryEnum>;
export type Severity = z.infer<typeof SeverityEnum>;
export type Confidence = z.infer<typeof ConfidenceEnum>;
export type Finding = z.infer<typeof FindingSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

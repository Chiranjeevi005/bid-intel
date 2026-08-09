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
  page_number: z.number().int().nullable().optional(),
  evidence: z.string().nullable().optional() // Verbatim source quotation
}).refine((data) => {
  // If confirmed, evidence and page_number must be present
  if (data.status === 'CONFIRMED') {
    return data.page_number !== null && data.page_number !== undefined && 
           data.evidence !== null && data.evidence !== undefined && data.evidence.length > 0;
  }
  return true;
}, {
  message: "Confirmed findings MUST include a page_number and verbatim evidence quote."
});

export const AnalysisResultSchema = z.object({
  findings: z.array(FindingSchema)
});

export type Category = z.infer<typeof CategoryEnum>;
export type Severity = z.infer<typeof SeverityEnum>;
export type Confidence = z.infer<typeof ConfidenceEnum>;
export type Finding = z.infer<typeof FindingSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

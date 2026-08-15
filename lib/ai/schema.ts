import { z } from 'zod';

export const CategoryEnum = z.enum([
  'OPPORTUNITY_FIT',
  'MANDATORY_ELIGIBILITY',
  'SUBMISSION_REQUIREMENTS',
  'KEY_DATES',
  'EVALUATION_CRITERIA',
  'COMMERCIAL_TERMS',
  'LIABILITY_INDEMNITY',
  'TERMINATION_RIGHTS',
  'UNUSUAL_OBLIGATIONS',
  'AMBIGUITIES_CONTRADICTIONS',
  'MISSING_INFORMATION'
]);

export const PriorityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const ConfidenceEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const StatusEnum = z.enum(['CONFIRMED', 'UNSUPPORTED']);

export const QuoteSchema = z.object({
  page_number: z.number().int(),
  quote: z.string().min(1)
});

export const FindingSchema = z.object({
  category: CategoryEnum,
  title: z.string().min(1),
  fact: z.string().min(1),
  business_implication: z.string().optional(),
  action_recommendation: z.string().optional(),
  priority: PriorityEnum,
  confidence: ConfidenceEnum,
  status: StatusEnum,
  quotes: z.array(QuoteSchema).optional()
}).superRefine((data, ctx) => {
  if (data.status === 'CONFIRMED' && (!data.quotes || data.quotes.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CONFIRMED findings MUST have at least 1 quote." });
  }
  if (data.status === 'CONFIRMED' && data.category === 'AMBIGUITIES_CONTRADICTIONS' && (!data.quotes || data.quotes.length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "AMBIGUITIES_CONTRADICTIONS findings MUST have at least 2 quotes." });
  }
});

export const AnalysisResultSchema = z.object({
  findings: z.array(FindingSchema)
});

export type Category = z.infer<typeof CategoryEnum>;
export type Priority = z.infer<typeof PriorityEnum>;
export type Confidence = z.infer<typeof ConfidenceEnum>;
export type Status = z.infer<typeof StatusEnum>;
export type Quote = z.infer<typeof QuoteSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

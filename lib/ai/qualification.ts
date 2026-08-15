import { z } from 'zod';
import { QUALIFICATION_SYSTEM_PROMPT, buildQualificationUserPrompt } from './prompts';

export const DocumentTypeEnum = z.enum([
  'BID',
  'RFP',
  'TENDER',
  'RFQ',
  'RFI',
  'EOI',
  'PROCUREMENT_NOTICE',
  'JOB_DESCRIPTION',
  'INVOICE',
  'BROCHURE',
  'POLICY',
  'CONTRACT',
  'OTHER',
  'UNKNOWN'
]);

export const DocumentQualificationSchema = z.object({
  is_procurement_opportunity: z.boolean(),
  document_type: DocumentTypeEnum,
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reason: z.string().min(1),
  quotes: z.array(z.object({
    page_number: z.number().int(),
    quote: z.string().min(1)
  })).min(1)
});

export type DocumentQualification = z.infer<typeof DocumentQualificationSchema>;

export async function qualifyDocument(pages: { page_number: number; content: string }[]): Promise<{ result: DocumentQualification, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
  }

  const userPrompt = buildQualificationUserPrompt(pages);

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: QUALIFICATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("DeepSeek API Error (Qualification):", errorText);
    throw new Error(`DeepSeek API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  
  if (!rawContent) {
    throw new Error("Empty response from DeepSeek API during qualification");
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    console.error("Failed to parse DeepSeek JSON response (Qualification):", rawContent);
    throw new Error("Invalid JSON returned by provider");
  }

  const validationResult = DocumentQualificationSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error("Schema validation failed (Qualification):", validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  return { result: validationResult.data, usage: data.usage };
}

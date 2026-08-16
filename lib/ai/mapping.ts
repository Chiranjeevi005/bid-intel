import { z } from 'zod';
import { MAPPING_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import { CategoryEnum } from './schema';

export const PageSignalSchema = z.object({
  page_number: z.number().int(),
  signals: z.array(CategoryEnum)
});

export const DocumentMapSchema = z.object({
  page_maps: z.array(PageSignalSchema)
});

export type DocumentMap = z.infer<typeof DocumentMapSchema>;

export async function mapDocumentPages(pages: { page_number: number; content: string }[]): Promise<{ result: DocumentMap, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
  }

  const userPrompt = buildUserPrompt(pages);

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: MAPPING_SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" }
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
    console.error("DeepSeek API Error (Mapping):", errorText);
    throw new Error(`DeepSeek API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  
  if (!rawContent) {
    throw new Error("Empty response from DeepSeek API during mapping");
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    console.error("Failed to parse DeepSeek JSON response (Mapping):", rawContent);
    throw new Error("Invalid JSON returned by provider");
  }

  const validationResult = DocumentMapSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error("Schema validation failed (Mapping):", validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  return { result: validationResult.data, usage: data.usage };
}

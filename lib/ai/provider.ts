import { AnalysisResult, AnalysisResultSchema } from './schema';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';

export async function analyzeRfpPages(pages: { page_number: number; content: string }[]): Promise<AnalysisResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY environment variable.");
  }

  const userPrompt = buildUserPrompt(pages);

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
    console.error("DeepSeek API Error:", errorText);
    throw new Error(`DeepSeek API returned status ${response.status}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  
  if (!rawContent) {
    throw new Error("Empty response from DeepSeek API");
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    console.error("Failed to parse DeepSeek JSON response:", rawContent);
    throw new Error("Invalid JSON returned by provider");
  }

  // Enforce schema validation
  const validationResult = AnalysisResultSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error("Schema validation failed:", validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  return validationResult.data;
}

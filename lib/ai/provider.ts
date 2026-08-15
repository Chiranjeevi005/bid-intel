import { AnalysisResult, AnalysisResultSchema } from './schema';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';

export async function analyzeRfpPages(pages: { page_number: number; content: string }[]): Promise<{ result: AnalysisResult, usage: any }> {
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
    temperature: 0.1,
    thinking: { type: "disabled" } // BUILD-008H Safeguard: Force thinking disabled
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
    console.error("Schema validation failed on output:", validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  // Cost calculation based on DeepSeek pricing (2026-08-15)
  // Input: $0.14 per 1M tokens
  // Output: $0.28 per 1M tokens
  // Cached: $0.014 per 1M tokens
  const usage = data.usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const cachedTokens = usage.prompt_cache_hit_tokens || 0;
  const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens || 0;
  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
  
  // Calculate cost in dollars, then convert to cents
  const costDollars = 
    (uncachedPromptTokens / 1_000_000) * 0.14 +
    (cachedTokens / 1_000_000) * 0.014 +
    (completionTokens / 1_000_000) * 0.28;
  const estimatedCostCents = costDollars * 100;

  const enrichedUsage = {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: usage.total_tokens || 0,
    cached_tokens: cachedTokens,
    reasoning_tokens: reasoningTokens,
    estimated_cost_cents: estimatedCostCents
  };

  return { result: validationResult.data, usage: enrichedUsage };
}

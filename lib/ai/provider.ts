import { AnalysisResult, AnalysisResultSchema, FindingSchema, Finding } from './schema';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';

function getEnrichedUsage(data: any) {
  const usage = data.usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const cachedTokens = usage.prompt_cache_hit_tokens || 0;
  const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens || 0;
  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
  
  const costDollars = 
    (uncachedPromptTokens / 1_000_000) * 0.14 +
    (cachedTokens / 1_000_000) * 0.014 +
    (completionTokens / 1_000_000) * 0.28;
    
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: usage.total_tokens || 0,
    cached_tokens: cachedTokens,
    reasoning_tokens: reasoningTokens,
    estimated_cost_cents: costDollars * 100
  };
}

export async function analyzeBatch(
  pages: { page_number: number; content: string }[],
  batchName: string
): Promise<{ result: AnalysisResult, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable.");

  const userPrompt = buildUserPrompt(pages);

  // We could dynamically adjust SYSTEM_PROMPT based on batchName here, 
  // but for now we rely on the full schema mapping since it's the same schema.
  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT + `\n\nFocus on categories relevant to: ${batchName}` },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" } 
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`DeepSeek API returned status ${response.status}`);

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("Empty response from DeepSeek API");

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    throw new Error("Invalid JSON returned by provider");
  }

  const validationResult = AnalysisResultSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error(`Schema validation failed on ${batchName} batch:`, validationResult.error);
    throw new Error("Model response failed schema validation");
  }

  return { result: validationResult.data, usage: getEnrichedUsage(data) };
}

export async function reasoningReview(
  finding: Finding,
  pages: { page_number: number; content: string }[]
): Promise<{ result: Finding, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable.");

  const reviewPrompt = `
You are a senior legal and commercial procurement expert.
Review the following finding that was flagged for deep reasoning.
Your task is to analyze the quotes, resolve any contradictions or ambiguities, 
and produce a highly accurate, structured output for this specific finding.

Original Finding:
${JSON.stringify(finding, null, 2)}

Context pages:
${pages.map(p => `--- PAGE ${p.page_number} ---\n${p.content}`).join('\n\n')}

Return ONLY valid JSON matching the Finding schema. Do not change the status unless unsupported.

CRITICAL RULES FOR "status" AND "quotes":
1. 'status' MUST be exactly "CONFIRMED" or "UNSUPPORTED".
2. If you report a valid finding, 'status' MUST be "CONFIRMED" and you MUST provide at least 1 exact quote.
3. If category is "AMBIGUITIES_CONTRADICTIONS", you MUST provide at least 2 exact quotes.
4. If you cannot find a quote for a finding, you MUST either omit the finding entirely, or use status "UNSUPPORTED" (e.g. for "MISSING_INFORMATION"). Do NOT output findings with 'status' "CONFIRMED" if you have no quotes.
`;

  const requestBody = {
    model: model, // Using same model, but we enable thinking
    messages: [
      { role: "user", content: reviewPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    // Enable reasoning (deepseek r1 / thinking mode)
    // Note: If using deepseek-v4-flash, it might not support thinking, but we leave it default 
    // or use a reasoning model if configured. Let's assume the API handles it or requires a specific model.
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`DeepSeek API returned status ${response.status} during reasoning review`);

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("Empty response from DeepSeek API");

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    throw new Error("Invalid JSON returned by provider");
  }

  const validationResult = FindingSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    console.error("Schema validation failed on reasoning review:", validationResult.error);
    throw new Error("Model response failed schema validation during reasoning");
  }

  return { result: validationResult.data, usage: getEnrichedUsage(data) };
}

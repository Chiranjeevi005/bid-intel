import { AnalysisResult, AnalysisResultSchema, FindingSchema, Finding } from './schema';
import { 
  SYSTEM_PROMPT, buildUserPrompt,
  N2_SYSTEM_PROMPT,
  N3_SYSTEM_PROMPT, buildN3UserPrompt,
  N4_PASS_A_PROMPT, buildN4PassAUserPrompt,
  N4_PASS_B_PROMPT, buildN4PassBUserPrompt
} from './prompts';
import { getMaxTokensExtraction, analyzeCeiling, CeilingAnalysis } from './splitter';

function getEnrichedUsage(data: any) {
  const usage = data.usage || {};
  const promptTokens = usage.prompt_tokens || 0;
  const completionTokens = usage.completion_tokens || 0;
  const cachedTokens = usage.prompt_cache_hit_tokens || 0;
  const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens || 0;
  const uncachedPromptTokens = Math.max(0, promptTokens - cachedTokens);
  
  const tokenCost = 
    (uncachedPromptTokens / 1_000_000) * 0.14 +
    (cachedTokens / 1_000_000) * 0.014 +
    (completionTokens / 1_000_000) * 0.28;
    
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: usage.total_tokens || 0,
    cached_tokens: cachedTokens,
    reasoning_tokens: reasoningTokens,
    estimated_cost_cents: tokenCost * 100
  };
}

// ---------------------------------------------------------------------------
// K1: Extraction batch response — now includes ceiling telemetry
// ---------------------------------------------------------------------------

export interface AnalyzeBatchResponse {
  result: AnalysisResult;
  usage: ReturnType<typeof getEnrichedUsage>;
  finish_reason: string;
  ceiling: CeilingAnalysis;
}

export async function analyzeBatch(
  pages: { page_number: number; content: string }[],
  batchName: string,
  targetCategory: string
): Promise<AnalyzeBatchResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  const strategy = process.env.EXTRACTION_STRATEGY || 'N1';

  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable.");

  if (strategy === 'N4') {
    return analyzeBatchTwoPass(pages, batchName, targetCategory, apiKey, model);
  }

  let systemPrompt = SYSTEM_PROMPT;
  let userPrompt = buildUserPrompt(pages, targetCategory);

  if (strategy === 'N2') {
    systemPrompt = N2_SYSTEM_PROMPT;
  } else if (strategy === 'N3') {
    systemPrompt = N3_SYSTEM_PROMPT;
    userPrompt = buildN3UserPrompt(pages, targetCategory);
  } else if (strategy === 'O1') {
    if (targetCategory === 'ELIGIBILITY') systemPrompt = require('./prompts').O1_ELIGIBILITY_PROMPT;
    else if (targetCategory === 'DATES_SUBMISSION') systemPrompt = require('./prompts').O1_DATES_PROMPT;
    else if (targetCategory === 'COMMERCIAL') systemPrompt = require('./prompts').O1_COMMERCIAL_PROMPT;
    else if (targetCategory === 'LIABILITY_RISK') systemPrompt = require('./prompts').O1_LEGAL_PROMPT;
    else if (targetCategory === 'EVALUATION') systemPrompt = require('./prompts').O1_EVALUATION_PROMPT;
    else systemPrompt = SYSTEM_PROMPT; // fallback
    userPrompt = require('./prompts').buildO1UserPrompt(pages);
  }

  const maxTokens = getMaxTokensExtraction();

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt + `\n\nFocus on categories relevant to: ${batchName}` },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" },
    max_tokens: maxTokens,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`DeepSeek API returned status ${response.status}`);

  const data = await response.json();
  const choice = data.choices?.[0];
  const rawContent = choice?.message?.content;
  const finishReason: string = choice?.finish_reason ?? 'unknown';

  if (!rawContent) throw new Error("Empty response from DeepSeek API");

  // K1: Compute ceiling analysis before any further processing
  const usage = getEnrichedUsage(data);
  const ceiling = analyzeCeiling(finishReason, usage.completion_tokens);

  if (ceiling.budget_warning) {
    console.warn(`[provider] Budget WARNING on batch "${batchName}": ${(ceiling.output_budget_ratio * 100).toFixed(1)}% of max_tokens used (finish_reason=${finishReason})`);
  }
  if (ceiling.budget_high) {
    console.warn(`[provider] Budget HIGH on batch "${batchName}": ${(ceiling.output_budget_ratio * 100).toFixed(1)}% — candidate for splitting next run`);
  }

  // K3: If finish_reason === "length", throw immediately with a typed error so
  // the caller (analyzeBatchBounded) can split rather than retry.
  if (ceiling.ceiling_hit) {
    const err: any = new Error(`OUTPUT_CEILING: batch "${batchName}" hit max_tokens (${usage.completion_tokens}/${maxTokens}). DO NOT retry identical payload.`);
    err.code = 'OUTPUT_CEILING';
    err.ceiling = ceiling;
    err.usage = usage;
    err.finish_reason = finishReason;
    throw err;
  }

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

  return { result: validationResult.data, usage, finish_reason: finishReason, ceiling };
}

async function analyzeBatchTwoPass(
  pages: { page_number: number; content: string }[],
  batchName: string,
  targetCategory: string,
  apiKey: string,
  model: string
): Promise<AnalyzeBatchResponse> {
  const maxTokens = getMaxTokensExtraction();

  // PASS A: Extract Candidate Passages
  const passARequest = {
    model: model,
    messages: [
      { role: "system", content: N4_PASS_A_PROMPT },
      { role: "user", content: buildN4PassAUserPrompt(pages, targetCategory) }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" },
    max_tokens: maxTokens,
  };

  const responseA = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(passARequest)
  });

  if (!responseA.ok) throw new Error(`DeepSeek API Pass A returned status ${responseA.status}`);
  const dataA = await responseA.json();
  const rawContentA = dataA.choices?.[0]?.message?.content;
  if (!rawContentA) throw new Error("Empty Pass A response");

  let parsedA;
  try {
    parsedA = JSON.parse(rawContentA);
  } catch (e) {
    throw new Error("Invalid JSON returned in Pass A");
  }

  const passages: { page_number: number, exact_quote: string }[] = parsedA.passages || [];

  // Deterministic quote verification
  const verifiedPassages = passages.filter(p => {
    const page = pages.find(pg => pg.page_number === p.page_number);
    if (!page) return false;
    
    // Normalize spaces for simple verification
    const normalizedQuote = p.exact_quote.replace(/\\s+/g, ' ').trim();
    const normalizedPage = page.content.replace(/\\s+/g, ' ');
    return normalizedPage.includes(normalizedQuote);
  });

  const usageA = getEnrichedUsage(dataA);

  if (verifiedPassages.length === 0) {
    return {
      result: { findings: [] },
      usage: usageA,
      finish_reason: dataA.choices?.[0]?.finish_reason ?? 'stop',
      ceiling: analyzeCeiling(dataA.choices?.[0]?.finish_reason ?? 'stop', usageA.completion_tokens)
    };
  }

  // PASS B: Convert to Findings
  const passBRequest = {
    model: model,
    messages: [
      { role: "system", content: N4_PASS_B_PROMPT },
      { role: "user", content: buildN4PassBUserPrompt(verifiedPassages, targetCategory) }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" },
    max_tokens: maxTokens,
  };

  const responseB = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(passBRequest)
  });

  if (!responseB.ok) throw new Error(`DeepSeek API Pass B returned status ${responseB.status}`);
  const dataB = await responseB.json();
  const rawContentB = dataB.choices?.[0]?.message?.content;
  const finishReasonB = dataB.choices?.[0]?.finish_reason ?? 'unknown';

  let parsedB;
  try {
    parsedB = JSON.parse(rawContentB || "{}");
  } catch (e) {
    throw new Error("Invalid JSON returned in Pass B");
  }

  const validationResult = AnalysisResultSchema.safeParse(parsedB);
  if (!validationResult.success) {
    console.error(`Schema validation failed on ${batchName} Pass B:`, validationResult.error);
    throw new Error("Model response failed schema validation in Pass B");
  }

  const usageB = getEnrichedUsage(dataB);
  const totalUsage = {
    prompt_tokens: usageA.prompt_tokens + usageB.prompt_tokens,
    completion_tokens: usageA.completion_tokens + usageB.completion_tokens,
    total_tokens: usageA.total_tokens + usageB.total_tokens,
    cached_tokens: usageA.cached_tokens + usageB.cached_tokens,
    reasoning_tokens: usageA.reasoning_tokens + usageB.reasoning_tokens,
    estimated_cost_cents: usageA.estimated_cost_cents + usageB.estimated_cost_cents
  };

  return { 
    result: validationResult.data, 
    usage: totalUsage, 
    finish_reason: finishReasonB, 
    ceiling: analyzeCeiling(finishReasonB, usageB.completion_tokens) 
  };
}

export async function analyzeAdjudicator(
  verifiedFindings: any[],
  batchName: string
): Promise<AnalyzeBatchResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable.");

  const maxTokens = getMaxTokensExtraction();
  const systemPrompt = require('./prompts').O3_ADJUDICATOR_PROMPT;
  const userPrompt = require('./prompts').buildO3AdjudicatorPrompt(verifiedFindings);

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    thinking: { type: "disabled" },
    max_tokens: maxTokens,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`DeepSeek API Adjudicator returned status ${response.status}`);
  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  const finishReason = data.choices?.[0]?.finish_reason ?? 'unknown';

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent || "{}");
  } catch (e) {
    throw new Error("Invalid JSON returned by Adjudicator");
  }

  const validationResult = require('./schema').AnalysisResultSchema.safeParse(parsedJson);
  if (!validationResult.success) {
    throw new Error("Adjudicator response failed schema validation");
  }

  const usage = getEnrichedUsage(data);
  return { 
    result: validationResult.data, 
    usage, 
    finish_reason: finishReason, 
    ceiling: analyzeCeiling(finishReason, usage.completion_tokens) 
  };
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
    model: model,
    messages: [
      { role: "user", content: reviewPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    thinking: { type: "disabled" },
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

export async function interpretFindings(
  findings: Finding[],
  pages: { page_number: number; content: string }[]
): Promise<{ result: Finding[], usage: any }> {
  if (findings.length === 0) return { result: [], usage: { prompt_tokens: 0, completion_tokens: 0, estimated_cost_cents: 0 } };
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY environment variable.");

  const interpretationPrompt = `
You are a senior legal and commercial procurement expert.
Your task is to review the following verified facts extracted from a procurement document, and generate a brief business implication and action recommendation for each.

Original Findings:
${JSON.stringify(findings, null, 2)}

Context pages:
${pages.map(p => `--- PAGE ${p.page_number} ---\n${p.content}`).join('\n\n')}

Return ONLY valid JSON matching the exact schema below:
{
  "findings": [
    {
      "category": "<original category>",
      "title": "<original title>",
      "fact": "<original fact>",
      "business_implication": "<what this means for the bidder>",
      "action_recommendation": "<what the bidder should do>",
      "priority": "<original priority>",
      "confidence": "<original confidence>",
      "status": "<original status>",
      "quotes": [ <original quotes> ]
    }
  ]
}

CRITICAL RULES:
1. Do NOT modify the original category, title, fact, priority, confidence, status, or quotes.
2. Only populate the 'business_implication' and 'action_recommendation' fields.
3. If a finding does not need interpretation, leave those fields out or empty.
`;

  const requestBody = {
    model: model,
    messages: [
      { role: "user", content: interpretationPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    thinking: { type: "disabled" },
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error(`DeepSeek API returned status ${response.status} during interpretation`);

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
    console.error("Schema validation failed on interpretation:", validationResult.error);
    throw new Error("Model response failed schema validation during interpretation");
  }

  return { result: validationResult.data.findings, usage: getEnrichedUsage(data) };
}

// ============================================================================
// BUILD-008P EVIDENCE-UNIT EXTRACTION PASSES
// ============================================================================

import { EvidenceUnit } from './segmentation';
import { P1_EVIDENCE_DECISION_PROMPT, P2_COVERAGE_AUDIT_PROMPT, P3_FORCED_RECOVERY_PROMPT } from './prompts';

export async function analyzeEvidenceUnit(
  unit: EvidenceUnit,
  model: string = "deepseek-chat"
): Promise<{ contains: boolean, finding: any, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const userPrompt = `EVIDENCE UNIT:
Category: ${unit.category}
Trigger Terms: ${unit.trigger_terms.join(', ')}

Context Before:
${unit.context_before}

--- SOURCE TEXT ---
${unit.source_text}
--- END SOURCE TEXT ---

Context After:
${unit.context_after}

Evaluate the Source Text. Output JSON only.`;

  const payload = {
    model: model,
    messages: [
      { role: "system", content: P1_EVIDENCE_DECISION_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1024,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`P1 returned status ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return {
    contains: !!parsed.contains_material_evidence,
    finding: parsed.finding || parsed, // some models put it at root if not nested properly
    usage: getEnrichedUsage(data)
  };
}

export async function auditRejectedUnits(
  units: EvidenceUnit[],
  model: string = "deepseek-chat"
): Promise<{ missed_unit_ids: string[], usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const unitsJson = units.map(u => ({
    unit_id: u.unit_id,
    category: u.category,
    trigger_terms: u.trigger_terms,
    source_text: u.source_text
  }));

  const userPrompt = `REJECTED UNITS:\n${JSON.stringify(unitsJson, null, 2)}\n\nIdentify missed unit IDs. Output JSON only.`;

  const payload = {
    model: model,
    messages: [
      { role: "system", content: P2_COVERAGE_AUDIT_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 2048,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`P2 returned status ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return {
    missed_unit_ids: parsed.missed_unit_ids || [],
    usage: getEnrichedUsage(data)
  };
}

export async function recoverMissedUnit(
  unit: EvidenceUnit,
  model: string = "deepseek-chat"
): Promise<{ contains: boolean, finding: any, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const userPrompt = `MISSED EVIDENCE UNIT:
Category: ${unit.category}
Trigger Terms: ${unit.trigger_terms.join(', ')}

Context Before:
${unit.context_before}

--- SOURCE TEXT ---
${unit.source_text}
--- END SOURCE TEXT ---

Context After:
${unit.context_after}

Extract the material intelligence. Output JSON only.`;

  const payload = {
    model: model,
    messages: [
      { role: "system", content: P3_FORCED_RECOVERY_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1024,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`P3 returned status ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return {
    contains: !!parsed.contains_material_evidence,
    finding: parsed.finding || parsed,
    usage: getEnrichedUsage(data)
  };
}

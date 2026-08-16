import fs from 'fs';
import path from 'path';
import { QUALIFICATION_SYSTEM_PROMPT, MAPPING_SYSTEM_PROMPT, SYSTEM_PROMPT, buildQualificationUserPrompt, buildUserPrompt } from '../../lib/ai/prompts';
import { AnalysisResultSchema, FindingSchema, Finding } from '../../lib/ai/schema';
import { DocumentMapSchema } from '../../lib/ai/mapping';

export interface DiagnosticContext {
  document_id: string;
  document_name: string;
  document_type: string;
  stage: 'qualification' | 'mapping' | 'extraction' | 'reasoning';
  batch_name?: string;
  attempt_number: number;
}

let activeRequests = 0;

export async function diagnosticFetch(
  context: DiagnosticContext,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.1
): Promise<{ rawContent: string, usage: any }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");

  const concurrency_at_dispatch = activeRequests;
  activeRequests++;

  const requestBody = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: temperature,
    thinking: { type: "disabled" },
    stream: true,
    stream_options: { include_usage: true }
  };

  const start_time = performance.now();
  const timestamp_before = new Date().toISOString();
  let first_token_received = 0;
  let last_token_received = 0;
  let fullContent = "";
  let finalUsage = null;
  let http_status = 0;
  let network_error = "";
  let retryCount = context.attempt_number - 1; // Assuming attempt_number starts at 1

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody)
    });

    http_status = res.status;
    if (!res.ok) {
      network_error = await res.text();
      throw new Error(`HTTP ${res.status}: ${network_error}`);
    }

    if (!res.body) throw new Error("No body in response");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (value) {
        if (first_token_received === 0) {
          first_token_received = performance.now();
        }
        last_token_received = performance.now();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                fullContent += data.choices[0].delta.content;
              }
              if (data.usage) {
                finalUsage = data.usage;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
      done = readerDone;
    }
  } catch (err: any) {
    network_error = err.message;
    throw err;
  } finally {
    activeRequests--;
    const timestamp_after = new Date().toISOString();
    const ttft_ms = first_token_received > 0 ? first_token_received - start_time : -1;
    const total_request_time = performance.now() - start_time;
    const generation_ms = first_token_received > 0 ? last_token_received - first_token_received : -1;

    // Persist to request-level-metrics.jsonl
    const metricLog = {
      document_id: context.document_id,
      document_name: context.document_name,
      document_type: context.document_type,
      stage: context.stage,
      batch_name: context.batch_name || "N/A",
      timestamp_before,
      timestamp_after,
      http_status,
      retry_count: retryCount,
      attempt_number: context.attempt_number,
      concurrent_request_count_at_dispatch: concurrency_at_dispatch,
      usage: finalUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, prompt_cache_hit_tokens: 0 },
      request_total_ms: total_request_time,
      TTFT_ms: ttft_ms,
      generation_ms: generation_ms,
      error: network_error || null
    };

    const outDir = path.join(process.cwd(), 'benchmarks', 'build-008j', 'diagnostic-results');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const logPath = path.join(outDir, 'request-level-metrics.jsonl');
    fs.appendFileSync(logPath, JSON.stringify(metricLog) + '\n', 'utf8');
  }

  if (!fullContent) {
    throw new Error("Empty response from DeepSeek API during streaming");
  }

  return { rawContent: fullContent, usage: finalUsage };
}

// Wrapper for retry logic
export async function withDiagnosticRetry<T>(
  fn: (attempt: number) => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(i + 1);
    } catch (error: any) {
      console.log(`Error during execution, retrying (${i + 1}/${retries})...`, error.message);

      const outDir = path.join(process.cwd(), 'benchmarks', 'build-008j');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.appendFileSync(
        path.join(outDir, 'BUILD-008J_FAILURE_REGISTER.md'),
        `\n**Retry Event**\nAttempt: ${i + 1}\nError: ${error.message}\nTime: ${new Date().toISOString()}\n\n`,
        'utf8'
      );

      if (i === retries - 1) throw error;
      // Exponential backoff
      await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i)));
    }
  }
  throw new Error("Unreachable");
}

export async function qualifyDocumentDiagnostic(pages: any[], ctx: Omit<DiagnosticContext, 'stage' | 'attempt_number'>) {
  return withDiagnosticRetry(async (attempt) => {
    const userPrompt = buildQualificationUserPrompt(pages);
    const { rawContent, usage } = await diagnosticFetch({ ...ctx, stage: 'qualification', attempt_number: attempt }, QUALIFICATION_SYSTEM_PROMPT, userPrompt);
    return { result: JSON.parse(rawContent), usage };
  });
}

export async function mapDocumentPagesDiagnostic(pages: any[], ctx: Omit<DiagnosticContext, 'stage' | 'attempt_number'>) {
  return withDiagnosticRetry(async (attempt) => {
    const userPrompt = buildUserPrompt(pages);
    const { rawContent, usage } = await diagnosticFetch({ ...ctx, stage: 'mapping', attempt_number: attempt }, MAPPING_SYSTEM_PROMPT, userPrompt);
    const parsed = JSON.parse(rawContent);
    const valid = DocumentMapSchema.safeParse(parsed);
    if (!valid.success) throw new Error("Schema validation failed");
    return { result: valid.data, usage };
  });
}

export async function analyzeBatchDiagnostic(pages: any[], batchName: string, ctx: Omit<DiagnosticContext, 'stage' | 'attempt_number'>) {
  return withDiagnosticRetry(async (attempt) => {
    const userPrompt = buildUserPrompt(pages);
    const sysPrompt = SYSTEM_PROMPT + `\n\nFocus on categories relevant to: ${batchName}`;
    const { rawContent, usage } = await diagnosticFetch({ ...ctx, stage: 'extraction', batch_name: batchName, attempt_number: attempt }, sysPrompt, userPrompt);
    const parsed = JSON.parse(rawContent);
    const valid = AnalysisResultSchema.safeParse(parsed);
    if (!valid.success) throw new Error("Schema validation failed");
    return { result: valid.data, usage };
  });
}

export async function reasoningReviewDiagnostic(finding: Finding, pages: any[], ctx: Omit<DiagnosticContext, 'stage' | 'attempt_number'>) {
  return withDiagnosticRetry(async (attempt) => {
    const reviewPrompt = `
You are a senior legal and commercial procurement expert.
Review the following finding that was flagged for deep reasoning.
Your task is to analyze the quotes, resolve any contradictions or ambiguities, 
and produce a highly accurate, structured output for this specific finding.

Original Finding:
${JSON.stringify(finding, null, 2)}

Context pages:
${pages.map((p: any) => `--- PAGE ${p.page_number} ---\n${p.content}`).join('\n\n')}

Return ONLY valid JSON matching the Finding schema. Do not change the status unless unsupported.

CRITICAL RULES FOR "status" AND "quotes":
1. 'status' MUST be exactly "CONFIRMED" or "UNSUPPORTED".
2. If you report a valid finding, 'status' MUST be "CONFIRMED" and you MUST provide at least 1 exact quote.
3. If category is "AMBIGUITIES_CONTRADICTIONS", you MUST provide at least 2 exact quotes.
4. If you cannot find a quote for a finding, you MUST either omit the finding entirely, or use status "UNSUPPORTED" (e.g. for "MISSING_INFORMATION"). Do NOT output findings with 'status' "CONFIRMED" if you have no quotes.
`;
    // Reasoning review uses temperature 0.3
    const { rawContent, usage } = await diagnosticFetch({ ...ctx, stage: 'reasoning', attempt_number: attempt }, "", reviewPrompt, 0.3);
    const parsed = JSON.parse(rawContent);
    const valid = FindingSchema.safeParse(parsed);
    if (!valid.success) throw new Error("Schema validation failed");
    return { result: valid.data, usage };
  });
}

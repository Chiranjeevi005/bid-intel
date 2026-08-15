import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { QUALIFICATION_SYSTEM_PROMPT, buildQualificationUserPrompt } from './lib/ai/prompts';
import { buildUserPrompt } from './lib/ai/prompts';
import { DocumentQualificationSchema } from './lib/ai/qualification';
import { AnalysisResultSchema } from './lib/ai/schema';
import { verifyQuote } from './lib/ai/validator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

async function measurePipeline() {
  const docId = '5c404caa-0ee3-483a-9cc1-692eedd05833';
  const metrics: Record<string, number> = {};
  const tokens: Record<string, any> = {};

  const totalStart = performance.now();

  // 1. Database page retrieval time
  const pageStart = performance.now();
  const { data: pages, error } = await supabase
    .from('document_pages')
    .select('page_number, content')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });

  if (error || !pages) throw new Error("Failed to fetch pages");
  metrics['Database page retrieval time'] = performance.now() - pageStart;

  // 2. Qualification prompt construction time
  const qualPromptStart = performance.now();
  const qualUserPrompt = buildQualificationUserPrompt(pages);
  metrics['Qualification prompt construction time'] = performance.now() - qualPromptStart;

  // 3. Qualification DeepSeek network/request time
  const qualNetStart = performance.now();
  const qualRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "system", content: QUALIFICATION_SYSTEM_PROMPT }, { role: "user", content: qualUserPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });
  const qualData = await qualRes.json();
  metrics['Qualification DeepSeek network/request time'] = performance.now() - qualNetStart;
  tokens['Qualification Usage'] = qualData.usage || {};

  // 4. Qualification response parsing time
  const qualParseStart = performance.now();
  const qualJson = JSON.parse(qualData.choices[0].message.content);
  const qualParsed = DocumentQualificationSchema.parse(qualJson);
  metrics['Qualification response parsing time'] = performance.now() - qualParseStart;

  // 5. Qualification evidence validation time
  const qualValidStart = performance.now();
  let validQualification = true;
  for (const q of qualParsed.quotes) {
    const sourcePage = pages.find((p) => p.page_number === q.page_number);
    if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
      validQualification = false;
    }
  }
  metrics['Qualification evidence validation time'] = performance.now() - qualValidStart;

  // 6. Inngest mock latencies
  metrics['Inngest dispatch latency'] = 150.0;
  metrics['Background job startup latency'] = 450.0;

  // 7. Full page-context construction time
  const contextStart = performance.now();
  const intelUserPrompt = buildUserPrompt(pages);
  metrics['Full page-context construction time'] = performance.now() - contextStart;

  // 8. Intelligence DeepSeek network/request time
  const intelNetStart = performance.now();
  const makeRequest = async (systemPrompt: string) => {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: intelUserPrompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });
    return res.json();
  };

  const { SYSTEM_PROMPT_TASK_A, SYSTEM_PROMPT_TASK_B } = await import('./lib/ai/prompts');
  const [taskARes, taskBRes] = await Promise.all([
    makeRequest(SYSTEM_PROMPT_TASK_A),
    makeRequest(SYSTEM_PROMPT_TASK_B)
  ]);
  metrics['Intelligence DeepSeek network/request time'] = performance.now() - intelNetStart;

  tokens['Intelligence Usage Task A'] = taskARes.usage || {};
  tokens['Intelligence Usage Task B'] = taskBRes.usage || {};

  // 9. Zod validation time
  const zodStart = performance.now();
  let parsedJsonA, parsedJsonB;
  let mergedFindings: any[] = [];
  try {
    parsedJsonA = JSON.parse(taskARes.choices[0].message.content);
    parsedJsonB = JSON.parse(taskBRes.choices[0].message.content);
    mergedFindings = [...(parsedJsonA.findings || []), ...(parsedJsonB.findings || [])];
    AnalysisResultSchema.parse({ findings: mergedFindings });
  } catch (err: any) {
    console.error("Zod validation failed, but capturing time anyway.");
  }
  metrics['Zod validation time'] = performance.now() - zodStart;

  // 10. Evidence validation time (simulate)
  const evStart = performance.now();
  for (const f of mergedFindings) {
    if (f.quotes) {
      for (const q of f.quotes) {
        const p = pages.find((p) => p.page_number === q.page_number);
        if (p) verifyQuote(p.content, q.quote);
      }
    }
  }
  metrics['Evidence validation time'] = performance.now() - evStart;

  metrics['Total end-to-end processing time'] = performance.now() - totalStart;

  console.log("=== LATENCY METRICS ===");
  console.table(metrics);
  console.log("=== TOKEN USAGE ===");
  console.log(JSON.stringify(tokens, null, 2));

  fs.writeFileSync('benchmarks.json', JSON.stringify({ metrics, tokens }, null, 2));
}

measurePipeline();

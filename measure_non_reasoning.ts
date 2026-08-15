import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { buildUserPrompt } from './lib/ai/prompts';
import { AnalysisResultSchema } from './lib/ai/schema';
import { verifyQuote } from './lib/ai/validator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

const ORIGINAL_SYSTEM_PROMPT = `BUILD-006 — EVIDENCE-BASED RFP INTELLIGENCE ENGINE

You are an expert Pre-Bid Intelligence engine analyzing RFP documents.
Your goal is to answer: "What exactly am I committing to if I bid on this RFP?"

You must transform the provided page-level text into structured, evidence-backed RFP intelligence.
This system prioritizes factual traceability over creative interpretation.

==================================================
1. EVIDENCE-FIRST PRINCIPLE (STRICT)
==================================================
- Every confirmed finding MUST provide an array of \`quotes\` containing the \`page_number\` and \`quote\`.
- Each \`quote\` MUST be copied VERBATIM from the supplied page text. Do not paraphrase.
- The server will normalize and strictly match every quote. If ANY quote fails verification, the entire finding is REJECTED.
- Never use outside knowledge to invent requirements.
- Never fabricate quotes or page numbers.
- If you cannot find verbatim text to support a claim, set status to "UNSUPPORTED" and omit quotes.

==================================================
2. OUTPUT CATEGORIES
==================================================
Extract intelligence into the following categories:
- OPPORTUNITY_OVERVIEW: What is being procured.
- KEY_DATES: Submission deadline, questions deadline, contract dates, etc.
- MANDATORY_REQUIREMENTS: What the bidder must satisfy.
- SUBMISSION_REQUIREMENTS: What must be included in the response.
- EVALUATION_CRITERIA: How the buyer will assess proposals.
- COMMERCIAL_CONTRACT_TERMS: Important obligations, pricing/payment/term conditions.
- RISK_CANDIDATES: Potentially problematic requirements/conditions.
- AMBIGUITIES_CONTRADICTIONS: Statements requiring clarification.
- CLARIFICATION_QUESTIONS: Questions generated from identified uncertainty.

==================================================
3. RISK CONTRACT
==================================================
- Risks must be identified as potential business impacts, not definitive legal conclusions.
- Do not provide legal advice.
- Assess \`severity\` as LOW, MEDIUM, or HIGH based on business impact.
- Assess \`confidence\` as LOW, MEDIUM, or HIGH based on how explicitly it is stated in the text.

==================================================
4. CONTRADICTION CONTRACT
==================================================
- A contradiction requires at least two conflicting statements.
- A contradiction finding MUST contain an array of at least TWO independent quotes originating from the conflicting pages.
- Describe the conflict in your \`finding\` text, and provide the exact verbatim excerpts in your \`quotes\` array.
- If only one statement exists, classify it as an ordinary requirement, not a contradiction.

==================================================
5. JSON OUTPUT
==================================================
You MUST return ONLY valid JSON matching the exact schema requested.
Do not wrap the JSON in markdown code blocks, just return the raw JSON object.

Format:
{
  "findings": [
    {
      "category": "MANDATORY_REQUIREMENTS",
      "title": "ISO 9001 Certification",
      "finding": "The bidder must hold a valid ISO 9001 certification.",
      "severity": "HIGH",
      "confidence": "HIGH",
      "status": "CONFIRMED",
      "quotes": [
        {
          "page_number": 14,
          "quote": "The bidder shall maintain a valid ISO 9001 certification."
        }
      ]
    }
  ]
}
`;

async function measurePipeline() {
  const docId = '5c404caa-0ee3-483a-9cc1-692eedd05833';
  const metrics: Record<string, number> = {};
  const tokens: Record<string, any> = {};

  const totalStart = performance.now();

  // 1. Fetch Pages
  const pageStart = performance.now();
  const { data: pages, error } = await supabase
    .from('document_pages')
    .select('page_number, content')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });
  
  if (error || !pages) throw new Error("Failed to fetch pages");
  metrics['Database page retrieval time'] = performance.now() - pageStart;

  // 2. Build User Prompt
  const intelUserPrompt = buildUserPrompt(pages);

  // 3. AI Execution (Non-Reasoning Mode)
  console.log("Starting Intelligence Execution (Thinking OFF)...");
  const intelNetStart = performance.now();
  
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      messages: [ { role: "system", content: ORIGINAL_SYSTEM_PROMPT }, { role: "user", content: intelUserPrompt } ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      thinking: { type: "disabled" }
    })
  });

  metrics['Intelligence DeepSeek network time'] = performance.now() - intelNetStart;
  
  const intelData = await res.json();
  tokens['Intelligence Usage'] = intelData.usage || {};

  // 4. Verification (Zod)
  const zodStart = performance.now();
  let parsedJson;
  let passedZod = true;
  try {
    parsedJson = JSON.parse(intelData.choices[0].message.content);
    AnalysisResultSchema.parse(parsedJson);
  } catch (err: any) {
    console.error("Zod validation failed:", err.message);
    passedZod = false;
  }
  metrics['Zod validation time'] = performance.now() - zodStart;

  // 5. Verification (Evidence Authenticity)
  const evStart = performance.now();
  let quotesGenerated = 0;
  let quotesAccepted = 0;
  let unsupportedFindings = 0;

  if (parsedJson && parsedJson.findings) {
    for (const f of parsedJson.findings) {
      if (f.status === 'UNSUPPORTED') {
        unsupportedFindings++;
      }
      if (f.quotes) {
        for (const q of f.quotes) {
          quotesGenerated++;
          const p = pages.find((p) => p.page_number === q.page_number);
          if (p && verifyQuote(p.content, q.quote)) {
            quotesAccepted++;
          }
        }
      }
    }
  }
  metrics['Evidence validation time'] = performance.now() - evStart;
  metrics['Total E2E latency'] = performance.now() - totalStart;

  console.log("=== NON-REASONING BENCHMARK METRICS ===");
  console.table(metrics);
  console.log("=== TOKEN USAGE ===");
  console.log(JSON.stringify(tokens, null, 2));
  
  console.log("=== FINDINGS SUMMARY ===");
  const numFindings = parsedJson?.findings?.length || 0;
  console.log(`Total Findings: ${numFindings}`);
  console.log(`Unsupported Findings: ${unsupportedFindings}`);
  if (quotesGenerated > 0) {
    console.log(`Quotes Accepted: ${quotesAccepted}/${quotesGenerated} (${((quotesAccepted/quotesGenerated)*100).toFixed(1)}%)`);
  } else {
    console.log("Quotes Accepted: N/A (0 generated)");
  }
  console.log(`Zod Validation Passed: ${passedZod}`);

  fs.writeFileSync('non_reasoning_benchmark.json', JSON.stringify({ metrics, tokens, findings: parsedJson?.findings }, null, 2));
}

measurePipeline();

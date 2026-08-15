import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { z } from 'zod';
import { verifyQuote } from './lib/ai/validator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

// ---------------------------------------------------------
// PRODUCTION TRUST CONTRACT SCHEMA
// ---------------------------------------------------------
const QuoteSchema = z.object({
  page_number: z.number(),
  quote: z.string()
});

const FindingSchema = z.object({
  category: z.enum([
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
  ]),
  title: z.string(),
  fact: z.string(),
  business_implication: z.string().optional(),
  action_recommendation: z.string().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  status: z.enum(['CONFIRMED', 'UNSUPPORTED']),
  quotes: z.array(QuoteSchema).optional()
}).superRefine((data, ctx) => {
  if (data.status === 'CONFIRMED' && (!data.quotes || data.quotes.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CONFIRMED findings MUST have at least 1 quote." });
  }
  if (data.status === 'CONFIRMED' && data.category === 'AMBIGUITIES_CONTRADICTIONS' && (!data.quotes || data.quotes.length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "AMBIGUITIES_CONTRADICTIONS findings MUST have at least 2 quotes." });
  }
});

const AnalysisResultSchema = z.object({
  findings: z.array(FindingSchema)
});

// ---------------------------------------------------------
// SYSTEM PROMPT
// ---------------------------------------------------------
const SYSTEM_PROMPT = `BUILD-008G — PRODUCTION INTELLIGENCE ENGINE

You are an expert Pre-Bid Intelligence engine analyzing an RFP document.
Your objective is decision usefulness. A shorter report containing the 5 most important verified issues is preferable to 50 low-value observations.

==================================================
1. THE PRODUCTION TRUST CONTRACT (CRITICAL)
==================================================
Customer trust comes from verifiable evidence. You must adhere to the following conceptual sequence:
Evidence (Quote) -> Fact -> Interpretation (Business Implication) -> Action

Do not allow interpretations or recommendations to masquerade as facts.
Every CONFIRMED finding must extract:
- \`fact\`: What the source document explicitly says.
- \`business_implication\`: What that fact means for the bidder. (Optional)
- \`action_recommendation\`: What the bidder should verify, clarify, prepare, or consider. (Optional)

==================================================
2. EVIDENCE-FIRST PRINCIPLE (STRICT)
==================================================
- Every CONFIRMED finding MUST provide an array of \`quotes\` containing the \`page_number\` and \`quote\`.
- Each \`quote\` MUST be copied VERBATIM from the supplied page text. Do not paraphrase.
- Never use outside knowledge to invent requirements. Never fabricate quotes or page numbers.
- If you cannot find verifiable evidence for a category or question, output the category \`MISSING_INFORMATION\` and state "Unable to determine from the available document evidence."

==================================================
3. CATEGORIES & PRIORITY RULES
==================================================
Categories:
OPPORTUNITY_FIT, MANDATORY_ELIGIBILITY, SUBMISSION_REQUIREMENTS, KEY_DATES, EVALUATION_CRITERIA, COMMERCIAL_TERMS, LIABILITY_INDEMNITY, TERMINATION_RIGHTS, UNUSUAL_OBLIGATIONS, AMBIGUITIES_CONTRADICTIONS, MISSING_INFORMATION.

Priority: CRITICAL, HIGH, MEDIUM, LOW.
CRITICAL is strictly reserved for issues capable of materially affecting: ability to bid, eligibility, financial exposure, contractual liability, or termination exposure. Do not arbitrarily inflate severity.

==================================================
4. AMBIGUITIES & CONTRADICTIONS
==================================================
- A contradiction requires at least two conflicting statements.
- You MUST provide an array of at least TWO independent quotes originating from the conflicting pages.

==================================================
5. OUTPUT JSON SCHEMA
==================================================
Return ONLY valid JSON matching this schema:
{
  "findings": [
    {
      "category": "LIABILITY_INDEMNITY",
      "title": "Uncapped Indirect Damages",
      "fact": "The contractor shall be fully liable for all indirect damages.",
      "business_implication": "The bidder assumes unlimited financial exposure for indirect damages, which is highly punitive.",
      "action_recommendation": "Request a liability cap during the clarification period.",
      "priority": "CRITICAL",
      "confidence": "HIGH",
      "status": "CONFIRMED",
      "quotes": [
        {
          "page_number": 12,
          "quote": "The contractor shall be fully liable for all indirect damages."
        }
      ]
    }
  ]
}
`;

function buildUserPrompt(pages: { page_number: number; content: string }[]): string {
  let context = `Analyze the following RFP document pages and extract the required intelligence. Output JSON only.\n\n`;
  for (const page of pages) {
    context += `--- PAGE ${page.page_number} ---\n${page.content}\n\n`;
  }
  return context;
}

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

  // 2. AI Execution (Thinking OFF)
  console.log("Starting Production Intelligence Execution...");
  const intelUserPrompt = buildUserPrompt(pages);
  const intelNetStart = performance.now();
  
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model,
      messages: [ { role: "system", content: SYSTEM_PROMPT }, { role: "user", content: intelUserPrompt } ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      thinking: { type: "disabled" }
    })
  });

  metrics['Intelligence DeepSeek network time'] = performance.now() - intelNetStart;
  const intelData = await res.json();
  tokens['Intelligence Usage'] = intelData.usage || {};

  // 3. Verification
  const zodStart = performance.now();
  let parsedJson;
  let passedZod = true;
  try {
    parsedJson = JSON.parse(intelData.choices[0].message.content);
    AnalysisResultSchema.parse(parsedJson);
  } catch (err: any) {
    console.error("Zod validation failed:", err);
    passedZod = false;
  }
  metrics['Zod validation time'] = performance.now() - zodStart;

  const evStart = performance.now();
  let quotesGenerated = 0;
  let quotesAccepted = 0;
  let unsupportedFindings = 0;

  if (parsedJson && parsedJson.findings) {
    for (const f of parsedJson.findings) {
      if (f.status === 'UNSUPPORTED' || f.category === 'MISSING_INFORMATION') {
        unsupportedFindings++;
      }
      if (f.quotes) {
        for (const q of f.quotes) {
          quotesGenerated++;
          const p = pages.find((p) => p.page_number === q.page_number);
          if (p && verifyQuote(p.content, q.quote)) {
            quotesAccepted++;
          } else {
             console.log("FAILED QUOTE MATCH on page " + q.page_number + ": " + q.quote);
          }
        }
      }
    }
  }
  metrics['Evidence validation time'] = performance.now() - evStart;
  metrics['Total E2E latency'] = performance.now() - totalStart;

  console.log("=== PRODUCTION BENCHMARK METRICS ===");
  console.table(metrics);
  console.log("=== TOKEN USAGE ===");
  console.log(JSON.stringify(tokens, null, 2));
  
  console.log("=== FINDINGS SUMMARY ===");
  const numFindings = parsedJson?.findings?.length || 0;
  console.log(`Total Findings: ${numFindings}`);
  console.log(`Unsupported/Missing Findings: ${unsupportedFindings}`);
  if (quotesGenerated > 0) {
    console.log(`Quotes Accepted: ${quotesAccepted}/${quotesGenerated} (${((quotesAccepted/quotesGenerated)*100).toFixed(1)}%)`);
  }
  console.log(`Zod Validation Passed: ${passedZod}`);

  fs.writeFileSync('production_benchmark.json', JSON.stringify({ metrics, tokens, findings: parsedJson?.findings }, null, 2));
}

measurePipeline();

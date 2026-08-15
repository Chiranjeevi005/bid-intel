import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { AnalysisResultSchema } from './lib/ai/schema';
import { verifyQuote } from './lib/ai/validator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const apiKey = process.env.DEEPSEEK_API_KEY!;
const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

const PROMPT_C1 = `BUILD-006 — EVIDENCE-BASED RFP INTELLIGENCE ENGINE (FAST EXTRACTION)

You must extract structured factual requirements from the provided document pages.
Extract ONLY information explicitly present in the source document.
Do NOT infer missing requirements. Do NOT speculate. Do NOT explain your reasoning.
Return the required JSON structure IMMEDIATELY without preamble or chain-of-thought.

==================================================
1. EVIDENCE-FIRST PRINCIPLE (STRICT)
==================================================
- Every confirmed finding MUST provide an array of \`quotes\` containing the \`page_number\` and \`quote\`.
- Each \`quote\` MUST be copied VERBATIM from the supplied page text. Do not paraphrase.
- Never invent quotes or page numbers.

==================================================
2. OUTPUT CATEGORIES
==================================================
Extract intelligence into the following categories ONLY:
- OPPORTUNITY_OVERVIEW: What is being procured.
- KEY_DATES: Submission deadline, questions deadline, contract dates, etc.
- MANDATORY_REQUIREMENTS: What the bidder must satisfy.
- SUBMISSION_REQUIREMENTS: What must be included in the response.
- EVALUATION_CRITERIA: How the buyer will assess proposals.
- COMMERCIAL_CONTRACT_TERMS: Important obligations, pricing/payment/term conditions.

==================================================
3. JSON OUTPUT
==================================================
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

const PROMPT_C2 = `BUILD-006 — EVIDENCE-BASED RFP INTELLIGENCE ENGINE (DEEP REASONING)

You are an expert Pre-Bid Intelligence engine analyzing highly-relevant pages of an RFP to identify risks and contradictions.
You have been provided with a minimized context consisting of the most critical pages.
Analyze ONLY risks, contradictions, and genuinely interpretive findings.

==================================================
1. EVIDENCE-FIRST PRINCIPLE (STRICT)
==================================================
- Every confirmed finding MUST provide an array of \`quotes\` containing the \`page_number\` and \`quote\`.
- Each \`quote\` MUST be copied VERBATIM from the supplied page text. Do not paraphrase.
- Never invent quotes or page numbers.

==================================================
2. OUTPUT CATEGORIES
==================================================
Extract intelligence into the following categories ONLY:
- RISK_CANDIDATES: Potentially problematic requirements/conditions (e.g. uncapped liability).
- AMBIGUITIES_CONTRADICTIONS: Statements requiring clarification or explicitly conflicting.
- CLARIFICATION_QUESTIONS: Questions generated from identified uncertainty.

==================================================
3. RISK & CONTRADICTION CONTRACT
==================================================
- Risks must be identified as potential business impacts.
- Assess \`severity\` as LOW, MEDIUM, or HIGH based on business impact.
- A contradiction requires at least two conflicting statements. A contradiction finding MUST contain an array of at least TWO independent quotes originating from the conflicting pages.

==================================================
4. JSON OUTPUT
==================================================
Format:
{
  "findings": [
    {
      "category": "RISK_CANDIDATES",
      "title": "Uncapped Liability",
      "finding": "The contractor assumes uncapped liability for indirect damages.",
      "severity": "HIGH",
      "confidence": "HIGH",
      "status": "CONFIRMED",
      "quotes": [
        {
          "page_number": 22,
          "quote": "The Contractor shall be liable for all indirect damages without limitation."
        }
      ]
    }
  ]
}
`;

function buildUserPrompt(pages: { page_number: number; content: string }[]): string {
  let context = `Analyze the following RFP document pages and extract the required intelligence.\n\n`;
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

  const { data: pages, error } = await supabase
    .from('document_pages')
    .select('page_number, content')
    .eq('document_id', docId)
    .order('page_number', { ascending: true });
  
  if (error || !pages) throw new Error("Failed to fetch pages");

  const makeRequest = async (systemPrompt: string, userPrompt: string) => {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model,
        messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });
    return res.json();
  };

  console.log("Starting C1: Fast Extraction...");
  const c1Start = performance.now();
  const c1Prompt = buildUserPrompt(pages);
  const c1Res = await makeRequest(PROMPT_C1, c1Prompt);
  metrics['C1 (Fast Extraction) latency'] = performance.now() - c1Start;
  tokens['C1 Usage'] = c1Res.usage || {};
  
  let c1Json;
  try {
    c1Json = JSON.parse(c1Res.choices[0].message.content);
  } catch(e) {
    console.error("C1 returned invalid JSON", c1Res.choices[0].message.content);
    return;
  }

  // Determine C2 Context Map
  const citedPages = new Set<number>();
  for (const finding of (c1Json.findings || [])) {
    if (finding.quotes) {
      for (const q of finding.quotes) {
        citedPages.add(q.page_number);
      }
    }
  }

  // Safety margin: +/- 1 page
  const contextPages = new Set<number>();
  for (const page of citedPages) {
    contextPages.add(page - 1);
    contextPages.add(page);
    contextPages.add(page + 1);
  }

  const c2Pages = pages.filter(p => contextPages.has(p.page_number));
  
  console.log(`C2 Context Map: ${c2Pages.length} pages selected (out of ${pages.length})`);

  console.log("Starting C2: Deep Reasoning...");
  const c2Start = performance.now();
  const c2Prompt = buildUserPrompt(c2Pages);
  const c2Res = await makeRequest(PROMPT_C2, c2Prompt);
  metrics['C2 (Deep Reasoning) latency'] = performance.now() - c2Start;
  tokens['C2 Usage'] = c2Res.usage || {};

  let c2Json;
  try {
    c2Json = JSON.parse(c2Res.choices[0].message.content);
  } catch(e) {
    console.error("C2 returned invalid JSON", c2Res.choices[0].message.content);
    return;
  }

  // C3: Verification & Merging
  console.log("Starting C3: Verification & Merge...");
  const c3Start = performance.now();
  
  const mergedFindings = [...(c1Json.findings || []), ...(c2Json.findings || [])];
  
  let passedZod = true;
  try {
    AnalysisResultSchema.parse({ findings: mergedFindings });
  } catch (err: any) {
    console.error("Zod validation failed:", err.message);
    passedZod = false;
  }

  let quotesGenerated = 0;
  let quotesAccepted = 0;
  let unsupportedFindings = 0;

  for (const f of mergedFindings) {
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
  metrics['C3 (Verification) latency'] = performance.now() - c3Start;
  metrics['Total E2E latency'] = performance.now() - totalStart;

  console.log("=== ADAPTIVE ARCHITECTURE METRICS ===");
  console.table(metrics);
  console.log("=== TOKEN USAGE ===");
  console.log(JSON.stringify(tokens, null, 2));
  
  console.log("=== FINDINGS SUMMARY ===");
  console.log(`Total Findings: ${mergedFindings.length}`);
  console.log(`Unsupported Findings: ${unsupportedFindings}`);
  console.log(`Quotes Accepted: ${quotesAccepted}/${quotesGenerated} (${((quotesAccepted/Math.max(1, quotesGenerated))*100).toFixed(1)}%)`);
  console.log(`Zod Validation Passed: ${passedZod}`);

  fs.writeFileSync('adaptive_benchmark.json', JSON.stringify({ metrics, tokens, findings: mergedFindings }, null, 2));
}

measurePipeline();

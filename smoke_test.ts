import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());
process.env.INNGEST_EVENT_KEY = "local";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSmokeTest() {
  const documentId = '5c404caa-0ee3-483a-9cc1-692eedd05833';

  // 1. Create a new run
  const { data: run, error: runError } = await supabase
    .from('analysis_runs')
    .insert({
      document_id: documentId,
      status: 'QUEUED',
      model: 'deepseek-v4-flash',
      started_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (runError || !run) {
    console.error("Failed to create run:", runError);
    return;
  }

  const runId = run.id;
  console.log(`Created Run ID: ${runId}`);

  // 2. Trigger Inngest
  const startTime = Date.now();
  await fetch('http://127.0.0.1:8288/e/local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'rfp.analysis.requested',
      data: { documentId, runId }
    })
  });
  console.log("Inngest event sent via REST. Waiting for completion...");

  // 3. Poll for completion
  let finalStatus = 'QUEUED';
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const { data: currentRun } = await supabase.from('analysis_runs').select('status, completed_at, failed_at, last_error').eq('id', runId).single();
    if (currentRun) {
      if (currentRun.status === 'COMPLETED' || currentRun.status === 'FAILED') {
        finalStatus = currentRun.status;
        console.log(`Run finished with status: ${finalStatus}`);
        if (finalStatus === 'FAILED') console.error(`Error: ${currentRun.last_error}`);
        break;
      }
    }
  }

  const e2eLatency = Date.now() - startTime;
  console.log(`\n=== E2E LATENCY ===\n${e2eLatency}ms`);

  if (finalStatus === 'FAILED') return;

  // 4. Check Telemetry & Cost
  const { data: metrics } = await supabase.from('analysis_metrics').select('*').eq('run_id', runId).single();
  if (metrics) {
    console.log(`\n=== TELEMETRY ===`);
    console.log(`Prompt Tokens: ${metrics.prompt_tokens}`);
    console.log(`Cached Tokens: ${metrics.cached_tokens}`);
    console.log(`Completion Tokens: ${metrics.completion_tokens}`);
    console.log(`Reasoning Tokens: ${metrics.reasoning_tokens}`);
    console.log(`Total Tokens: ${metrics.total_tokens}`);
    console.log(`AI Duration: ${metrics.duration_ms}ms`);
    console.log(`Stored Cost Cents: ${metrics.estimated_cost_cents}`);

    // Verify Cost calculation
    const inputCost = Math.max(0, (metrics.prompt_tokens - metrics.cached_tokens)) / 1_000_000 * 0.14;
    const cachedCost = (metrics.cached_tokens) / 1_000_000 * 0.014;
    const outputCost = (metrics.completion_tokens) / 1_000_000 * 0.28;
    const calcCents = (inputCost + cachedCost + outputCost) * 100;

    console.log(`\n=== COST VERIFICATION ===`);
    console.log(`Calculated Cents: ${calcCents}`);
    if (Math.abs(calcCents - metrics.estimated_cost_cents) < 0.0001) {
      console.log(`[PASS] Cost mathematically matches formula!`);
    } else {
      console.log(`[FAIL] Cost does not match formula!`);
    }
  }

  // 5. Check Trust Boundary & Findings
  const { data: findings } = await supabase.from('analysis_findings').select('*, quotes:analysis_finding_quotes(*)').eq('analysis_run_id', runId);
  console.log(`\n=== QUALITY & TRUST BOUNDARY ===`);
  console.log(`Total Findings Extracted: ${findings?.length || 0}`);

  if (findings && findings.length > 0) {
    const sample = findings[0];
    console.log(`\nSample Finding ID: ${sample.id}`);
    console.log(`Title: ${sample.title}`);
    console.log(`Fact: ${sample.finding}`);
    console.log(`Implication: ${sample.business_implication}`);
    console.log(`Recommendation: ${sample.action_recommendation}`);
    console.log(`Quotes attached: ${sample.quotes?.length || 0}`);

    if (sample.quotes && sample.quotes.length > 0) {
      console.log(`Quote: "${sample.quotes[0].quote_text}" on Page ${sample.quotes[0].page_number}`);
    }
  }

  const expectedConcepts = [
    "Liability / indemnity",
    "Termination without cause",
    "Sponsorship",
    "Eligibility",
    "Bid format contradiction"
  ];

  console.log(`\n=== GOLD STANDARD COVERAGE ===`);
  console.log(`Please manually verify if these concepts were caught in the list below:`);
  findings?.forEach(f => {
    console.log(`- [${f.severity}] ${f.title}`);
  });
}

runSmokeTest();

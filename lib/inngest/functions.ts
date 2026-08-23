import { inngest } from "./client";
import { createClient } from '@supabase/supabase-js';
import { analyzeBatch } from '../ai/provider';
import { verifyQuote } from '../ai/validator';
import { Category, Finding } from '../ai/schema';
import {
  splitBatch,
  mergeFindingArrays,
  runWithConcurrencyLimit,
  getExtractionConcurrencyLimit,
  getMinExtractionPages,
} from '../ai/splitter';
import { NonRetriableError } from "inngest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ---------------------------------------------------------------------------
// K2/K3/K8: analyzeBatchBounded
// ---------------------------------------------------------------------------
// Retry contract (per BUILD-008K spec):
//   OUTPUT_CEILING (finish_reason=length) -> SPLIT, never retry identical payload
//   JSON parse error                      -> retry once (different response)
//   Schema validation failure             -> retry once
//   HTTP 429 / 5xx / network error        -> existing behaviour (Inngest retries)
//
// Every event is recorded for telemetry:
//   ceiling_hit, split_occurred, split_depth, identical_retry (always false here)
// ---------------------------------------------------------------------------

export interface BatchTelemetry {
  batch_name: string;
  page_count: number;
  ceiling_hit: boolean;
  split_occurred: boolean;
  split_depth: number;
  identical_retry: boolean;
  finish_reason: string;
  completion_tokens: number;
  prompt_tokens: number;
  output_budget_ratio: number;
  estimated_cost_cents: number;
  latency_ms: number;
  
  // 008L additions
  predictive_split: boolean;
  schema_retry_count: number;
  identical_retry_count: number;
  mapping_fallback: boolean;
  batch_failed: boolean;

  // 008M additions
  trigger_pages?: number[];
  context_pages?: number[];
  context_expansion_reason?: string[];
}

export async function analyzeBatchBounded(
  pages: { page_number: number; content: string }[],
  batchName: string,
  targetCategory: string,
  splitDepth: number = 0,
  telemetryOut: BatchTelemetry[] = []
): Promise<{ findings: Finding[]; telemetry: BatchTelemetry[] }> {
  
  // 008L: Predictive Pre-splitting
  const predictiveSplitThreshold = parseInt(process.env.DEEPSEEK_PREDICTIVE_SPLIT_PAGES || '15', 10);
  if (pages.length >= predictiveSplitThreshold && splitDepth === 0) {
    console.log(`[functions] PREDICTIVE SPLIT on "${batchName}". ${pages.length} pages >= ${predictiveSplitThreshold}. Splitting before API call.`);
    
    // Log a pseudo-telemetry entry for the skipped big batch
    telemetryOut.push({
      batch_name: batchName,
      page_count: pages.length,
      ceiling_hit: false,
      split_occurred: true,
      split_depth: splitDepth,
      identical_retry: false,
      finish_reason: 'predictive_split',
      completion_tokens: 0,
      prompt_tokens: 0,
      output_budget_ratio: 0,
      estimated_cost_cents: 0,
      latency_ms: 0,
      predictive_split: true,
      schema_retry_count: 0,
      identical_retry_count: 0,
      mapping_fallback: false,
      batch_failed: false
    });

    const [halfA, halfB] = splitBatch(pages);
    const limit = getExtractionConcurrencyLimit();
    const subTasks = [
      () => analyzeBatchBounded(halfA, `${batchName}/A`, targetCategory, splitDepth + 1, []),
      () => analyzeBatchBounded(halfB, `${batchName}/B`, targetCategory, splitDepth + 1, []),
    ];
    
    // Document-level isolation happens natively within analyzeBatchBounded leaf calls
    const subResults = await runWithConcurrencyLimit(subTasks, limit);
    const allFindings = mergeFindingArrays(subResults[0].findings, subResults[1].findings);
    for (const sub of subResults) telemetryOut.push(...sub.telemetry);
    return { findings: allFindings, telemetry: telemetryOut };
  }

  const start = performance.now();
  let attempt = 1;
  let schemaRetryCount = 0;
  
  while (attempt <= 2) {
    let res: any;
    let caughtErr: any;
    
    try {
      res = await analyzeBatch(pages, batchName, targetCategory);
    } catch (err: any) {
      caughtErr = err;
    }
    
    const latency_ms = performance.now() - start;

    if (!caughtErr) {
      telemetryOut.push({
        batch_name: batchName,
        page_count: pages.length,
        ceiling_hit: false,
        split_occurred: false,
        split_depth: splitDepth,
        identical_retry: false,
        finish_reason: res.finish_reason,
        completion_tokens: res.usage.completion_tokens,
        prompt_tokens: res.usage.prompt_tokens,
        output_budget_ratio: res.ceiling.output_budget_ratio,
        estimated_cost_cents: res.usage.estimated_cost_cents,
        latency_ms,
        predictive_split: false,
        schema_retry_count: schemaRetryCount,
        identical_retry_count: 0,
        mapping_fallback: false,
        batch_failed: false
      });
      return { findings: res.result.findings, telemetry: telemetryOut };
    }

    if (caughtErr.code === 'OUTPUT_CEILING') {
      const ceiling = caughtErr.ceiling ?? { output_budget_ratio: 1, ceiling_hit: true };
      const usage = caughtErr.usage ?? { completion_tokens: 0, prompt_tokens: 0, estimated_cost_cents: 0 };
      
      telemetryOut.push({
        batch_name: batchName,
        page_count: pages.length,
        ceiling_hit: true,
        split_occurred: true,
        split_depth: splitDepth,
        identical_retry: false,
        finish_reason: 'length',
        completion_tokens: usage.completion_tokens,
        prompt_tokens: usage.prompt_tokens,
        output_budget_ratio: ceiling.output_budget_ratio,
        estimated_cost_cents: usage.estimated_cost_cents,
        latency_ms,
        predictive_split: false,
        schema_retry_count: schemaRetryCount,
        identical_retry_count: 0,
        mapping_fallback: false,
        batch_failed: false
      });

      const minPages = getMinExtractionPages();
      if (pages.length <= minPages) {
        console.error(`[functions] UNRESOLVABLE_OUTPUT_CEILING: batch "${batchName}" at ${pages.length} pages (min=${minPages}). Returning empty array for isolation.`);
        return { findings: [], telemetry: telemetryOut };
      }

      const [halfA, halfB] = splitBatch(pages);
      console.log(`[functions] OUTPUT_CEILING on "${batchName}" (depth=${splitDepth}). Splitting ${pages.length} pages -> ${halfA.length} + ${halfB.length}`);

      const limit = getExtractionConcurrencyLimit();
      const subTasks = [
        () => analyzeBatchBounded(halfA, `${batchName}/A`, targetCategory, splitDepth + 1, []),
        () => analyzeBatchBounded(halfB, `${batchName}/B`, targetCategory, splitDepth + 1, []),
      ];

      const subResults = await runWithConcurrencyLimit(subTasks, limit);
      const allFindings = mergeFindingArrays(subResults[0].findings, subResults[1].findings);
      for (const sub of subResults) telemetryOut.push(...sub.telemetry);
      return { findings: allFindings, telemetry: telemetryOut };
    }

    // 008L: Robust Retry Trap
    if (caughtErr.message?.includes('Invalid JSON') || caughtErr.message?.includes('schema validation')) {
      if (attempt === 1) {
        console.warn(`[functions] Recoverable error on batch "${batchName}" (depth=${splitDepth}): ${caughtErr.message}. Retrying once.`);
        schemaRetryCount++;
        attempt++;
        continue; // Loop again, next error will be caught properly even if it's OUTPUT_CEILING
      } else {
        // 008L: Document-level failure isolation. Don't crash the whole document if a batch permanently fails schema.
        console.error(`[functions] Terminal schema failure on batch "${batchName}" after 2 attempts. Returning empty array for isolation.`);
        telemetryOut.push({
          batch_name: batchName,
          page_count: pages.length,
          ceiling_hit: false,
          split_occurred: false,
          split_depth: splitDepth,
          identical_retry: false,
          finish_reason: 'error',
          completion_tokens: 0,
          prompt_tokens: 0,
          output_budget_ratio: 0,
          estimated_cost_cents: 0,
          latency_ms,
          predictive_split: false,
          schema_retry_count: schemaRetryCount,
          identical_retry_count: 0,
          mapping_fallback: false,
          batch_failed: true // <-- explicitly record batch failure
        });
        return { findings: [], telemetry: telemetryOut };
      }
    }

    // All other errors (HTTP 429, 5xx, network) propagate up to Inngest for standard retry
    throw caughtErr;
  }
  
  return { findings: [], telemetry: telemetryOut };
}

// ---------------------------------------------------------------------------
// Main Inngest Function
// ---------------------------------------------------------------------------

export const analyzeRfpJob = inngest.createFunction(
  {
    id: "analyze-rfp-job",
    triggers: [{ event: "rfp.analysis.requested" }],
    retries: 3,
    onFailure: async ({ event, error }) => {
      const { runId } = (event.data.event.data as any);
      await supabase
        .from('analysis_runs')
        .update({
          status: 'FAILED',
          last_error: error.message || 'Unknown terminal failure',
          failed_at: new Date().toISOString()
        })
        .eq('id', runId);
    }
  },
  async ({ event, step }) => {
    const { documentId, runId } = (event.data as any);
    const jobStartTime = performance.now();
    let totalUsages: any[] = [];
    const allBatchTelemetry: BatchTelemetry[] = [];

    // 1. Fetch Run and Idempotency Check
    const run = await step.run("fetch-run", async () => {
      const { data, error } = await supabase.from('analysis_runs').select('*').eq('id', runId).single();
      if (error || !data) throw new NonRetriableError("Run not found or database error on fetch");
      return data;
    });

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      return { message: "Job already reached terminal state", runId };
    }

    await step.run("mark-processing", async () => {
      const { error } = await supabase.from('analysis_runs').update({ status: 'PROCESSING' }).eq('id', runId);
      if (error) throw new Error("Failed to mark run as processing");
    });

    // 2. Fetch Document Pages
    const pages = await step.run("fetch-pages", async () => {
      const { data: doc } = await supabase.from('documents').select('status').eq('id', documentId).single();
      if (!doc || doc.status !== 'TEXT_EXTRACTED') throw new NonRetriableError("Document missing or not extracted");

      const { data, error } = await supabase.from('document_pages').select('page_number, content').eq('document_id', documentId).order('page_number', { ascending: true });
      if (error || !data || data.length === 0) throw new NonRetriableError("Document pages missing");
      return data;
    });

    // Stage 1: Deterministic Retrieval (M2 & M3)
    const { candidateSets, retrievalDurationMs } = await step.run("deterministic-retrieval", async () => {
      const start = performance.now();
      const { getCategoryCandidates } = await import('../ai/retrieval');
      const candidates = getCategoryCandidates(pages);
      const end = performance.now();
      return { candidateSets: candidates, retrievalDurationMs: end - start };
    });
    totalUsages.push({ step_name: 'stage_1_retrieval', duration_ms: retrievalDurationMs, prompt_tokens: 0, completion_tokens: 0, estimated_cost_cents: 0 });

    // Group pages into batches
    const batches = await step.run("prepare-batches", async () => {
      return candidateSets.map((set: any) => ({
        name: set.category,
        targetCategory: set.category,
        pages: pages.filter((p: { page_number: number }) => set.context_pages.includes(p.page_number)),
        trigger_pages: set.trigger_pages,
        context_pages: set.context_pages,
        context_expansion_reason: set.context_expansion_reason
      }));
    });

    // Stage 2: Targeted Extraction (M4) — category-specific concurrent execution (M6)
    const { allFindings, extractionUsages, extractionDurationMs, extractedTelemetry } = await step.run("targeted-extraction", async () => {
      const start = performance.now();
      const activeBatches = batches.filter((b: any) => b.pages.length > 0);
      
      // Initialize telemetry for empty batches to record NO_CANDIDATES
      const emptyBatches = batches.filter((b: any) => b.pages.length === 0);
      const batchTelemetry: BatchTelemetry[] = emptyBatches.map((b: any) => ({
        batch_name: b.name,
        page_count: 0,
        ceiling_hit: false,
        split_occurred: false,
        split_depth: 0,
        identical_retry: false,
        finish_reason: 'no_candidates',
        completion_tokens: 0,
        prompt_tokens: 0,
        output_budget_ratio: 0,
        estimated_cost_cents: 0,
        latency_ms: 0,
        predictive_split: false,
        schema_retry_count: 0,
        identical_retry_count: 0,
        mapping_fallback: false,
        batch_failed: false
      }));

      // K8 concurrency-limited execution
      const limit = getExtractionConcurrencyLimit();
      const tasks = activeBatches.map((b: any) =>
        async () => {
          const res = await analyzeBatchBounded(b.pages, b.name, b.targetCategory, 0, []);
          // Decorate telemetry with context data
          res.telemetry.forEach(t => {
            t.trigger_pages = b.trigger_pages;
            t.context_pages = b.context_pages;
            t.context_expansion_reason = b.context_expansion_reason;
          });
          return res;
        }
      );

      const results = await runWithConcurrencyLimit(tasks, limit);
      const end = performance.now();

      const findings: Finding[] = [];
      const usages: any[] = [];

      results.forEach((res, idx) => {
        findings.push(...res.findings);
        batchTelemetry.push(...res.telemetry);
        const totalCost = res.telemetry.reduce((acc, t) => acc + t.estimated_cost_cents, 0);
        usages.push({
          step_name: `stage_2_${activeBatches[idx].name.toLowerCase()}`,
          estimated_cost_cents: totalCost,
          completion_tokens: res.telemetry.reduce((acc, t) => acc + t.completion_tokens, 0),
          prompt_tokens: res.telemetry.reduce((acc, t) => acc + t.prompt_tokens, 0),
          ceiling_hits: res.telemetry.filter(t => t.ceiling_hit).length,
          splits: res.telemetry.filter(t => t.split_occurred).length,
        });
      });

      return {
        allFindings: findings,
        extractionUsages: usages,
        extractionDurationMs: end - start,
        extractedTelemetry: batchTelemetry,
      };
    });

    for (const usage of extractionUsages) {
      totalUsages.push({ duration_ms: extractionDurationMs, ...usage });
    }
    allBatchTelemetry.push(...extractedTelemetry);

    // M9 Deduplication: Merge findings across categories
    const deduplicatedFindings = await step.run("deduplicate-findings", async () => {
      const merged: Finding[] = [];
      const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim();
      
      for (const finding of allFindings) {
        let isDuplicate = false;
        
        if (finding.quotes && finding.quotes.length > 0) {
          const findingQuotes = finding.quotes.map(q => normalize(q.quote));
          for (const existing of merged) {
            if (!existing.quotes) continue;
            const existingQuotes = existing.quotes.map(q => normalize(q.quote));
            
            // If any quote exactly overlaps, we merge (preferring the first one found, or could do smarter merge)
            const overlap = findingQuotes.some(fq => existingQuotes.includes(fq));
            if (overlap) {
              isDuplicate = true;
              break;
            }
          }
        }
        
        if (!isDuplicate) {
          merged.push(finding);
        }
      }
      return merged;
    });

    // K6: Validation — Evidence Contract unchanged
    const validFindingsToInsert: any[] = [];
    const validQuotesToInsert: any[] = [];
    
    const verifiedFindings = await step.run("validate-evidence", async () => {
      const verified = [];
      for (const finding of deduplicatedFindings) {
        if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) continue;

        let allQuotesValid = true;
        for (const q of finding.quotes) {
          const sourcePage = pages.find((p: { page_number: number }) => p.page_number === q.page_number);
          if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
            console.warn(`Evidence validation failed for page ${q.page_number}. Discarding finding.`);
            allQuotesValid = false;
            break;
          }
        }
        if (allQuotesValid) verified.push(finding);
      }
      return verified;
    });

    // M5: Selective Interpretation
    const { finalFindings, interpretationUsages, interpretationDurationMs } = await step.run("selective-interpretation", async () => {
      const start = performance.now();
      // Filter for critical/high or specific risky categories
      const riskyCategories = ['LIABILITY_RISK', 'TERMINATION', 'CONTRADICTIONS_AMBIGUITIES'];
      const toInterpret = verifiedFindings.filter((f: Finding) => 
        f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category)
      );
      const notInterpret = verifiedFindings.filter((f: Finding) => 
        !(f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category))
      );

      const { interpretFindings } = await import('../ai/provider');
      const limit = getExtractionConcurrencyLimit();

      // Chunk the findings to be interpreted to avoid sending too many at once.
      const CHUNK_SIZE = 5;
      const chunks = [];
      for (let i = 0; i < toInterpret.length; i += CHUNK_SIZE) {
        chunks.push(toInterpret.slice(i, i + CHUNK_SIZE));
      }

      const tasks = chunks.map((chunk, idx) => async () => {
        // Gather all context pages needed for this chunk
        const pageNumbers = new Set<number>();
        chunk.forEach(finding => finding.quotes?.forEach(q => pageNumbers.add(q.page_number)));
        const contextPages = pages.filter((p: { page_number: number }) => pageNumbers.has(p.page_number));
        
        return interpretFindings(chunk, contextPages);
      });

      const results = await runWithConcurrencyLimit(tasks, limit);
      const end = performance.now();

      const final = [...notInterpret];
      const usages: any[] = [];
      results.forEach((res, idx) => {
        final.push(...res.result);
        usages.push({ step_name: `stage_3_interpretation_${idx}`, ...res.usage });
      });

      return { finalFindings: final, interpretationUsages: usages, interpretationDurationMs: end - start };
    });

    for (const usage of interpretationUsages) {
      totalUsages.push({ duration_ms: interpretationDurationMs, ...usage });
    }

    // Persistence
    await step.run("persist-findings", async () => {
      for (const finding of finalFindings) {
        const findingId = crypto.randomUUID();
        validFindingsToInsert.push({
          id: findingId,
          analysis_run_id: runId,
          document_id: documentId,
          category: finding.category,
          title: finding.title,
          finding: finding.fact,
          business_implication: finding.business_implication || null,
          action_recommendation: finding.action_recommendation || null,
          severity: finding.priority,
          confidence: finding.confidence
        });

        if (finding.quotes) {
          for (const q of finding.quotes) {
            validQuotesToInsert.push({
              finding_id: findingId,
              page_number: q.page_number,
              quote_text: q.quote
            });
          }
        }
      }

      if (validFindingsToInsert.length > 0) {
        const { error: insertFindingsError } = await supabase.from('analysis_findings').insert(validFindingsToInsert);
        if (insertFindingsError) throw new Error(`Failed to persist findings: ${insertFindingsError.message}`);
        const { error: insertQuotesError } = await supabase.from('analysis_finding_quotes').insert(validQuotesToInsert);
        if (insertQuotesError) throw new Error(`Failed to persist quotes: ${insertQuotesError.message}`);
      }
    });

    await step.run("persist-metrics", async () => {
      const jobDurationMs = performance.now() - jobStartTime;
      for (const usage of totalUsages) {
        await supabase.from('analysis_metrics').insert({
          run_id: runId,
          document_id: documentId,
          step_name: usage.step_name,
          duration_ms: Math.round(usage.duration_ms || jobDurationMs),
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          reasoning_tokens: usage.reasoning_tokens,
          cached_tokens: usage.cached_tokens,
          estimated_cost_cents: usage.estimated_cost_cents
        });
      }
    });

    await step.run("mark-completed", async () => {
      const { error } = await supabase.from('analysis_runs').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', runId);
      if (error) throw new Error("Failed to mark run as completed");
    });

    return { success: true, runId };
  }
);

import { inngest } from "./client";
import { createClient } from '@supabase/supabase-js';
import { analyzeBatch, reasoningReview } from '../ai/provider';
import { mapDocumentPages } from '../ai/mapping';
import { consolidatePageSignals } from '../ai/retrieval';
import { verifyQuote } from '../ai/validator';
import { Category, Finding } from '../ai/schema';
import { NonRetriableError } from "inngest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Stage 1 & 2: Map & Retrieve
    const { consolidatedSignals, mappingUsage, mappingDurationMs } = await step.run("map-and-retrieve", async () => {
      const start = performance.now();
      const { result: mapResult, usage: mapUsage } = await mapDocumentPages(pages);
      const consolidated = consolidatePageSignals(pages, mapResult.page_maps);
      const end = performance.now();
      return { consolidatedSignals: consolidated, mappingUsage: mapUsage, mappingDurationMs: end - start };
    });
    totalUsages.push({ step_name: 'stage_1_mapping', duration_ms: mappingDurationMs, ...mappingUsage });

    // Group pages into batches (No AI calls here, fast logic)
    const batches = await step.run("prepare-batches", async () => {
      const eligibilityCategories = ['MANDATORY_ELIGIBILITY', 'SUBMISSION_REQUIREMENTS', 'OPPORTUNITY_FIT'];
      const commercialCategories = ['COMMERCIAL_TERMS', 'EVALUATION_CRITERIA', 'KEY_DATES'];
      const legalCategories = ['LIABILITY_INDEMNITY', 'TERMINATION_RIGHTS', 'UNUSUAL_OBLIGATIONS', 'AMBIGUITIES_CONTRADICTIONS'];

      const eligibilityPages = new Set<number>();
      const commercialPages = new Set<number>();
      const legalPages = new Set<number>();

      for (const [pageNumStr, signals] of Object.entries(consolidatedSignals)) {
        const pageNum = parseInt(pageNumStr);
        for (const signal of signals as Category[]) {
          if (eligibilityCategories.includes(signal)) eligibilityPages.add(pageNum);
          if (commercialCategories.includes(signal)) commercialPages.add(pageNum);
          if (legalCategories.includes(signal)) legalPages.add(pageNum);
        }
      }

      return [
        { name: 'Eligibility', pages: pages.filter((p: { page_number: number }) => eligibilityPages.has(p.page_number)) },
        { name: 'Commercial', pages: pages.filter((p: { page_number: number }) => commercialPages.has(p.page_number)) },
        { name: 'Legal/Risk', pages: pages.filter((p: { page_number: number }) => legalPages.has(p.page_number)) }
      ];
    });

    // Stage 3: Targeted Extraction (Parallel)
    const { allFindings, extractionUsages, extractionDurationMs } = await step.run("targeted-extraction", async () => {
      const start = performance.now();
      const activeBatches = batches.filter((b: any) => b.pages.length > 0);
      
      // Run batches in parallel to avoid Inngest sequential queueing delays
      const results = await Promise.all(activeBatches.map((b: any) => analyzeBatch(b.pages, b.name)));
      const end = performance.now();

      const findings: Finding[] = [];
      const usages: any[] = [];
      results.forEach((res, idx) => {
        findings.push(...res.result.findings);
        usages.push({ step_name: `stage_3_${activeBatches[idx].name.toLowerCase()}`, ...res.usage });
      });

      return { allFindings: findings, extractionUsages: usages, extractionDurationMs: end - start };
    });
    
    for (const usage of extractionUsages) {
      // Divide duration evenly for parallel batches in DB logging
      totalUsages.push({ duration_ms: extractionDurationMs, ...usage });
    }

    // Stage 4: Selective Reasoning (Parallel)
    const { finalFindings, reasoningUsages, reasoningDurationMs } = await step.run("selective-reasoning", async () => {
      const start = performance.now();
      const toReason = allFindings.filter((f: Finding) => f.requires_reasoning_review);
      const notReason = allFindings.filter((f: Finding) => !f.requires_reasoning_review);
      
      const promises = toReason.map((finding: Finding) => {
        const pageNumbers = finding.quotes?.map(q => q.page_number) || [];
        const contextPages = pages.filter((p: { page_number: number }) => pageNumbers.includes(p.page_number));
        return reasoningReview(finding, contextPages);
      });
      
      const results = await Promise.all(promises);
      const end = performance.now();

      const final = [...notReason];
      const usages: any[] = [];
      results.forEach((res, idx) => {
        final.push(res.result);
        usages.push({ step_name: `stage_4_reasoning_${idx}`, ...res.usage });
      });

      return { finalFindings: final, reasoningUsages: usages, reasoningDurationMs: end - start };
    });
    
    for (const usage of reasoningUsages) {
      totalUsages.push({ duration_ms: reasoningDurationMs, ...usage });
    }

    // Validation & Persistence
    await step.run("validate-and-persist", async () => {
      const validFindingsToInsert = [];
      const validQuotesToInsert = [];

      for (const finding of finalFindings) {
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
        if (!allQuotesValid) continue;

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

        for (const q of finding.quotes) {
          validQuotesToInsert.push({
            finding_id: findingId,
            page_number: q.page_number,
            quote_text: q.quote
          });
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

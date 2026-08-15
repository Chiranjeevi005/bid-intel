import { inngest } from "./client";
import { createClient } from '@supabase/supabase-js';
import { analyzeRfpPages } from '../ai/provider';
import { verifyQuote } from '../ai/validator';
import { NonRetriableError } from "inngest";

// Use service role for backend admin access since this runs in the background
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

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 1. Fetch Run and Idempotency Check
    const run = await step.run("fetch-run", async () => {
      const { data, error } = await supabase
        .from('analysis_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (error || !data) {
        throw new NonRetriableError("Run not found or database error on fetch");
      }
      return data;
    });

    if (run.status === 'COMPLETED' || run.status === 'FAILED') {
      return { message: "Job already reached terminal state", runId };
    }

    // Mark as PROCESSING
    await step.run("mark-processing", async () => {
      const { error } = await supabase
        .from('analysis_runs')
        .update({ status: 'PROCESSING' })
        .eq('id', runId);
      if (error) throw new Error("Failed to mark run as processing");
    });

    // 2. Fetch Document Pages
    const pages = await step.run("fetch-pages", async () => {
      const { data: doc } = await supabase.from('documents').select('status').eq('id', documentId).single();
      if (!doc || doc.status !== 'TEXT_EXTRACTED') {
        throw new NonRetriableError("Document missing or not extracted");
      }

      const { data, error } = await supabase
        .from('document_pages')
        .select('page_number, content')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true });

      if (error || !data || data.length === 0) {
        throw new NonRetriableError("Document pages missing");
      }
      return data;
    });

    // 3. AI Execution
    const aiStartTime = performance.now();
    const { aiResult, usage } = await step.run("analyze-ai", async () => {
      try {
        const { result, usage } = await analyzeRfpPages(pages);
        return { aiResult: result, usage };
      } catch (aiError: any) {
        const msg = aiError.message || "Unknown AI error";

        // Classify errors for retry
        if (msg.includes('schema validation') || msg.includes('Invalid JSON')) {
          throw new Error(`AI Formatting Error: ${msg}`); // Standard error -> will retry up to retries: 3
        }

        if (msg.includes('429') || msg.includes('500') || msg.includes('timeout')) {
          throw new Error(`Transient AI Error: ${msg}`); // Standard error -> retry
        }

        throw new Error(`AI Execution Failed: ${msg}`);
      }
    });
    const aiDurationMs = performance.now() - aiStartTime;

    // 4. Evidence Validation & Persistence
    await step.run("validate-and-persist", async () => {
      const validFindingsToInsert = [];
      const validQuotesToInsert = [];

      for (const finding of aiResult.findings) {
        if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) {
          continue;
        }

        let allQuotesValid = true;

        for (const q of finding.quotes) {
          const sourcePage = pages.find((p: { page_number: any; }) => p.page_number === q.page_number);
          if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
            console.warn(`Evidence validation failed for page ${q.page_number}. Discarding finding.`);
            allQuotesValid = false;
            break;
          }
        }

        if (!allQuotesValid) {
          continue;
        }

        const findingId = crypto.randomUUID();

        validFindingsToInsert.push({
          id: findingId,
          analysis_run_id: runId,
          document_id: documentId,
          category: finding.category,
          title: finding.title,
          finding: finding.fact, // Mapped to existing 'finding' column for now
          business_implication: finding.business_implication || null,
          action_recommendation: finding.action_recommendation || null,
          severity: finding.priority, // Mapped 'priority' to 'severity' column
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
        const { error: insertFindingsError } = await supabase
          .from('analysis_findings')
          .insert(validFindingsToInsert);

        if (insertFindingsError) throw new Error(`Failed to persist findings: ${insertFindingsError.message}`);

        const { error: insertQuotesError } = await supabase
          .from('analysis_finding_quotes')
          .insert(validQuotesToInsert);

        if (insertQuotesError) throw new Error(`Failed to persist quotes: ${insertQuotesError.message}`);
      }
    });

    // 4.5 Persist AI Metrics
    const totalDurationMs = performance.now() - jobStartTime;
    await step.run("persist-metrics", async () => {
      if (usage) {
        const { error } = await supabase.from('analysis_metrics').insert({
          run_id: runId,
          document_id: documentId,
          step_name: 'intelligence_extraction_build_008h',
          duration_ms: Math.round(aiDurationMs), 
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          reasoning_tokens: usage.reasoning_tokens,
          cached_tokens: usage.cached_tokens,
          estimated_cost_cents: usage.estimated_cost_cents
        });
        if (error) console.error("Failed to insert intelligence metrics:", error);
      }
    });

    // 5. Mark as Completed
    await step.run("mark-completed", async () => {
      const { error } = await supabase
        .from('analysis_runs')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('id', runId);

      if (error) throw new Error("Failed to mark run as completed");
    });

    return { success: true, runId };
  }
);

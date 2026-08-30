import { createClient } from '@supabase/supabase-js';
import { verifyQuote } from '../ai/validator';
import { Category, Finding } from '../ai/schema';
import {
  getExtractionConcurrencyLimit,
  runWithConcurrencyLimit
} from '../ai/splitter';
import { analyzeBatchBounded, BatchTelemetry } from '../inngest/functions';
import { qualifyDocument } from '../ai/qualification';
import { getCategoryCandidates } from '../ai/retrieval';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface PipelineExecutionOptions {
  extractionConcurrency?: number;
  interpretationConcurrency?: number;
  userConfirmed?: boolean;
}

/**
 * Truthful, idempotent analysis execution engine.
 * Can be executed directly or inside an Inngest background step.
 */
export async function executeAnalysisPipeline(
  documentId: string,
  runId: string,
  options: PipelineExecutionOptions = {}
): Promise<{ success: boolean; findingsCount: number; durationMs: number; error?: string }> {
  const startTime = performance.now();
  const totalUsages: any[] = [];
  const allBatchTelemetry: BatchTelemetry[] = [];

  try {
    // 1. Mark Run as EXTRACTING
    await supabase
      .from('analysis_runs')
      .update({
        status: 'EXTRACTING',
        started_at: new Date().toISOString()
      })
      .eq('id', runId);

    // 2. Fetch Document & Pages
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      throw new Error(`Document not found: ${docError?.message}`);
    }

    const { data: pages, error: pagesError } = await supabase
      .from('document_pages')
      .select('page_number, content')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (pagesError || !pages || pages.length === 0) {
      throw new Error('Document has no extracted pages in database');
    }

    // 3. Document Qualification Gate (STAGE: QUALIFYING)
    await supabase.from('analysis_runs').update({ status: 'QUALIFYING' }).eq('id', runId);

    if (options.userConfirmed) {
      await supabase
        .from('documents')
        .update({ qualification_status: 'USER_CONFIRMED' })
        .eq('id', documentId);
    } else if (!doc.qualification_status || doc.qualification_status === 'PENDING') {
      try {
        const qualRes = await qualifyDocument(pages);
        const qualification = qualRes.result;
        let validQualification = true;

        for (const q of qualification.quotes) {
          const sourcePage = pages.find(p => p.page_number === q.page_number);
          if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
            validQualification = false;
            break;
          }
        }

        let nextStatus = 'AI_AMBIGUOUS';
        if (!validQualification || qualification.confidence === 'LOW') {
          nextStatus = 'AI_AMBIGUOUS';
        } else if (qualification.is_procurement_opportunity) {
          nextStatus = 'AI_QUALIFIED';
        } else {
          nextStatus = 'AI_REJECTED';
        }

        await supabase
          .from('documents')
          .update({
            document_type: qualification.document_type,
            qualification_status: nextStatus,
            qualification_confidence: qualification.confidence,
            qualification_reason: qualification.reason
          })
          .eq('id', documentId);

        if (nextStatus === 'AI_REJECTED' && !options.userConfirmed) {
          await supabase
            .from('analysis_runs')
            .update({
              status: 'REJECTED',
              last_error: qualification.reason || 'Document classified as non-procurement',
              completed_at: new Date().toISOString()
            })
            .eq('id', runId);

          return {
            success: false,
            findingsCount: 0,
            durationMs: performance.now() - startTime,
            error: qualification.reason
          };
        }
      } catch (qualError: any) {
        console.warn('Qualification failed or skipped:', qualError);
      }
    }

    // 4. Deterministic Candidate Retrieval (STAGE: ANALYSING)
    await supabase.from('analysis_runs').update({ status: 'ANALYSING' }).eq('id', runId);

    const retrievalStart = performance.now();
    const candidateSets = getCategoryCandidates(pages);
    const retrievalEnd = performance.now();

    totalUsages.push({
      step_name: 'stage_1_retrieval',
      duration_ms: retrievalEnd - retrievalStart,
      prompt_tokens: 0,
      completion_tokens: 0,
      estimated_cost_cents: 0
    });

    const batches = candidateSets.map((set: any) => ({
      name: set.category,
      targetCategory: set.category,
      pages: pages.filter(p => set.context_pages.includes(p.page_number)),
      trigger_pages: set.trigger_pages,
      context_pages: set.context_pages,
      context_expansion_reason: set.context_expansion_reason
    }));

    // 5. Targeted Batch Extraction
    const activeBatches = batches.filter((b: any) => b.pages.length > 0);
    const extractionLimit = options.extractionConcurrency || getExtractionConcurrencyLimit();

    const extractionTasks = activeBatches.map((b: any) => async () => {
      const res = await analyzeBatchBounded(b.pages, b.name, b.targetCategory, 0, []);
      res.telemetry.forEach(t => {
        t.trigger_pages = b.trigger_pages;
        t.context_pages = b.context_pages;
        t.context_expansion_reason = b.context_expansion_reason;
      });
      return res;
    });

    const extractionStart = performance.now();
    const extractionResults = await runWithConcurrencyLimit(extractionTasks, extractionLimit);
    const extractionEnd = performance.now();

    const rawFindings: Finding[] = [];
    extractionResults.forEach((res, idx) => {
      rawFindings.push(...res.findings);
      allBatchTelemetry.push(...res.telemetry);
      const totalCost = res.telemetry.reduce((acc, t) => acc + t.estimated_cost_cents, 0);
      totalUsages.push({
        step_name: `stage_2_${activeBatches[idx].name.toLowerCase()}`,
        duration_ms: extractionEnd - extractionStart,
        estimated_cost_cents: totalCost,
        completion_tokens: res.telemetry.reduce((acc, t) => acc + t.completion_tokens, 0),
        prompt_tokens: res.telemetry.reduce((acc, t) => acc + t.prompt_tokens, 0),
        ceiling_hits: res.telemetry.filter(t => t.ceiling_hit).length,
        splits: res.telemetry.filter(t => t.split_occurred).length
      });
    });

    // 6. Deduplication
    const deduplicatedFindings: Finding[] = [];
    const normalize = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim();

    for (const finding of rawFindings) {
      let isDuplicate = false;
      if (finding.quotes && finding.quotes.length > 0) {
        const findingQuotes = finding.quotes.map(q => normalize(q.quote));
        for (const existing of deduplicatedFindings) {
          if (!existing.quotes) continue;
          const existingQuotes = existing.quotes.map(q => normalize(q.quote));
          if (findingQuotes.some(fq => existingQuotes.includes(fq))) {
            isDuplicate = true;
            break;
          }
        }
      }
      if (!isDuplicate) {
        deduplicatedFindings.push(finding);
      }
    }

    // 7. Verbatim Evidence Validation (STAGE: VERIFYING)
    await supabase.from('analysis_runs').update({ status: 'VERIFYING' }).eq('id', runId);

    const verifiedFindings: Finding[] = [];
    for (const finding of deduplicatedFindings) {
      if (finding.status !== 'CONFIRMED' || !finding.quotes || finding.quotes.length === 0) continue;

      let allQuotesValid = true;
      for (const q of finding.quotes) {
        const sourcePage = pages.find(p => p.page_number === q.page_number);
        if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
          allQuotesValid = false;
          break;
        }
      }
      if (allQuotesValid) {
        verifiedFindings.push(finding);
      }
    }

    // 8. Selective Risk Interpretation (STAGE: FINALIZING)
    await supabase.from('analysis_runs').update({ status: 'FINALIZING' }).eq('id', runId);

    const riskyCategories = ['LIABILITY_RISK', 'TERMINATION', 'CONTRADICTIONS_AMBIGUITIES'];
    const toInterpret = verifiedFindings.filter(f =>
      f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category)
    );
    const notInterpret = verifiedFindings.filter(f =>
      !(f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category))
    );

    let finalFindings: Finding[] = [...notInterpret];

    if (toInterpret.length > 0) {
      const { interpretFindings } = await import('../ai/provider');
      const interpretationLimit = options.interpretationConcurrency || 2;
      const CHUNK_SIZE = 5;
      const chunks = [];
      for (let i = 0; i < toInterpret.length; i += CHUNK_SIZE) {
        chunks.push(toInterpret.slice(i, i + CHUNK_SIZE));
      }

      const interpretationTasks = chunks.map((chunk, idx) => async () => {
        const pageNumbers = new Set<number>();
        chunk.forEach(finding => finding.quotes?.forEach(q => pageNumbers.add(q.page_number)));
        const contextPages = pages.filter(p => pageNumbers.has(p.page_number));
        return interpretFindings(chunk, contextPages);
      });

      const interpretationStart = performance.now();
      const interpretationResults = await runWithConcurrencyLimit(interpretationTasks, interpretationLimit);
      const interpretationEnd = performance.now();

      interpretationResults.forEach((res, idx) => {
        finalFindings.push(...res.result);
        totalUsages.push({
          step_name: `stage_3_interpretation_${idx}`,
          duration_ms: interpretationEnd - interpretationStart,
          ...res.usage
        });
      });
    }

    // 9. Transactional Persistence & Idempotency
    // Purge any prior partial findings for this exact runId before inserting
    await supabase.from('analysis_findings').delete().eq('analysis_run_id', runId);

    const validFindingsToInsert: any[] = [];
    const validQuotesToInsert: any[] = [];

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
      const { error: fErr } = await supabase.from('analysis_findings').insert(validFindingsToInsert);
      if (fErr) throw new Error(`Failed to insert findings: ${fErr.message}`);

      if (validQuotesToInsert.length > 0) {
        const { error: qErr } = await supabase.from('analysis_finding_quotes').insert(validQuotesToInsert);
        if (qErr) throw new Error(`Failed to insert quotes: ${qErr.message}`);
      }
    }

    // 10. Persist Telemetry Metrics & Mark COMPLETED
    const totalDurationMs = performance.now() - startTime;
    for (const usage of totalUsages) {
      await supabase.from('analysis_metrics').insert({
        run_id: runId,
        document_id: documentId,
        step_name: usage.step_name,
        duration_ms: Math.round(usage.duration_ms || 0),
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
      });
    }

    await supabase
      .from('analysis_runs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', runId);

    return {
      success: true,
      findingsCount: validFindingsToInsert.length,
      durationMs: totalDurationMs
    };

  } catch (err: any) {
    console.error('Pipeline Execution Error:', err);
    await supabase
      .from('analysis_runs')
      .update({
        status: 'FAILED',
        last_error: err.message || 'Unknown execution error',
        failed_at: new Date().toISOString()
      })
      .eq('id', runId);

    return {
      success: false,
      findingsCount: 0,
      durationMs: performance.now() - startTime,
      error: err.message
    };
  }
}

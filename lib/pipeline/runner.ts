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

async function isDocumentActive(documentId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

export interface PipelineExecutionOptions {
  extractionConcurrency?: number;
  interpretationConcurrency?: number;
  userConfirmed?: boolean;
  ledgerId?: string;
}

function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for entitlement operations');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function resolveLedgerId(runId: string, providedLedgerId?: string, client?: any): Promise<string | null> {
  if (providedLedgerId) return providedLedgerId;
  const serviceClient = client || getServiceSupabase();
  const { data, error } = await serviceClient
    .from('analysis_entitlement_ledger')
    .select('id')
    .eq('analysis_run_id', runId)
    .maybeSingle();

  if (error) {
    throw new Error(`Database error resolving ledger_id for run ${runId}: ${error.message}`);
  }
  return data?.id || null;
}

export async function safeFinalizeEntitlement(
  ledgerId: string,
  success: boolean,
  consumed: boolean,
  client?: any
): Promise<void> {
  const serviceClient = client || getServiceSupabase();

  // 1. Query ledger state
  const { data: ledger, error: queryError } = await serviceClient
    .from('analysis_entitlement_ledger')
    .select('id, status')
    .eq('id', ledgerId)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Database error querying ledger ${ledgerId} for finalization: ${queryError.message}`);
  }

  // Row is genuinely missing (e.g. cascaded away on document deletion)
  if (!ledger) {
    console.log(`[pipeline] Ledger ${ledgerId} no longer exists in database (cascaded deletion). Finalization skipped.`);
    return;
  }

  // Idempotent short-circuit if already in target terminal state
  if (ledger.status === 'CONSUMED' && consumed) return;
  if (ledger.status === 'RELEASED' && !consumed) return;

  // 2. Execute RPC
  const { error: rpcError } = await serviceClient.rpc('finalize_analysis_entitlement', {
    p_ledger_id: ledgerId,
    p_success: success,
    p_consumed: consumed
  });

  if (rpcError) {
    throw new Error(`Failed to finalize entitlement ledger ${ledgerId}: ${rpcError.message}`);
  }
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
    // 1. Mark Run as PROCESSING
    await supabase
      .from('analysis_runs')
      .update({
        status: 'PROCESSING',
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

    // 3. Document Qualification Gate
    // Stage tracking handled via telemetry/metrics to maintain DB status constraint compliance

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
              status: 'FAILED',
              last_error: qualification.reason || 'Document classified as non-procurement',
              completed_at: new Date().toISOString()
            })
            .eq('id', runId);

          const resolvedLedgerId = await resolveLedgerId(runId, options.ledgerId);
          if (resolvedLedgerId) {
            await safeFinalizeEntitlement(resolvedLedgerId, false, false);
          }

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

    // Check document liveness before proceeding to Stage 4
    if (!(await isDocumentActive(documentId))) {
      console.log(`[pipeline] Document ${documentId} no longer exists. Aborting pipeline before retrieval.`);
      return {
        success: false,
        findingsCount: 0,
        durationMs: performance.now() - startTime,
        error: 'DOCUMENT_DELETED'
      };
    }

    // 4. Deterministic Candidate Retrieval

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

    // 7. Verbatim Evidence Validation

    const verifiedFindings: Finding[] = [];
    const unverifiedFindings: Finding[] = [];

    for (const finding of deduplicatedFindings) {
      if (finding.status === 'CONFIRMED' && finding.quotes && finding.quotes.length > 0) {
        let allQuotesValid = true;
        const confirmedQuotes: typeof finding.quotes = [];
        for (const q of finding.quotes) {
          const sourcePage = pages.find(p => p.page_number === q.page_number);
          if (sourcePage && verifyQuote(sourcePage.content, q.quote)) {
            confirmedQuotes.push(q);
          } else {
            allQuotesValid = false;
          }
        }
        if (allQuotesValid) {
          verifiedFindings.push({
            ...finding,
            quotes: confirmedQuotes
          });
          continue;
        }
      }

      // CF-3: Preserve unverified/unsupported findings for human review instead of silently discarding
      const unverifiedTitle = finding.title.startsWith('[UNVERIFIED]')
        ? finding.title
        : `[UNVERIFIED] ${finding.title}`;

      const partialValidQuotes = (finding.quotes || []).filter(q => {
        const sourcePage = pages.find(p => p.page_number === q.page_number);
        return sourcePage && verifyQuote(sourcePage.content, q.quote);
      });

      unverifiedFindings.push({
        ...finding,
        title: unverifiedTitle,
        confidence: 'LOW',
        priority: (finding.priority === 'CRITICAL' || finding.priority === 'HIGH') ? 'HIGH' : 'MEDIUM',
        business_implication: finding.business_implication || 'Evidence quote could not be deterministically verified against page text. Requires human review.',
        action_recommendation: finding.action_recommendation || 'Verify source document manually before relying on this requirement.',
        quotes: partialValidQuotes
      });
    }

    // 8. Selective Risk Interpretation

    const riskyCategories = ['LIABILITY_RISK', 'TERMINATION', 'CONTRADICTIONS_AMBIGUITIES'];
    const toInterpret = verifiedFindings.filter(f =>
      f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category)
    );
    const notInterpret = verifiedFindings.filter(f =>
      !(f.priority === 'CRITICAL' || f.priority === 'HIGH' || riskyCategories.includes(f.category))
    );

    let finalFindings: Finding[] = [...notInterpret];

    if (toInterpret.length > 0) {
      if (!(await isDocumentActive(documentId))) {
        console.log(`[pipeline] Document ${documentId} no longer exists. Aborting before interpretation.`);
        return {
          success: false,
          findingsCount: 0,
          durationMs: performance.now() - startTime,
          error: 'DOCUMENT_DELETED'
        };
      }

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
        const interpRes = await interpretFindings(chunk, contextPages);

        // MI-2: Immutable Evidence Integrity
        // Interpretation LLM must ONLY populate business_implication and action_recommendation.
        // The original verified quotes, fact, and title remain the immutable ground truth.
        const mergedResults = chunk.map((origFinding, fIdx) => {
          const matching = interpRes.result[fIdx] || interpRes.result.find(r => r.title === origFinding.title || r.fact === origFinding.fact);
          return {
            ...origFinding,
            business_implication: matching?.business_implication || origFinding.business_implication || undefined,
            action_recommendation: matching?.action_recommendation || origFinding.action_recommendation || undefined,
            quotes: origFinding.quotes // immutable source quotes strictly preserved
          };
        });

        return {
          result: mergedResults,
          usage: interpRes.usage
        };
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

    // Append unverified findings for human review (never silently dropped)
    finalFindings.push(...unverifiedFindings);

    // Check document liveness before transactional persistence
    if (!(await isDocumentActive(documentId))) {
      console.log(`[pipeline] Document ${documentId} no longer exists. Aborting before findings persistence.`);
      return {
        success: false,
        findingsCount: 0,
        durationMs: performance.now() - startTime,
        error: 'DOCUMENT_DELETED'
      };
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

    const resolvedLedgerId = await resolveLedgerId(runId, options.ledgerId);
    if (resolvedLedgerId) {
      await safeFinalizeEntitlement(resolvedLedgerId, true, true);
    }

    return {
      success: true,
      findingsCount: validFindingsToInsert.length,
      durationMs: totalDurationMs
    };

  } catch (err: any) {
    // Concurrent deletion race check: if document was deleted while query/write was executing,
    // foreign-key cascade will destroy analysis_runs and document. Exit cleanly without throwing or crashing.
    const active = await isDocumentActive(documentId);
    if (!active) {
      console.log(`[pipeline] Document ${documentId} was deleted during pipeline execution. Halting cleanly.`);
      const resolvedLedgerId = await resolveLedgerId(runId, options.ledgerId).catch(() => null);
      if (resolvedLedgerId) {
        await safeFinalizeEntitlement(resolvedLedgerId, false, false).catch(e => console.warn('Finalize on deleted doc error:', e));
      }
      return {
        success: false,
        findingsCount: 0,
        durationMs: performance.now() - startTime,
        error: 'DOCUMENT_DELETED'
      };
    }

    console.error('Pipeline Execution Error:', err);
    await supabase
      .from('analysis_runs')
      .update({
        status: 'FAILED',
        last_error: err.message || 'Unknown execution error',
        failed_at: new Date().toISOString()
      })
      .eq('id', runId);

    const resolvedLedgerId = await resolveLedgerId(runId, options.ledgerId).catch(() => null);
    if (resolvedLedgerId) {
      await safeFinalizeEntitlement(resolvedLedgerId, false, false);
    }

    return {
      success: false,
      findingsCount: 0,
      durationMs: performance.now() - startTime,
      error: err.message
    };
  }
}

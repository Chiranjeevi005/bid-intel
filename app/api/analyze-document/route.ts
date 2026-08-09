import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeRfpPages } from '@/lib/ai/provider';

export async function POST(request: Request) {
  try {
    const { document_id } = await request.json();
    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify document ownership and TEXT_EXTRACTED status
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('status, user_id')
      .eq('id', document_id)
      .single();

    if (docError || !doc || doc.user_id !== user.id) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    if (doc.status !== 'TEXT_EXTRACTED') {
      return NextResponse.json({ error: 'Document is not in TEXT_EXTRACTED status' }, { status: 400 });
    }

    // 2. Fetch pages
    const { data: pages, error: pagesError } = await supabase
      .from('document_pages')
      .select('page_number, content')
      .eq('document_id', document_id)
      .order('page_number', { ascending: true });

    if (pagesError || !pages || pages.length === 0) {
      return NextResponse.json({ error: 'No extracted pages found' }, { status: 400 });
    }

    // 3. Create analysis_run (Idempotency check via unique index in DB)
    const { data: run, error: runError } = await supabase
      .from('analysis_runs')
      .insert({
        document_id,
        status: 'PROCESSING',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (runError) {
      // If error is unique_violation, it means there's an active run
      if (runError.code === '23505') {
        return NextResponse.json({ error: 'Analysis is already queued or processing for this document.' }, { status: 409 });
      }
      console.error("Failed to create analysis run:", runError);
      return NextResponse.json({ error: 'Failed to initialize analysis' }, { status: 500 });
    }

    const runId = run.id;

    // 4. Execute AI analysis (Async block handled gracefully)
    try {
      const result = await analyzeRfpPages(pages);

      // 5. Evidence Validation
      const validFindingsToInsert = [];

      for (const finding of result.findings) {
        if (finding.status !== 'CONFIRMED' || !finding.evidence || finding.page_number === null || finding.page_number === undefined) {
          continue; // Discard unsupported findings
        }

        const sourcePage = pages.find(p => p.page_number === finding.page_number);
        if (!sourcePage) {
          console.warn(`Evidence validation failed: Page ${finding.page_number} does not exist. Discarding finding.`);
          continue;
        }

        // Exact substring match for verbatim quote
        if (!sourcePage.content.includes(finding.evidence)) {
          console.warn(`Evidence validation failed: Quote not found verbatim on page ${finding.page_number}. Discarding finding.`);
          continue;
        }

        // Passed evidence check
        validFindingsToInsert.push({
          analysis_run_id: runId,
          document_id,
          category: finding.category,
          title: finding.title,
          finding: finding.finding,
          severity: finding.severity || null,
          confidence: finding.confidence,
          page_number: finding.page_number,
          evidence: finding.evidence
        });
      }

      // 6. Persist findings
      if (validFindingsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('analysis_findings')
          .insert(validFindingsToInsert);

        if (insertError) {
          throw new Error(`Failed to persist findings: ${insertError.message}`);
        }
      }

      // 7. Mark COMPLETED
      await supabase
        .from('analysis_runs')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('id', runId);

      return NextResponse.json({ success: true, runId, findingsCount: validFindingsToInsert.length });

    } catch (aiError: any) {
      console.error("AI Analysis Execution Error:", aiError);
      await supabase
        .from('analysis_runs')
        .update({
          status: 'FAILED',
          error_code: aiError.message || 'AI_EXECUTION_FAILED',
          completed_at: new Date().toISOString()
        })
        .eq('id', runId);
        
      return NextResponse.json({ error: 'AI processing failed' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Process Document Route Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

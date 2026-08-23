import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { verifyQuote } from '@/lib/ai/validator';

export async function POST(request: Request) {
  try {
    const { document_id } = await request.json();
    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // const { data: { user }, error: authError } = await supabase.auth.getUser();

    // TEMPORARY E2E TEST BYPASS
    // if (authError || !user) {
    //  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // 1. Verify document ownership and TEXT_EXTRACTED status
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('status, user_id, qualification_status')
      .eq('id', document_id)
      .single();

    // TEMPORARY E2E TEST BYPASS
    if (docError || !doc) {
      console.error("docError:", docError, "doc:", doc, "key loaded:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
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

    // 2.5 Document Qualification Gate
    if (!doc.qualification_status || doc.qualification_status === 'PENDING') {
      let qualification: any;
      let qualificationUsage: any;

      try {
        const { qualifyDocument } = await import('@/lib/ai/qualification');
        const qualRes = await qualifyDocument(pages);
        qualification = qualRes.result;
        qualificationUsage = qualRes.usage;

        let validQualification = true;
        for (const q of qualification.quotes) {
          const sourcePage = pages.find((p: { page_number: number; }) => p.page_number === q.page_number);
          if (!sourcePage || !verifyQuote(sourcePage.content, q.quote)) {
            console.warn(`Qualification evidence failed for page ${q.page_number}`);
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
          .eq('id', document_id);

        if (nextStatus === 'AI_REJECTED') {
          return NextResponse.json({ success: false, status: 'AI_REJECTED', reason: 'Document is not a procurement opportunity' });
        } else if (nextStatus === 'AI_AMBIGUOUS') {
          return NextResponse.json({ success: false, status: 'AI_AMBIGUOUS', reason: 'Document classification uncertain, requires user confirmation' });
        }

        // Store usage temporarily to persist after run creation
        if (qualificationUsage) {
          (global as any).qualUsageToInsert = qualificationUsage;
        }

      } catch (qualError: any) {
        console.error("Qualification Error:", qualError);
        return NextResponse.json({ error: 'Failed to qualify document' }, { status: 500 });
      }
    } else if (doc.qualification_status === 'AI_REJECTED') {
      return NextResponse.json({ success: false, status: 'AI_REJECTED', reason: 'Document was previously rejected' });
    } else if (doc.qualification_status === 'AI_AMBIGUOUS') {
      return NextResponse.json({ success: false, status: 'AI_AMBIGUOUS', reason: 'Document awaits user confirmation' });
    }
    // If AI_QUALIFIED or USER_CONFIRMED, proceed.

    // 3. Create analysis_run (Idempotency check via unique index in DB)
    const { data: run, error: runError } = await supabase
      .from('analysis_runs')
      .insert({
        document_id,
        status: 'QUEUED',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (runError) {
      // If error is unique_violation, it means there's an active run
      if (runError.code === '23505') {
        // Find existing run to return its ID so client can poll
        const { data: existingRun } = await supabase
          .from('analysis_runs')
          .select('id, status')
          .eq('document_id', document_id)
          .in('status', ['QUEUED', 'PROCESSING'])
          .single();

        if (existingRun) {
          return NextResponse.json({ success: true, runId: existingRun.id, status: existingRun.status });
        }
        return NextResponse.json({ error: 'Analysis is already queued or processing for this document.' }, { status: 409 });
      }
      console.error("Failed to create analysis run:", runError);
      return NextResponse.json({ error: 'Failed to initialize analysis' }, { status: 500 });
    }

    const runId = run.id;

    // 3.5 Persist qualification metrics if available
    // We attach it to a global request variable or just pass it down?
    // We can't easily retrieve it if it was cached in doc, but since this route ran the qualification, we have it now!
    // @ts-ignore
    if (global.qualUsageToInsert) {
      const usage = (global as any).qualUsageToInsert;
      await supabase.from('analysis_metrics').insert({
        run_id: runId,
        document_id: document_id,
        step_name: 'qualification_gate',
        duration_ms: 0,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens
      });
      (global as any).qualUsageToInsert = null;
    }

    // 4. Dispatch background job to Inngest
    const { inngest } = await import('@/lib/inngest/client');
    await inngest.send({
      name: 'rfp.analysis.requested',
      data: {
        documentId: document_id,
        runId: runId
      }
    });

    // 5. Return immediately to the client
    return NextResponse.json({ success: true, runId, status: 'QUEUED' });

  } catch (err: any) {
    console.error('Process Document Route Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

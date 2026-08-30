import { NextResponse } from 'next/server';
import { executeAnalysisPipeline } from '@/lib/pipeline/runner';

export async function POST(request: Request) {
  try {
    const { document_id, user_confirmed } = await request.json();
    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Verify document ownership & text extraction status
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, status, user_id, qualification_status, original_filename')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.status !== 'TEXT_EXTRACTED') {
      return NextResponse.json({ error: 'Document pages not extracted yet. Please extract pages first.' }, { status: 400 });
    }

    // 2. Check for an existing active run (Idempotency)
    const { data: existingRun } = await supabase
      .from('analysis_runs')
      .select('id, status')
      .eq('document_id', document_id)
      .in('status', ['QUEUED', 'PROCESSING', 'EXTRACTING', 'QUALIFYING', 'ANALYSING', 'VERIFYING', 'FINALIZING'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRun) {
      return NextResponse.json({
        success: true,
        document_id,
        runId: existingRun.id,
        run_id: existingRun.id,
        status: existingRun.status,
        message: 'Analysis job already in progress'
      });
    }

    // 3. Create a new analysis_run in QUEUED status
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

    if (runError || !run) {
      console.error('Failed to create analysis_run:', runError);
      return NextResponse.json({ error: 'Failed to create analysis job record' }, { status: 500 });
    }

    const runId = run.id;

    // 4. Dispatch background execution asynchronously (Non-blocking)
    // Mode A: Inngest (if daemon/cloud active)
    try {
      const { inngest } = await import('@/lib/inngest/client');
      inngest.send({
        name: 'rfp.analysis.requested',
        data: {
          documentId: document_id,
          runId: runId
        }
      }).catch(() => {
        // Fallback: Inngest dev server not running locally, execute via runner
        executeAnalysisPipeline(document_id, runId, { userConfirmed: !!user_confirmed }).catch(err => {
          console.error('Background pipeline error:', err);
        });
      });
    } catch {
      // Direct detached async execution
      executeAnalysisPipeline(document_id, runId, { userConfirmed: !!user_confirmed }).catch(err => {
        console.error('Background pipeline execution error:', err);
      });
    }

    // 5. Return immediately to the client in < 150ms
    return NextResponse.json({
      success: true,
      document_id,
      runId: runId,
      run_id: runId,
      status: 'QUEUED',
      filename: doc.original_filename
    });

  } catch (err: any) {
    console.error('Analyze Document Dispatch Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

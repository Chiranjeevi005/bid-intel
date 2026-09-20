import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    
    if (!runId || runId === 'undefined' || runId === 'null') {
      return NextResponse.json({ error: 'Valid runId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: run, error: runError } = await supabase
      .from('analysis_runs')
      .select('status, last_error, document_id')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    
    // Authorization & document metadata check
    const { data: doc } = await supabase
      .from('documents')
      .select('id, user_id, qualification_status, qualification_reason, document_type')
      .eq('id', run.document_id)
      .single();
      
    if (!doc || doc.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (run.status === 'COMPLETED') {
      const { count } = await supabase
        .from('analysis_findings')
        .select('*', { count: 'exact', head: true })
        .eq('analysis_run_id', runId);
        
      return NextResponse.json({
        status: run.status,
        findingsCount: count,
        qualification_status: doc.qualification_status,
      });
    }

    // If qualification rejected by AI
    if (doc.qualification_status === 'AI_REJECTED') {
      return NextResponse.json({
        status: 'REJECTED',
        qualification_status: 'AI_REJECTED',
        qualification_reason: doc.qualification_reason || run.last_error || 'Document classified as non-procurement opportunity.',
        error: doc.qualification_reason || 'Document does not appear to be a procurement opportunity.',
        document_id: doc.id,
      });
    }

    // If qualification ambiguous
    if (doc.qualification_status === 'AI_AMBIGUOUS') {
      return NextResponse.json({
        status: 'AMBIGUOUS',
        qualification_status: 'AI_AMBIGUOUS',
        qualification_reason: doc.qualification_reason || 'Document classification uncertain, requires user confirmation.',
        error: doc.qualification_reason || 'Document classification uncertain.',
        document_id: doc.id,
      });
    }

    if (run.status === 'FAILED') {
      console.error(`Internal Job Failure for run ${runId}:`, run.last_error);
      return NextResponse.json({
        status: run.status,
        error: run.last_error || 'Analysis could not be completed. Please try again.',
        last_error: run.last_error,
        qualification_status: doc.qualification_status,
        qualification_reason: doc.qualification_reason || run.last_error,
        document_id: doc.id,
      });
    }

    return NextResponse.json({
      status: run.status,
      qualification_status: doc.qualification_status,
      document_id: doc.id,
    });

  } catch (err: any) {
    console.error('Analysis Status Route Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

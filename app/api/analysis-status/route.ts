import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    
    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 });
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
    
    // Authorization check
    const { data: doc } = await supabase
      .from('documents')
      .select('user_id')
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
        
      return NextResponse.json({ status: run.status, findingsCount: count });
    }

    if (run.status === 'FAILED') {
      // Do not expose internal technical errors, just a sanitized message
      console.error(`Internal Job Failure for run ${runId}:`, run.last_error);
      return NextResponse.json({ status: run.status, error: "Analysis could not be completed. Please try again." });
    }

    return NextResponse.json({ status: run.status });

  } catch (err: any) {
    console.error('Analysis Status Route Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

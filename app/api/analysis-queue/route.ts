import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch only documents belonging to the authenticated user
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select(`
        id,
        original_filename,
        size_bytes,
        status,
        document_type,
        qualification_status,
        qualification_reason,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (docError) throw docError;

    const userDocIds = (docs || []).map(d => d.id);

    if (userDocIds.length === 0) {
      return NextResponse.json({
        success: true,
        jobs: [],
        summary: {
          total_jobs: 0,
          analysing_count: 0,
          ready_count: 0,
          queued_count: 0,
          failed_count: 0
        }
      });
    }

    // 2. Fetch latest analysis runs scoped strictly to user's documents
    const { data: runs, error: runError } = await supabase
      .from('analysis_runs')
      .select('*')
      .in('document_id', userDocIds)
      .order('created_at', { ascending: false });

    if (runError) throw runError;

    // 3. Fetch page counts scoped strictly to user's documents
    const { data: pageCounts } = await supabase
      .from('document_pages')
      .select('document_id, page_number')
      .in('document_id', userDocIds);

    const pagesPerDoc: Record<string, number> = {};
    pageCounts?.forEach(p => {
      pagesPerDoc[p.document_id] = Math.max(pagesPerDoc[p.document_id] || 0, p.page_number);
    });

    // 4. Fetch findings count scoped strictly to user's runs
    const userRunIds = (runs || []).map(r => r.id);
    let findingsPerRun: Record<string, number> = {};

    if (userRunIds.length > 0) {
      const { data: findings } = await supabase
        .from('analysis_findings')
        .select('analysis_run_id')
        .in('analysis_run_id', userRunIds);

      findings?.forEach(f => {
        findingsPerRun[f.analysis_run_id] = (findingsPerRun[f.analysis_run_id] || 0) + 1;
      });
    }

    // Merge into queue jobs
    const jobs = (docs || []).map(doc => {
      const latestRun = (runs || []).find(r => r.document_id === doc.id);
      const totalPages = pagesPerDoc[doc.id] || 0;
      const findingsCount = latestRun ? (findingsPerRun[latestRun.id] || 0) : 0;

      let operationalStatus: string = latestRun?.status || doc.status;
      if (doc.qualification_status === 'AI_REJECTED' && latestRun?.status !== 'COMPLETED') {
        operationalStatus = 'REJECTED';
      }

      return {
        document_id: doc.id,
        document_name: doc.original_filename,
        size_bytes: doc.size_bytes,
        total_pages: totalPages,
        document_type: doc.document_type,
        qualification_status: doc.qualification_status,
        qualification_reason: doc.qualification_reason,
        created_at: doc.created_at,
        run_id: latestRun?.id || null,
        status: operationalStatus,
        started_at: latestRun?.started_at || null,
        completed_at: latestRun?.completed_at || null,
        findings_count: findingsCount,
        last_error: latestRun?.last_error || null
      };
    });

    const activeStatuses = ['QUEUED', 'PROCESSING', 'EXTRACTING', 'QUALIFYING', 'ANALYSING', 'VERIFYING', 'FINALIZING'];
    const analysingCount = jobs.filter(j => activeStatuses.includes(j.status)).length;
    const readyCount = jobs.filter(j => j.status === 'COMPLETED').length;
    const queuedCount = jobs.filter(j => j.status === 'QUEUED').length;
    const failedCount = jobs.filter(j => j.status === 'FAILED' || j.status === 'REJECTED').length;

    return NextResponse.json({
      success: true,
      jobs,
      summary: {
        total_jobs: jobs.length,
        analysing_count: analysingCount,
        ready_count: readyCount,
        queued_count: queuedCount,
        failed_count: failedCount
      }
    });

  } catch (err: any) {
    console.error('Analysis Queue API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch analysis queue' }, { status: 500 });
  }
}

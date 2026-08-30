import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch all documents
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
      .order('created_at', { ascending: false });

    if (docError) throw docError;

    // Fetch latest analysis run for each document
    const { data: runs, error: runError } = await supabase
      .from('analysis_runs')
      .select('*')
      .order('created_at', { ascending: false });

    if (runError) throw runError;

    // Fetch page counts per document
    const { data: pageCounts } = await supabase
      .from('document_pages')
      .select('document_id, page_number');

    const pagesPerDoc: Record<string, number> = {};
    pageCounts?.forEach(p => {
      pagesPerDoc[p.document_id] = Math.max(pagesPerDoc[p.document_id] || 0, p.page_number);
    });

    // Fetch findings count per run
    const { data: findings } = await supabase
      .from('analysis_findings')
      .select('analysis_run_id');

    const findingsPerRun: Record<string, number> = {};
    findings?.forEach(f => {
      findingsPerRun[f.analysis_run_id] = (findingsPerRun[f.analysis_run_id] || 0) + 1;
    });

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

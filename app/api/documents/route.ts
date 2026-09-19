import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCategoryCandidates, getPageCoverageAudit } from '@/lib/ai/retrieval';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        original_filename,
        size_bytes,
        status,
        qualification_status,
        qualification_reason,
        document_type,
        created_at,
        document_pages(count),
        analysis_runs(id, status, started_at, completed_at, last_error)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (docsError) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Determine completed document IDs to fetch their page coverage deterministically
    const completedDocIds = (documents || [])
      .filter((d: any) => d.analysis_runs?.[0]?.status === 'COMPLETED' || d.status === 'ANALYSIS_COMPLETE')
      .map((d: any) => d.id);

    const evaluatedPagesPerDoc: Record<string, number> = {};

    if (completedDocIds.length > 0) {
      const { data: pagesData } = await supabase
        .from('document_pages')
        .select('document_id, page_number, content')
        .in('document_id', completedDocIds)
        .order('page_number', { ascending: true });

      if (pagesData && pagesData.length > 0) {
        const pagesByDoc: Record<string, { page_number: number; content: string }[]> = {};
        for (const p of pagesData) {
          if (!pagesByDoc[p.document_id]) pagesByDoc[p.document_id] = [];
          pagesByDoc[p.document_id].push({ page_number: p.page_number, content: p.content });
        }

        for (const docId of completedDocIds) {
          const docPages = pagesByDoc[docId] || [];
          if (docPages.length > 0) {
            const candidateSets = getCategoryCandidates(docPages);
            const audit = getPageCoverageAudit(docPages, candidateSets);
            evaluatedPagesPerDoc[docId] = audit.evaluated_count;
          }
        }
      }
    }

    const formattedDocs = (documents || []).map((doc: any) => {
      const latestRun = doc.analysis_runs?.[0] || null;
      const totalPages = doc.document_pages?.[0]?.count || 0;

      let operationalStatus: string = latestRun?.status || doc.status;
      if (doc.qualification_status === 'AI_REJECTED' && latestRun?.status !== 'COMPLETED') {
        operationalStatus = 'REJECTED';
      } else if (doc.qualification_status === 'AI_AMBIGUOUS' && (!latestRun || latestRun?.status !== 'COMPLETED')) {
        operationalStatus = 'AMBIGUOUS';
      }

      // Authoritative recommended action
      let recommendedAction = 'Review extracted requirements and bid criteria.';
      if (doc.qualification_status === 'AI_REJECTED' || operationalStatus === 'REJECTED') {
        recommendedAction = 'Disqualified as non-RFP document. Review qualification details or perform manual override if this is a valid tender.';
      } else if (doc.qualification_status === 'AI_AMBIGUOUS' || operationalStatus === 'AMBIGUOUS') {
        recommendedAction = 'Ambiguous intake classification. Review candidate clauses, unindexed pages, and risk ledger before bidding.';
      } else if (operationalStatus === 'COMPLETED' || operationalStatus === 'ANALYSIS_COMPLETE') {
        recommendedAction = 'Analysis complete. Inspect high-priority attention lanes, verify requirement quotes, and review coverage audit.';
      } else if (operationalStatus === 'FAILED') {
        recommendedAction = 'Analysis failed. Inspect error logs and re-trigger extraction pipeline.';
      } else if (operationalStatus === 'UPLOADED' || operationalStatus === 'TEXT_EXTRACTED') {
        recommendedAction = 'Text extracted. Trigger analysis to classify requirements and detect risks.';
      }

      return {
        id: doc.id,
        original_filename: doc.original_filename,
        size_bytes: doc.size_bytes,
        status: doc.status,
        operational_status: operationalStatus,
        qualification_status: doc.qualification_status,
        qualification_reason: doc.qualification_reason,
        document_type: doc.document_type,
        created_at: doc.created_at,
        total_pages: totalPages,
        evaluated_pages_count: evaluatedPagesPerDoc[doc.id] ?? totalPages,
        recommended_action: recommendedAction,
        latest_run: latestRun
      };
    });

    return NextResponse.json({ documents: formattedDocs });
  } catch (err: any) {
    console.error('Documents List API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

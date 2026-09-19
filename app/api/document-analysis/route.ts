import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCategoryCandidates, getPageCoverageAudit, PageCoverageAudit } from '@/lib/ai/retrieval';
import { segmentEvidenceUnits } from '@/lib/ai/segmentation';
import { assessCriticalCoverage } from '@/lib/ai/coverage';
import { Finding } from '@/lib/ai/schema';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    // 2. Fetch document pages
    const { data: pages, error: pagesError } = await supabase
      .from('document_pages')
      .select('page_number, content, char_count')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (pagesError) {
      return NextResponse.json({ error: 'Failed to fetch document pages' }, { status: 500 });
    }

    // 3. Fetch latest analysis run
    const { data: latestRun } = await supabase
      .from('analysis_runs')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Fetch findings and quotes if run exists
    let findings: any[] = [];
    let coverageReport: any = null;
    let candidates: any[] = [];
    let pageCoverage: PageCoverageAudit | null = null;

    if (latestRun && latestRun.id) {
      const { data: rawFindings, error: findingsError } = await supabase
        .from('analysis_findings')
        .select('*, quotes:analysis_finding_quotes(*)')
        .eq('analysis_run_id', latestRun.id)
        .order('created_at', { ascending: true });

      if (!findingsError && rawFindings) {
        findings = rawFindings;
      }

      // Compute authoritative BUILD-008P coverage if pages exist
      if (pages && pages.length > 0) {
        candidates = getCategoryCandidates(pages);
        pageCoverage = getPageCoverageAudit(pages, candidates);
        const allUnits = segmentEvidenceUnits(documentId, pages, candidates);

        const formattedFindings: { finding: Finding }[] = findings.map((f: any) => ({
          finding: {
            category: f.category,
            title: f.title,
            fact: f.finding,
            business_implication: f.business_implication || undefined,
            action_recommendation: f.action_recommendation || undefined,
            priority: f.severity || 'MEDIUM',
            confidence: f.confidence || 'HIGH',
            status: 'CONFIRMED',
            quotes: f.quotes?.map((q: any) => ({
              page_number: q.page_number,
              quote: q.quote_text
            })) || []
          }
        }));

        coverageReport = assessCriticalCoverage(allUnits, formattedFindings);
      }
    } else if (pages && pages.length > 0) {
      candidates = getCategoryCandidates(pages);
      pageCoverage = getPageCoverageAudit(pages, candidates);
    }

    return NextResponse.json({
      document: {
        id: doc.id,
        filename: doc.original_filename,
        size_bytes: doc.size_bytes,
        status: doc.status,
        qualification_status: doc.qualification_status,
        qualification_confidence: doc.qualification_confidence,
        qualification_reason: doc.qualification_reason,
        document_type: doc.document_type,
        created_at: doc.created_at,
        total_pages: pages ? pages.length : 0
      },
      pages: pages || [],
      run: latestRun || null,
      findings,
      coverage: coverageReport,
      candidates,
      page_coverage: pageCoverage
    });

  } catch (err: any) {
    console.error('Document Analysis API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

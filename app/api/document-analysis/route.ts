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

    // Support both SSR cookie auth and Bearer token auth
    let user: any = null;
    let supabase: any = null;

    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { createClient: createSupabaseJsClient } = await import('@supabase/supabase-js');
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const adminClient = createSupabaseJsClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceKey,
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        const { data: userData } = await adminClient.auth.getUser(token);
        if (userData?.user) {
          user = userData.user;
          supabase = adminClient;
        }
      }
    }

    if (!user) {
      supabase = await createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!authError && authData?.user) {
        user = authData.user;
      }
    }

    if (!user || !supabase) {
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

    // 5. Derive effective user plan server-side
    let userPlan: 'FREE' | 'PRO_INDIA' | 'PRO_GLOBAL' = 'FREE';
    const { data: activeSub } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (activeSub && (activeSub.plan === 'PRO_INDIA' || activeSub.plan === 'PRO_GLOBAL')) {
      userPlan = activeSub.plan;
    }

    // 6. Enforce server-side entitlement for Contract Exposure findings
    // PRO_GLOBAL receives all substantive finding content.
    // FREE and PRO_INDIA (Plus) have Contract Exposure content masked server-side to prevent network payload leaks.
    const isPro = userPlan === 'PRO_GLOBAL';
    let gatedContractExposureCount = 0;

    const sanitizedFindings = findings.map((f: any) => {
      // Check if this finding belongs to Contract Exposure
      const cat = (f.category || '').toUpperCase();
      const title = (f.title || '').toLowerCase();
      const fact = (f.finding || '').toLowerCase();
      const implication = (f.business_implication || '').toLowerCase();
      
      const isContractExposure = 
        cat === 'LIABILITY_INDEMNITY' ||
        cat === 'LIABILITY_RISK' ||
        cat === 'TERMINATION_RIGHTS' ||
        cat === 'TERMINATION' ||
        cat === 'PENALTIES_LIQUIDATED_DAMAGES' ||
        cat === 'RISK_CANDIDATES' ||
        cat === 'INDEMNITY' ||
        (cat === 'UNUSUAL_OBLIGATIONS' && !title.includes('registration') && !fact.includes('mandatory registration')) ||
        ((cat === 'COMMERCIAL_TERMS' || cat === 'COMMERCIAL_CONTRACT_TERMS' || cat === 'COMMERCIAL') &&
          (title.includes('penalty') || title.includes('damage') || title.includes('reimbursement') || title.includes('liability') || title.includes('termination') || implication.includes('delay') || implication.includes('cash flow') || implication.includes('cost') || implication.includes('exposure')));

      if (isContractExposure && !isPro) {
        gatedContractExposureCount++;
        return {
          id: f.id,
          analysis_run_id: f.analysis_run_id,
          document_id: f.document_id,
          category: f.category,
          title: f.title ? 'Contractual Exposure Finding' : 'Contractual Exposure Finding',
          finding: 'Substantive contractual finding details and risk exposure analysis are protected under the Pro plan.',
          severity: f.severity,
          confidence: f.confidence,
          business_implication: null,
          action_recommendation: null,
          quotes: [], // Redact verbatim quotes from payload
          is_pro_gated: true,
          created_at: f.created_at,
        };
      }

      return {
        ...f,
        is_pro_gated: false,
      };
    });

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
      findings: sanitizedFindings,
      coverage: coverageReport,
      candidates,
      page_coverage: pageCoverage,
      userPlan,
      contractExposureGatedCount: gatedContractExposureCount,
    });

  } catch (err: any) {
    console.error('Document Analysis API Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

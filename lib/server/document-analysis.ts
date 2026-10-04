import { getCategoryCandidates, getPageCoverageAudit, PageCoverageAudit, CandidateSet } from '@/lib/ai/retrieval';
import { segmentEvidenceUnits } from '@/lib/ai/segmentation';
import { assessCriticalCoverage, CriticalCategory, CategoryCoverage } from '@/lib/ai/coverage';
import { Finding, Category } from '@/lib/ai/schema';
import { SupabaseClient } from '@supabase/supabase-js';


export interface RawFindingQuote {
  id: string;
  finding_id: string;
  page_number: number;
  quote_text: string;
}

export interface RawFindingItem {
  id: string;
  analysis_run_id: string;
  document_id: string;
  category: string;
  title: string;
  finding: string;
  severity: string | null;
  confidence: string;
  business_implication?: string | null;
  action_recommendation?: string | null;
  quotes?: RawFindingQuote[];
  is_pro_gated?: boolean;
  created_at: string;
}

export interface DocumentAnalysisResult {
  document: {
    id: string;
    filename: string;
    size_bytes: number;
    status: string;
    qualification_status: string | null;
    qualification_confidence: string | null;
    qualification_reason: string | null;
    document_type: string | null;
    created_at: string;
    total_pages: number;
  };
  pages: Array<{ page_number: number; content: string; char_count: number }>;
  run: {
    id: string;
    status: string;
    model: string;
    started_at: string;
    completed_at: string | null;
    last_error: string | null;
  } | null;
  findings: RawFindingItem[];
  coverage: Record<CriticalCategory, CategoryCoverage> | null;
  candidates: CandidateSet[];
  page_coverage: PageCoverageAudit | null;
  userPlan: 'FREE' | 'PRO_INDIA' | 'PRO_GLOBAL';
  contractExposureGatedCount: number;
}

export async function getDocumentAnalysisPayload(
  documentId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{ data?: DocumentAnalysisResult; error?: string; status?: number }> {
  // 1. Fetch document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docError || !doc) {
    return { error: 'Document not found or unauthorized', status: 404 };
  }

  // 2. Fetch document pages
  const { data: pages, error: pagesError } = await supabase
    .from('document_pages')
    .select('page_number, content, char_count')
    .eq('document_id', documentId)
    .order('page_number', { ascending: true });

  if (pagesError) {
    return { error: 'Failed to fetch document pages', status: 500 };
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
  let findings: RawFindingItem[] = [];
  let coverageReport: Record<CriticalCategory, CategoryCoverage> | null = null;
  let candidates: CandidateSet[] = [];
  let pageCoverage: PageCoverageAudit | null = null;

  if (latestRun && latestRun.id) {
    const { data: rawFindings, error: findingsError } = await supabase
      .from('analysis_findings')
      .select('*, quotes:analysis_finding_quotes(*)')
      .eq('analysis_run_id', latestRun.id)
      .order('created_at', { ascending: true });

    if (!findingsError && rawFindings) {
      findings = rawFindings as RawFindingItem[];
    }

    // Compute authoritative BUILD-008P coverage if pages exist
    if (pages && pages.length > 0) {
      candidates = getCategoryCandidates(pages);
      pageCoverage = getPageCoverageAudit(pages, candidates);
      const allUnits = segmentEvidenceUnits(documentId, pages, candidates);

      const formattedFindings: { finding: Finding }[] = findings.map((f: RawFindingItem) => ({
        finding: {
          category: f.category as Category,
          title: f.title,
          fact: f.finding,
          business_implication: f.business_implication || undefined,
          action_recommendation: f.action_recommendation || undefined,
          priority: (f.severity as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
          confidence: (f.confidence as 'HIGH' | 'MEDIUM' | 'LOW') || 'HIGH',
          status: 'CONFIRMED',
          quotes: f.quotes?.map((q: RawFindingQuote) => ({
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
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (activeSub && (activeSub.plan === 'PRO_INDIA' || activeSub.plan === 'PRO_GLOBAL')) {
    userPlan = activeSub.plan;
  }

  // 6. Enforce server-side entitlement for Contract Exposure findings
  const isPro = userPlan === 'PRO_GLOBAL';
  let gatedContractExposureCount = 0;

  const sanitizedFindings = findings.map((f: RawFindingItem) => {
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
        quotes: [],
        is_pro_gated: true,
        created_at: f.created_at,
      };
    }

    return {
      ...f,
      is_pro_gated: false,
    };
  });

  return {
    data: {
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
    }
  };
}

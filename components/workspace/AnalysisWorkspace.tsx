'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceHeader from './WorkspaceHeader';
import AttentionBrief from './AttentionBrief';
import CoveragePulse from './CoveragePulse';
import FindingsLedger, { FindingItem } from './FindingsLedger';
import EvidenceInspector, { CategoryInspectionState } from './EvidenceInspector';
import CoverageAuditTray from './CoverageAuditTray';
import DocumentIntake from './DocumentIntake';
import AnalysisQueueDrawer, { QueueJob } from './AnalysisQueueDrawer';
import { CriticalCategory, CategoryCoverage } from '@/lib/ai/coverage';
import { partitionAttentionLanes } from '@/lib/ai/attention-lanes';
import { PageCoverageAudit } from '@/lib/ai/retrieval';

interface DocumentSummary {
  id: string;
  original_filename: string;
  size_bytes: number;
  status: string;
  qualification_status: string | null;
  document_type: string | null;
  created_at: string;
}

interface ActiveDocumentData {
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
  findings: FindingItem[];
  coverage: Record<CriticalCategory, CategoryCoverage> | null;
  candidates: Array<{ category: string; trigger_pages: number[]; context_pages: number[] }>;
  page_coverage: PageCoverageAudit | null;
}

interface AnalysisWorkspaceProps {
  userId: string;
  initialDocumentId?: string;
}

export default function AnalysisWorkspace({
  userId,
  initialDocumentId
}: AnalysisWorkspaceProps) {
  const router = useRouter();
  const [documentsList, setDocumentsList] = useState<DocumentSummary[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(initialDocumentId || null);

  // Synchronize activeDocId when initialDocumentId prop updates (e.g., client route changes)
  useEffect(() => {
    if (initialDocumentId && initialDocumentId !== activeDocId) {
      setActiveDocId(initialDocumentId);
    }
  }, [initialDocumentId]);
  const [activeDocData, setActiveDocData] = useState<ActiveDocumentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isIntakeView, setIsIntakeView] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);
  const [queueSummary, setQueueSummary] = useState<{
    total_jobs: number;
    analysing_count: number;
    ready_count: number;
    queued_count: number;
    failed_count: number;
  }>({
    total_jobs: 0,
    analysing_count: 0,
    ready_count: 0,
    queued_count: 0,
    failed_count: 0
  });

  // Selected finding for the Evidence Inspector Drawer
  const [selectedFinding, setSelectedFinding] = useState<FindingItem | null>(null);
  
  // Selected category state for Coverage Audit inspection
  const [selectedCategoryState, setSelectedCategoryState] = useState<CategoryInspectionState | null>(null);
  
  // Toggles for Deep Analysis Views
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState<boolean>(false);
  const [isFullLedgerOpen, setIsFullLedgerOpen] = useState<boolean>(false);
  const [isCoverageMatrixOpen, setIsCoverageMatrixOpen] = useState<boolean>(false);

  // Active category filter for the full ledger
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // Fetch analysis queue jobs & summary
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/analysis-queue');
      if (!res.ok) return;
      const data = await res.json();
      if (data.jobs) {
        setQueueJobs(data.jobs);
      }
      if (data.summary) {
        setQueueSummary(data.summary);
      }
    } catch (err) {
      console.warn('Failed to fetch analysis queue:', err);
    }
  }, []);

  // 1. Fetch user documents list
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) return;
      const data = await res.json();
      const docs = data.documents || [];
      setDocumentsList(docs);

      // If no active document selected yet, pick the most recent one
      if (!activeDocId && docs.length > 0) {
        setActiveDocId(docs[0].id);
      } else if (docs.length === 0) {
        setIsIntakeView(true);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [activeDocId]);

  // 2. Fetch active document analysis data
  const fetchDocumentAnalysis = useCallback(async (docId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/document-analysis?documentId=${docId}`);
      if (!res.ok) {
        setIsLoading(false);
        return;
      }
      const data: ActiveDocumentData = await res.json();
      setActiveDocData(data);
      setSelectedCategoryState(null);
      setIsIntakeView(false);
    } catch (err) {
      console.error('Failed to fetch document analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 1. Initial load of documents
  useEffect(() => {
    let isMounted = true;
    const loadDocs = async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }
        const data = await res.json();
        const docs = data.documents || [];
        if (isMounted) {
          setDocumentsList(docs);
          if (!initialDocumentId) {
            if (docs.length > 0) {
              const qualifiedDoc = docs.find((d: DocumentSummary) => d.qualification_status === 'AI_QUALIFIED' || d.status === 'ANALYSIS_COMPLETE');
              const targetDocId = qualifiedDoc ? qualifiedDoc.id : docs[0].id;
              setActiveDocId((prev) => prev || targetDocId);
            } else {
              setIsIntakeView(true);
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        if (isMounted) setIsLoading(false);
      }
    };
    loadDocs();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load document analysis whenever activeDocId changes
  useEffect(() => {
    if (!activeDocId) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    const loadAnalysis = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/document-analysis?documentId=${activeDocId}`);
        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }
        const data: ActiveDocumentData = await res.json();
        if (isMounted) {
          setActiveDocData(data);
          setSelectedCategoryState(null);
          setIsIntakeView(false);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch document analysis:', err);
        if (isMounted) setIsLoading(false);
      }
    };
    loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, [activeDocId]);

  // 3. Queue Polling Interval (every 3 seconds)
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => {
      fetchQueue();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // 4. Retry / Trigger Analysis from Queue
  const handleRetryAnalysis = async (docId: string, userConfirmed: boolean = false) => {
    try {
      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId, user_confirmed: userConfirmed })
      });
      if (res.ok) {
        fetchQueue();
        fetchDocuments();
      }
    } catch (err) {
      console.error('Failed to trigger analysis retry:', err);
    }
  };

  // Deterministically partition findings and coverage states into attention lanes
  const {
    primaryAttentionFinding,
    mustMeetFindings,
    couldHurtFindings,
    stillUnclearFindings,
    stillUnclearCoverage
  } = useMemo(() => {
    if (!activeDocData) {
      return {
        primaryAttentionFinding: null,
        mustMeetFindings: [],
        couldHurtFindings: [],
        stillUnclearFindings: [],
        stillUnclearCoverage: [],
        unmappedFindings: []
      };
    }
    return partitionAttentionLanes(
      activeDocData.findings || [],
      activeDocData.coverage || null,
      activeDocData.candidates || []
    );
  }, [activeDocData]);

  // Handlers
  const handleAnalysisComplete = (newDocId: string) => {
    setActiveDocId(newDocId);
    fetchDocuments();
    fetchDocumentAnalysis(newDocId);
  };

  const handleSelectDocument = (newDocId: string) => {
    setActiveDocId(newDocId);
    setIsIntakeView(false);
    setIsEvidenceDrawerOpen(false);
    setIsFullLedgerOpen(false);
    setIsCoverageMatrixOpen(false);
    router.push(`/documents/${newDocId}`);
  };

  const handleOpenFindingEvidence = (finding: FindingItem) => {
    setSelectedFinding(finding);
    setSelectedCategoryState(null);
    setIsEvidenceDrawerOpen(true);
  };

  const handleInspectCategoryAudit = (catState: CategoryInspectionState) => {
    setSelectedCategoryState(catState);
    setSelectedFinding(null);
    setIsCoverageMatrixOpen(false);
    setIsEvidenceDrawerOpen(true);
  };

  const handleOpenLedgerWithCategory = (catFilter: string = 'ALL') => {
    setActiveCategoryFilter(catFilter);
    setIsFullLedgerOpen(true);
  };

  // Header metadata object
  const selectedDocSummary = documentsList.find((d) => d.id === activeDocId);
  const headerActiveDoc = activeDocData?.document
    ? {
        id: activeDocData.document.id,
        filename: activeDocData.document.filename,
        total_pages: activeDocData.document.total_pages,
        document_type: activeDocData.document.document_type,
        status: activeDocData.document.status,
        qualification_status: activeDocData.document.qualification_status
      }
    : selectedDocSummary
    ? {
        id: selectedDocSummary.id,
        filename: selectedDocSummary.original_filename,
        total_pages: 0,
        document_type: selectedDocSummary.document_type,
        status: selectedDocSummary.status,
        qualification_status: selectedDocSummary.qualification_status
      }
    : null;

  return (
    <div className="min-h-screen bg-[#F5F6F4] flex flex-col font-sans text-[#111827]">
      
      {/* 1. WORKSPACE HEADER */}
      <WorkspaceHeader
        activeDoc={headerActiveDoc}
        runStatus={activeDocData?.run?.status || null}
        documentsList={documentsList}
        onSelectDocument={handleSelectDocument}
        onNewTenderClick={() => setIsIntakeView(true)}
        queueSummary={queueSummary}
        onOpenQueue={() => setIsQueueOpen(true)}
      />

      {/* 2. INTAKE VIEW (When uploading a new tender or no documents exist) */}
      {isIntakeView ? (
        <main className="flex-1 px-4 py-8">
          <DocumentIntake
            userId={userId}
            onAnalysisComplete={handleAnalysisComplete}
            onCancel={documentsList.length > 0 ? () => setIsIntakeView(false) : undefined}
          />
        </main>
      ) : isLoading ? (
        <main className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-8 h-8 border-2 border-[#3157D5] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-[13.5px] font-semibold text-[#111827]">
            Loading Tender Intelligence...
          </span>
          <span className="text-[12px] text-[#667085] mt-1 font-mono">
            Evaluating citations & deterministic coverage
          </span>
        </main>
      ) : activeDocData ? (
        <main className="flex-1 flex flex-col relative">
          
          {/* FIRST SCREEN: Decision Brief Information Architecture */}
          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
            
            {/* 1. DOCUMENT QUALIFICATION STATE BANNERS */}
            {activeDocData.document.qualification_status === 'AI_AMBIGUOUS' && (
              <div className="bg-[#FFFAEB] border border-[#FEDF89] rounded-sm p-4 flex items-start gap-3 text-[12.5px] text-[#B54708] shadow-2xs">
                <svg className="w-5 h-5 text-[#B54708] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-bold text-[#7A2E0E] text-[13px] mb-0.5">
                    Ambiguous Document Qualification
                  </h4>
                  <p className="text-[#93370D] leading-relaxed">
                    This document could not be definitively classified as a standard procurement RFP during intake. Review extracted clauses, candidate pages, and coverage audit carefully before making bid decisions.
                  </p>
                </div>
              </div>
            )}

            {/* 2. NON-TENDER / REJECTED DOCUMENT STATE */}
            {activeDocData.document.qualification_status === 'AI_REJECTED' ? (
              <div className="bg-white border border-[#D9DEE5] rounded-sm p-8 sm:p-12 text-center shadow-2xs">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-[17px] font-bold text-[#111827] mb-1.5">
                  Document Not Classified as Procurement Tender
                </h3>
                <p className="text-[13.5px] text-[#667085] max-w-lg mx-auto mb-5 leading-relaxed">
                  This document was evaluated by the qualification gate and determined not to be an active procurement tender (classified as <strong className="text-[#111827]">{activeDocData.document.document_type || 'NON-RFP'}</strong>). No procurement findings or mandatory bid criteria were extracted.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setIsCoverageMatrixOpen(true)}
                    className="px-4 py-2 bg-[#F5F6F4] hover:bg-[#ECEEEA] border border-[#D9DEE5] text-[#344054] text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer"
                  >
                    View Coverage Audit
                  </button>
                  <button
                    onClick={() => setIsIntakeView(true)}
                    className="px-4 py-2 bg-[#111827] hover:bg-black text-white text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer shadow-xs"
                  >
                    Ingest a New Tender &rarr;
                  </button>
                </div>
              </div>
            ) : activeDocData.document.status === 'PROCESSING' || activeDocData.run?.status === 'PROCESSING' ? (
              /* 3. IN-PROGRESS PROCESSING STATE */
              <div className="bg-white border border-[#D9DEE5] rounded-sm p-8 sm:p-12 text-center shadow-2xs">
                <div className="w-9 h-9 border-3 border-[#3157D5] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-[17px] font-bold text-[#111827] mb-1.5">
                  Analysis is being prepared
                </h3>
                <p className="text-[13.5px] text-[#667085] max-w-md mx-auto mb-4 leading-relaxed">
                  <strong className="text-[#111827]">{activeDocData.document.filename}</strong> is currently undergoing AI segmentation, evidence extraction, and deterministic verification.
                </p>
                <span className="text-[12px] font-mono text-[#667085] bg-[#F5F6F4] px-3 py-1 rounded-sm border border-[#D9DEE5]">
                  Status: Processing pages & evidence candidates
                </span>
              </div>
            ) : (
              /* 4. STANDARD DECISION BRIEF VIEW (QUALIFIED / EXTRACTED) */
              <>
                {/* STAGE 1: ATTENTION BRIEF (01 Must Meet, 02 Could Hurt, 03 Still Unclear) */}
                <AttentionBrief
                  primaryFinding={primaryAttentionFinding}
                  mustMeetFindings={mustMeetFindings}
                  couldHurtFindings={couldHurtFindings}
                  stillUnclearFindings={stillUnclearFindings}
                  stillUnclearCoverage={stillUnclearCoverage}
                  totalPages={activeDocData.document.total_pages}
                  onSelectFinding={handleOpenFindingEvidence}
                  onInspectCategoryAudit={handleInspectCategoryAudit}
                  onOpenFullLedger={handleOpenLedgerWithCategory}
                  onOpenCoverageAudit={() => setIsCoverageMatrixOpen(true)}
                />

                {/* STAGE 2: COVERAGE PULSE (12-Category Summary) */}
                <CoveragePulse
                  coverage={activeDocData.coverage}
                  pageCoverage={activeDocData.page_coverage}
                  onViewFullAudit={() => setIsCoverageMatrixOpen(true)}
                />

                {/* STAGE 3: FULL ANALYSIS ACCESS (Bottom Action Strip) */}
                <div className="bg-white border border-[#D9DEE5] rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                  <div className="text-center sm:text-left">
                    <span className="text-[13px] font-bold text-[#111827] block">
                      Complete Findings Ledger & Domain Filters
                    </span>
                    <span className="text-[12px] text-[#667085]">
                      Search across all {activeDocData.findings.length} extracted records, filter by priority, or inspect raw text citations.
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => setIsCoverageMatrixOpen(true)}
                      className="px-3.5 py-2 bg-[#F5F6F4] hover:bg-gray-200 border border-[#D9DEE5] text-[#344054] text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer"
                    >
                      Coverage Audit
                    </button>
                    <button
                      onClick={() => handleOpenLedgerWithCategory('ALL')}
                      className="px-4 py-2 bg-[#111827] hover:bg-black text-white text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer shadow-xs"
                    >
                      View All Findings ({activeDocData.findings.length}) &rarr;
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>

          {/* ========================================================================= */}
          {/* SLIDE-OVER DRAWER: EVIDENCE & SOURCE INSPECTOR */}
          {/* ========================================================================= */}
          {isEvidenceDrawerOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/40 transition-opacity"
                onClick={() => setIsEvidenceDrawerOpen(false)}
              />

              {/* Drawer Surface */}
              <div className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
                <EvidenceInspector
                  selectedFinding={selectedFinding}
                  selectedCategoryState={selectedCategoryState}
                  pages={activeDocData.pages}
                  onClearSelection={() => {
                    setSelectedFinding(null);
                    setSelectedCategoryState(null);
                    setIsEvidenceDrawerOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE-OVER / MODAL: COMPLETE FINDINGS LEDGER */}
          {/* ========================================================================= */}
          {isFullLedgerOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/40 transition-opacity"
                onClick={() => setIsFullLedgerOpen(false)}
              />

              {/* Drawer Surface */}
              <div className="relative w-full max-w-3xl bg-[#F5F6F4] shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-200">
                <div className="p-4 bg-white border-b border-[#D9DEE5] flex items-center justify-between">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#111827]">
                      Complete Findings Ledger
                    </h3>
                    <p className="text-[12px] text-[#667085]">
                      {activeDocData.findings.length} total extracted findings
                    </p>
                  </div>
                  <button
                    onClick={() => setIsFullLedgerOpen(false)}
                    className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F4] rounded-sm transition-colors cursor-pointer text-[13px] font-semibold"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  <FindingsLedger
                    findings={activeDocData.findings}
                    selectedFindingId={selectedFinding?.id || null}
                    onSelectFinding={(f) => {
                      setSelectedFinding(f);
                      setSelectedCategoryState(null);
                      setIsEvidenceDrawerOpen(true);
                    }}
                    activeCategoryFilter={activeCategoryFilter}
                    onCategoryFilterChange={(cat) => setActiveCategoryFilter(cat)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SLIDE-OVER / MODAL: COMPLETE COVERAGE AUDIT MATRIX */}
          {/* ========================================================================= */}
          {isCoverageMatrixOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 sm:p-6 md:p-10 flex items-center justify-center">
              <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-sm shadow-2xl">
                <CoverageAuditTray
                  coverage={activeDocData.coverage}
                  pageCoverage={activeDocData.page_coverage}
                  candidates={activeDocData.candidates}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectCategory={(cat) => setActiveCategoryFilter(cat)}
                  onInspectCategory={handleInspectCategoryAudit}
                  onClose={() => setIsCoverageMatrixOpen(false)}
                  isExpandedView={true}
                />
              </div>
            </div>
          )}

        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h3 className="text-[16px] font-bold text-[#111827] mb-2">
            No Tender Document Selected
          </h3>
          <p className="text-[13px] text-[#667085] mb-6">
            Upload your first procurement tender document to run automated extraction.
          </p>
          <button
            onClick={() => setIsIntakeView(true)}
            className="px-4 py-2 bg-[#3157D5] text-white text-[13px] font-semibold rounded-sm shadow-xs hover:bg-[#2546B8] cursor-pointer"
          >
            + Ingest New Tender PDF
          </button>
        </main>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER: ANALYSIS QUEUE DRAWER */}
      {/* ========================================================================= */}
      <AnalysisQueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        jobs={queueJobs}
        onSelectDocument={handleSelectDocument}
        onRetryAnalysis={handleRetryAnalysis}
      />

    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import { CRITICAL_CATEGORIES, CriticalCategory, CategoryCoverage } from '@/lib/ai/coverage';
import { PageCoverageAudit } from '@/lib/ai/retrieval';
import { CategoryInspectionState } from './EvidenceInspector';

interface CoverageAuditTrayProps {
  coverage: Record<CriticalCategory, CategoryCoverage> | null;
  pageCoverage?: PageCoverageAudit | null;
  candidates?: Array<{ category: string; trigger_pages: number[]; context_pages: number[] }>;
  activeCategoryFilter: string;
  onSelectCategory: (category: string) => void;
  onInspectCategory: (state: CategoryInspectionState) => void;
  onClose?: () => void;
  isExpandedView?: boolean;
}

export default function CoverageAuditTray({
  coverage,
  pageCoverage,
  candidates = [],
  activeCategoryFilter,
  onSelectCategory,
  onInspectCategory,
  onClose,
  isExpandedView = false
}: CoverageAuditTrayProps) {
  // Tally the 3 states unconditionally
  const summaryCounts = useMemo(() => {
    let covered = 0;
    let reviewRequired = 0;
    let uncertain = 0;

    if (!coverage) {
      return { covered, reviewRequired, uncertain };
    }

    CRITICAL_CATEGORIES.forEach((cat) => {
      const item = coverage[cat];
      if (item) {
        if (item.status === 'COVERED') covered++;
        else if (item.status === 'REVIEW_REQUIRED') reviewRequired++;
        else if (item.status === 'EXTRACTION_UNCERTAIN') uncertain++;
      }
    });

    return { covered, reviewRequired, uncertain };
  }, [coverage]);

  // If no coverage data yet (e.g., during upload or queued)
  if (!coverage) {
    return null;
  }

  // Expanded Full Modal / Overlay Grid Mode
  if (isExpandedView) {
    return (
      <div className="bg-white border border-[#D9DEE5] rounded-sm p-6 sm:p-8">
        
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#D9DEE5]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#027A48]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                Complete Coverage Audit Matrix
              </span>
            </div>
            <h3 className="text-[18px] sm:text-[20px] font-bold text-[#111827]">
              12 Critical Procurement Categories
            </h3>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F4] rounded-sm transition-colors cursor-pointer text-[13px] font-semibold"
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Page-Level Examination Accounting */}
        {pageCoverage && (
          <div className="mb-6 bg-white border border-[#D9DEE5] p-4 rounded-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#F2F4F7]">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#111827]">
                Page-Level Examination Accounting
              </span>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="font-semibold text-[#475467]">
                  Evaluated: {pageCoverage.evaluated_count} / {pageCoverage.total_pages} pages ({pageCoverage.evaluation_percentage}%)
                </span>
                {pageCoverage.unexamined_count > 0 && (
                  <span className="text-[#B54708] bg-[#FFFAEB] border border-[#FEDF89] px-2 py-0.5 rounded text-[11px] font-bold">
                    {pageCoverage.unexamined_count} unexamined pages
                  </span>
                )}
              </div>
            </div>
            <p className="text-[12px] text-[#475467] leading-relaxed mb-2">
              Evaluated pages entered category retrieval candidate batches and AI extraction. Pages not triggering procurement lexicon terms were not evaluated by AI models.
            </p>
            {pageCoverage.unexamined_count > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-[#667085]">Unexamined pages:</span>
                {pageCoverage.unexamined_pages.map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => {
                      onInspectCategory({
                        name: 'UNEXAMINED_PAGE',
                        status: 'EXTRACTION_UNCERTAIN',
                        evidence_units_count: 0,
                        verified_findings_count: 0,
                        reason: `Page ${pageNum} did not contain category trigger terms and was not evaluated by AI extraction.`,
                        candidatePages: [pageNum]
                      });
                      if (onClose) onClose();
                    }}
                    className="px-2 py-0.5 bg-[#FFFAEB] hover:bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                    title={`Inspect Page ${pageNum} text in Evidence Inspector`}
                  >
                    p. {pageNum}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Operational Principle Banner */}
        <div className="mb-6 bg-[#FAFBF9] border-l-4 border-l-[#111827] border-y border-r border-[#E5E7EB] p-4 rounded-r-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[12.5px] text-[#1F2937]">
            <strong>Core Rule:</strong> <span className="font-semibold text-[#111827]">No Verified Finding &ne; No Requirement.</span> A category marked <em>Review Required</em> or <em>Extraction Uncertain</em> indicates unconfirmed evidence or sparse pages that demand manual audit.
          </div>
          <div className="flex items-center gap-2 shrink-0 text-[11px] font-semibold">
            <span className="text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded border border-[#ABEFC6]">
              {summaryCounts.covered} Covered
            </span>
            <span className="text-[#B54708] bg-[#FFFAEB] px-2 py-0.5 rounded border border-[#FEDF89]">
              {summaryCounts.reviewRequired} Review
            </span>
            <span className="text-[#475467] bg-[#F2F4F7] px-2 py-0.5 rounded border border-[#D0D5DD]">
              {summaryCounts.uncertain} Uncertain
            </span>
          </div>
        </div>

        {/* 12-Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CRITICAL_CATEGORIES.map((cat) => {
            const item = coverage[cat] || {
              status: 'EXTRACTION_UNCERTAIN',
              evidence_units_count: 0,
              verified_findings_count: 0,
              reason: 'Insufficient candidate evidence coverage.'
            };

            const isCovered = item.status === 'COVERED';
            const isReview = item.status === 'REVIEW_REQUIRED';

            const candidateData = candidates.find((c) => c.category.toUpperCase() === cat.toUpperCase());
            const triggerPages = candidateData ? candidateData.trigger_pages : [];

            return (
              <div
                key={cat}
                onClick={() => {
                  onSelectCategory(cat);
                  onInspectCategory({
                    name: cat,
                    status: item.status,
                    evidence_units_count: item.evidence_units_count,
                    verified_findings_count: item.verified_findings_count,
                    reason: item.reason,
                    candidatePages: triggerPages
                  });
                }}
                className={`p-4 rounded-sm border transition-all cursor-pointer flex flex-col justify-between ${
                  isCovered
                    ? 'bg-[#FAFBF9] border-[#D9DEE5] hover:border-[#027A48]'
                    : isReview
                    ? 'bg-[#FFFAEB]/50 border-[#FEDF89] hover:border-[#B54708]'
                    : 'bg-[#F8F9FA] border-[#EAECF0] hover:border-gray-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[12px] font-bold text-[#111827]">
                      {cat.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        isCovered
                          ? 'bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]'
                          : isReview
                          ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                          : 'bg-[#F2F4F7] text-[#475467] border border-[#D0D5DD]'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-[12px] text-[#475467] leading-relaxed mb-3">
                    {item.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#F2F4F7] flex items-center justify-between text-[11px] font-mono text-[#667085]">
                  <span>{item.verified_findings_count} Finding(s)</span>
                  <span className="text-[#3157D5] font-sans font-semibold text-[11.5px] hover:underline">
                    Inspect &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    );
  }

  // Compact Pill Strip Mode (Anchored at the bottom or inline)
  return (
    <div className="bg-white border-t border-[#D9DEE5] px-4 md:px-6 py-3 flex flex-col gap-2.5">
      
      {/* Header & Core Truth Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#111827]">
            12-Category Critical Coverage Audit:
          </span>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded border border-[#ABEFC6]">
              {summaryCounts.covered} Covered
            </span>
            <span className="text-[#B54708] bg-[#FFFAEB] px-2 py-0.5 rounded border border-[#FEDF89]">
              {summaryCounts.reviewRequired} Review Required
            </span>
            <span className="text-[#475467] bg-[#F2F4F7] px-2 py-0.5 rounded border border-[#D0D5DD]">
              {summaryCounts.uncertain} Extraction Uncertain
            </span>
          </div>
        </div>

        {/* Operational Truth Reminder */}
        <span className="text-[11px] font-mono text-[#667085]">
          Rule: <strong className="text-[#111827]">No Verified Finding &ne; No Requirement</strong>
        </span>
      </div>

      {/* 12-Category Compact Pill Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CRITICAL_CATEGORIES.map((cat) => {
          const item = coverage[cat] || {
            status: 'EXTRACTION_UNCERTAIN',
            evidence_units_count: 0,
            verified_findings_count: 0,
            reason: 'Insufficient candidate evidence coverage.'
          };

          const isCovered = item.status === 'COVERED';
          const isReview = item.status === 'REVIEW_REQUIRED';
          const isFilterActive = activeCategoryFilter.toUpperCase() === cat.toUpperCase();

          const candidateData = candidates.find((c) => c.category.toUpperCase() === cat.toUpperCase());
          const triggerPages = candidateData ? candidateData.trigger_pages : [];

          return (
            <button
              key={cat}
              onClick={() => {
                onSelectCategory(cat);
                onInspectCategory({
                  name: cat,
                  status: item.status,
                  evidence_units_count: item.evidence_units_count,
                  verified_findings_count: item.verified_findings_count,
                  reason: item.reason,
                  candidatePages: triggerPages
                });
              }}
              title={`${cat}: ${item.reason}`}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                isFilterActive
                  ? 'ring-2 ring-[#3157D5] border-[#3157D5]'
                  : ''
              } ${
                isCovered
                  ? 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6] hover:bg-green-100'
                  : isReview
                  ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89] hover:bg-amber-100'
                  : 'bg-[#F2F4F7] text-[#475467] border-[#D0D5DD] hover:bg-gray-200'
              }`}
            >
              <span>{isCovered ? '✓' : isReview ? '!' : '?'}</span>
              <span>{cat.replace(/_/g, ' ')}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({item.verified_findings_count})
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}

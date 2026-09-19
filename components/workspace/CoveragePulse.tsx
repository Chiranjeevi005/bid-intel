'use client';

import React, { useMemo } from 'react';
import { CRITICAL_CATEGORIES, CriticalCategory, CategoryCoverage } from '@/lib/ai/coverage';
import { PageCoverageAudit } from '@/lib/ai/retrieval';

interface CoveragePulseProps {
  coverage: Record<CriticalCategory, CategoryCoverage> | null;
  pageCoverage?: PageCoverageAudit | null;
  onViewFullAudit: () => void;
}

export default function CoveragePulse({
  coverage,
  pageCoverage,
  onViewFullAudit
}: CoveragePulseProps) {
  const counts = useMemo(() => {
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

  if (!coverage) {
    return null;
  }

  return (
    <section className="bg-white border border-[#D9DEE5] rounded-sm px-4 sm:px-5 py-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Left Side: Category Audit Counts & Page Examination Counter */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#111827] text-[11.5px]">
            <span className="w-2 h-2 rounded-full bg-[#027A48]" />
            <span>Coverage Audit</span>
          </div>

          {pageCoverage && (
            <>
              <span className="text-[#D0D5DD] hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-[#475467] font-medium">Pages Evaluated:</span>
                <span className="font-mono font-bold text-[#111827]">
                  {pageCoverage.evaluated_count} / {pageCoverage.total_pages}
                </span>
                {pageCoverage.unexamined_count > 0 ? (
                  <span className="bg-[#FFFAEB] border border-[#FEDF89] text-[#B54708] px-1.5 py-0.2 rounded text-[10.5px] font-semibold">
                    {pageCoverage.unexamined_count} unindexed
                  </span>
                ) : (
                  <span className="bg-[#ECFDF3] border border-[#ABEFC6] text-[#027A48] px-1.5 py-0.2 rounded text-[10.5px] font-semibold">
                    100%
                  </span>
                )}
              </div>
            </>
          )}

          <span className="text-[#D0D5DD] hidden sm:inline">|</span>

          <span className="text-[#475467] font-medium text-[12px]">
            {CRITICAL_CATEGORIES.length} Categories:
          </span>

          <div className="flex items-center gap-2 text-[12px] flex-wrap">
            <span className="font-mono font-semibold text-[#027A48]">
              {counts.covered} Covered
            </span>
            <span className="text-[#D0D5DD]">·</span>
            <span className="font-mono font-semibold text-[#B54708]">
              {counts.reviewRequired} Review Required
            </span>
            <span className="text-[#D0D5DD]">·</span>
            <span className="font-mono font-semibold text-[#475467]">
              {counts.uncertain} Extraction Uncertain
            </span>
          </div>
        </div>

        {/* Right Side: View Audit Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onViewFullAudit}
            className="text-[12px] font-semibold text-[#3157D5] hover:text-[#2546B8] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View audit matrix</span>
            <span>&rarr;</span>
          </button>
        </div>

      </div>

      {/* Subordinate Principle Rule */}
      <div className="mt-2 pt-2 border-t border-[#F2F4F7] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#667085] gap-1">
        <span>
          Rule: <strong className="font-medium text-[#344054]">No Verified Finding &ne; No Requirement</strong> (Unverified domains demand candidate text audit)
        </span>
        {pageCoverage && pageCoverage.unexamined_count > 0 && (
          <span className="text-[#B54708] font-medium">
            Pages not indexed by lexicon candidates: {pageCoverage.unexamined_pages.slice(0, 8).join(', ')}{pageCoverage.unexamined_pages.length > 8 ? '...' : ''}
          </span>
        )}
      </div>
    </section>
  );
}

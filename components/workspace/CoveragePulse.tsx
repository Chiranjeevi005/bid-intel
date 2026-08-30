'use client';

import React, { useMemo } from 'react';
import { CRITICAL_CATEGORIES, CriticalCategory, CategoryCoverage } from '@/lib/ai/coverage';

interface CoveragePulseProps {
  coverage: Record<CriticalCategory, CategoryCoverage> | null;
  onViewFullAudit: () => void;
}

export default function CoveragePulse({
  coverage,
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
        
        {/* Left Side: Category Audit Counts */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#111827] text-[11.5px]">
            <span className="w-2 h-2 rounded-full bg-[#027A48]" />
            <span>Coverage Audit</span>
          </div>

          <span className="text-[#D0D5DD] hidden sm:inline">|</span>

          <span className="text-[#475467] font-medium text-[12px]">
            {CRITICAL_CATEGORIES.length} Categories Examined:
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
      <div className="mt-2 pt-2 border-t border-[#F2F4F7] flex items-center justify-between text-[11px] text-[#667085]">
        <span>
          Rule: <strong className="font-medium text-[#344054]">No Verified Finding &ne; No Requirement</strong> (Unverified domains demand candidate text audit)
        </span>
      </div>
    </section>
  );
}

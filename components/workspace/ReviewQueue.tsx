'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { FindingItem } from './FindingsLedger';

interface ReviewQueueProps {
  findings: FindingItem[];
  activeFindingId: string | null;
  onSelectFinding: (finding: FindingItem) => void;
  onViewAllFindings: () => void;
  limit?: number;
}

export default function ReviewQueue({
  findings,
  activeFindingId,
  onSelectFinding,
  onViewAllFindings,
  limit = 5
}: ReviewQueueProps) {
  if (!findings || findings.length === 0) {
    return null;
  }

  // Pick the top items up to the specified limit
  const queueItems = findings.slice(0, limit);

  return (
    <section className="bg-white border border-[#D9DEE5] rounded-sm p-6 mb-6">
      
      {/* Header Strip */}
      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-[#F2F4F7]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#111827]" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#111827]">
            Review Queue
          </h3>
          <span className="text-[11px] font-mono text-[#667085] bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#D9DEE5]">
            Top {queueItems.length} of {findings.length}
          </span>
        </div>

        <button
          onClick={onViewAllFindings}
          className="text-[12px] font-semibold text-[#3157D5] hover:text-[#2546B8] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View all findings ({findings.length})</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      {/* Queue List */}
      <div className="flex flex-col divide-y divide-[#F2F4F7]">
        {queueItems.map((finding, idx) => {
          const isSelected = finding.id === activeFindingId;
          const severity = (finding.severity || 'MEDIUM').toUpperCase();
          const primaryQuote = finding.quotes?.[0];
          const indexNum = String(idx + 1).padStart(2, '0');

          return (
            <div
              key={finding.id}
              onClick={() => onSelectFinding(finding)}
              className={`py-3.5 px-3 -mx-3 rounded-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-[#F8F9FA] border-l-4 border-l-[#3157D5] pl-3'
                  : 'hover:bg-[#FAFBF9]'
              }`}
            >
              {/* Left group: Number + Severity + Category + Title */}
              <div className="flex items-start sm:items-center gap-3 overflow-hidden">
                <span className="text-[12px] font-mono font-bold text-[#98A2B3] shrink-0 pt-0.5 sm:pt-0">
                  {indexNum}
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Severity Badge */}
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                      severity === 'CRITICAL'
                        ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                        : severity === 'HIGH'
                        ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                        : severity === 'LOW'
                        ? 'bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]'
                        : 'bg-[#F2F4F7] text-[#344054] border border-[#D0D5DD]'
                    }`}
                  >
                    {severity}
                  </span>

                  {/* Domain Tag */}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#475467] bg-[#F5F6F4] px-1.5 py-0.5 rounded border border-[#D9DEE5] shrink-0">
                    {finding.category.replace(/_/g, ' ')}
                  </span>
                </div>

                <h4 className="text-[13.5px] font-semibold text-[#111827] truncate">
                  {finding.title || finding.finding}
                </h4>
              </div>

              {/* Right group: Page Reference + Review indicator */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-8 sm:pl-0">
                {primaryQuote && (
                  <span className="text-[11px] font-mono text-[#667085] bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#E4E7EC]">
                    Page {primaryQuote.page_number}
                  </span>
                )}
                <span className="text-[12px] font-semibold text-[#3157D5] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Inspect</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Footer if more items exist */}
      {findings.length > limit && (
        <div className="mt-4 pt-4 border-t border-[#F2F4F7] flex items-center justify-center">
          <button
            onClick={onViewAllFindings}
            className="inline-flex items-center gap-1 w-full sm:w-auto px-4 py-2 border border-[#D9DEE5] hover:bg-[#F5F6F4] text-[#344054] text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer"
          >
            <span>Show remaining {findings.length - limit} findings in full ledger</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      )}

    </section>
  );
}

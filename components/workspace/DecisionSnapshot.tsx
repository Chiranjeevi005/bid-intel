'use client';

import React from 'react';
import { FindingItem } from './FindingsLedger';

interface DecisionSnapshotProps {
  finding: FindingItem | null;
  onReviewEvidence: (finding: FindingItem) => void;
  onOpenCoverageAudit: () => void;
  totalPages?: number;
}

export default function DecisionSnapshot({
  finding,
  onReviewEvidence,
  onOpenCoverageAudit,
  totalPages = 1
}: DecisionSnapshotProps) {
  // Empty State: Truthful handling when 0 verified findings exist
  if (!finding) {
    return (
      <section className="bg-white border border-[#D9DEE5] rounded-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#667085]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
            Primary Decision Snapshot
          </span>
        </div>

        <div className="max-w-2xl">
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#111827] tracking-tight mb-2">
            No Verified Findings Extracted
          </h2>
          <p className="text-[13.5px] text-[#475467] leading-relaxed mb-6">
            No verified findings were produced from the available document evidence. This does not guarantee that the tender is requirement-free or compliant. Review the 12-category coverage audit before making an operational decision.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCoverageAudit}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111827] hover:bg-black text-white text-[13px] font-semibold rounded-sm transition-colors shadow-xs"
            >
              Review Coverage Audit &rarr;
            </button>
          </div>
        </div>
      </section>
    );
  }

  const severity = (finding.severity || 'MEDIUM').toUpperCase();
  const primaryQuote = finding.quotes?.[0];
  const pageNumber = primaryQuote ? primaryQuote.page_number : null;

  return (
    <section className="bg-white border border-[#D9DEE5] rounded-sm p-6 sm:p-8">
      
      {/* 1. Header Metadata: Section Label + Severity Badge + Domain */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F2F4F7]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3157D5]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
            Primary Attention Item
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Domain Tag */}
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#475467] bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#D9DEE5]">
            {finding.category.replace(/_/g, ' ')}
          </span>

          {/* Severity Badge */}
          <span
            className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
              severity === 'CRITICAL'
                ? 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
                : severity === 'HIGH'
                ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                : severity === 'LOW'
                ? 'bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]'
                : 'bg-[#F2F4F7] text-[#344054] border border-[#D0D5DD]'
            }`}
          >
            {severity} PRIORITY
          </span>
        </div>
      </div>

      {/* 2. Main Finding Statement */}
      <div className="mb-6">
        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#111827] leading-snug tracking-tight mb-2">
          {finding.title || finding.finding}
        </h2>
        {finding.title && finding.title !== finding.finding && (
          <p className="text-[14px] text-[#344054] leading-relaxed">
            {finding.finding}
          </p>
        )}
      </div>

      {/* 3. Why It Matters (Commercial / Operational Implication) */}
      {finding.business_implication && (
        <div className="mb-6 bg-[#FAFBF9] border-l-4 border-l-[#3157D5] border-y border-r border-[#E5E7EB] p-4 rounded-r-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#3157D5] mb-1">
            Why It Matters
          </div>
          <p className="text-[13.5px] text-[#1F2937] leading-relaxed">
            {finding.business_implication}
          </p>
        </div>
      )}

      {/* 4. Action & Source Citation Footer */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Source Citation */}
        <div className="flex items-center gap-2 text-[12px] font-mono text-[#667085]">
          <span className="font-bold text-[#111827] uppercase">Source:</span>
          {pageNumber ? (
            <span className="bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#D9DEE5] text-[#344054]">
              Page {pageNumber} of {totalPages} · {finding.category.replace(/_/g, ' ')}
            </span>
          ) : (
            <span className="bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#D9DEE5] text-[#344054]">
              {finding.category.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => onReviewEvidence(finding)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3157D5] hover:bg-[#2546B8] text-white text-[13px] font-semibold rounded-sm transition-colors shadow-xs cursor-pointer"
        >
          <span>Review Evidence</span>
          <span className="text-[15px]">&rarr;</span>
        </button>
      </div>

    </section>
  );
}

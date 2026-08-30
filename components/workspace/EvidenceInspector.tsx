'use client';

import React, { useState, useMemo } from 'react';
import { FindingItem } from './FindingsLedger';

export interface CategoryInspectionState {
  name: string;
  status: 'COVERED' | 'REVIEW_REQUIRED' | 'EXTRACTION_UNCERTAIN';
  evidence_units_count: number;
  verified_findings_count: number;
  reason: string;
  candidatePages?: number[];
}

interface EvidenceInspectorProps {
  selectedFinding: FindingItem | null;
  selectedCategoryState: CategoryInspectionState | null;
  pages: { page_number: number; content: string; char_count: number }[];
  onClearSelection: () => void;
}

export default function EvidenceInspector({
  selectedFinding,
  selectedCategoryState,
  pages,
  onClearSelection
}: EvidenceInspectorProps) {
  // Determine default starting page based on active selection
  const defaultPage = useMemo(() => {
    if (selectedFinding?.quotes && selectedFinding.quotes.length > 0) {
      return selectedFinding.quotes[0].page_number;
    }
    if (selectedCategoryState?.candidatePages && selectedCategoryState.candidatePages.length > 0) {
      return selectedCategoryState.candidatePages[0];
    }
    return 1;
  }, [selectedFinding, selectedCategoryState]);

  // Page override state for manual navigation
  const [navPageNum, setNavPageNum] = useState<number | null>(null);

  // Copied citation feedback state
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Active page: use manual override if set, otherwise fallback to defaultPage
  const activePageNum = navPageNum !== null ? navPageNum : defaultPage;

  const totalPages = pages.length || 1;

  // Active page text
  const activePage = useMemo(() => {
    return pages.find((p) => p.page_number === activePageNum) || null;
  }, [pages, activePageNum]);

  // Highlight exact quote inside page context
  const renderedPageContent = useMemo(() => {
    if (!activePage) return 'No extracted text available for this page.';

    const rawText = activePage.content;
    const targetQuote = selectedFinding?.quotes?.find((q) => q.page_number === activePageNum)?.quote_text;

    if (!targetQuote) {
      return rawText;
    }

    // Exact or normalized case-insensitive match
    const quoteIndex = rawText.toLowerCase().indexOf(targetQuote.toLowerCase());
    if (quoteIndex === -1) {
      return rawText;
    }

    const before = rawText.slice(0, quoteIndex);
    const match = rawText.slice(quoteIndex, quoteIndex + targetQuote.length);
    const after = rawText.slice(quoteIndex + targetQuote.length);

    return (
      <>
        {before}
        <mark className="bg-yellow-200 text-gray-950 font-semibold px-1 py-0.5 rounded-xs border border-yellow-400">
          {match}
        </mark>
        {after}
      </>
    );
  }, [activePage, selectedFinding, activePageNum]);

  // 1. EMPTY STATE: When nothing is selected
  if (!selectedFinding && !selectedCategoryState) {
    return (
      <div className="h-full bg-white p-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-[#F5F6F4] border border-[#D9DEE5] flex items-center justify-center mb-3">
          <span className="text-[18px] text-[#667085] font-mono">§</span>
        </div>
        <h3 className="text-[15px] font-bold text-[#111827] mb-1.5">
          Evidence & Source Inspector
        </h3>
        <p className="text-[13px] text-[#667085] max-w-sm leading-relaxed">
          Select any finding from the Decision Snapshot or Review Queue to inspect its verbatim source quotation, commercial implication, and page context.
        </p>
      </div>
    );
  }

  // 2. CATEGORY AUDIT STATE: When inspecting an uncertain or review-required category
  if (!selectedFinding && selectedCategoryState) {
    const isReview = selectedCategoryState.status === 'REVIEW_REQUIRED';
    const isUncertain = selectedCategoryState.status === 'EXTRACTION_UNCERTAIN';

    return (
      <div className="h-full bg-white flex flex-col overflow-y-auto p-6 sm:p-8">
        
        {/* Header Strip */}
        <div className="flex items-start justify-between pb-4 border-b border-[#D9DEE5] mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                Coverage Audit Inspection
              </span>
              <span
                className={`text-[10.5px] font-bold uppercase px-2 py-0.5 rounded ${
                  isReview
                    ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                    : isUncertain
                    ? 'bg-[#F2F4F7] text-[#475467] border border-[#D0D5DD]'
                    : 'bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6]'
                }`}
              >
                {selectedCategoryState.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-[20px] font-bold text-[#111827]">
              {selectedCategoryState.name.replace(/_/g, ' ')}
            </h3>
          </div>

          <button
            onClick={onClearSelection}
            className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F4] rounded-sm transition-colors cursor-pointer text-[13px] font-semibold"
          >
            ✕ Close
          </button>
        </div>

        {/* Reason Explanation Box */}
        <div className="mb-6 p-4 rounded-sm bg-[#F5F6F4] border border-[#D9DEE5]">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#475467] mb-1.5">
            Coverage Audit Reason:
          </h4>
          <p className="text-[13.5px] text-[#111827] leading-relaxed mb-3">
            {selectedCategoryState.reason}
          </p>

          <div className="text-[12px] font-mono text-[#667085] flex items-center gap-4">
            <span>Evidence Units: {selectedCategoryState.evidence_units_count}</span>
            <span>Verified Findings: {selectedCategoryState.verified_findings_count}</span>
          </div>
        </div>

        {/* Candidate Trigger Pages for Manual Audit */}
        {selectedCategoryState.candidatePages && selectedCategoryState.candidatePages.length > 0 && (
          <div className="mb-6">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-2.5">
              Candidate Trigger Pages (Manual Audit):
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCategoryState.candidatePages.map((pg) => (
                <button
                  key={pg}
                  onClick={() => setNavPageNum(pg)}
                  className={`px-3 py-1.5 text-[12px] font-mono font-medium rounded-sm border transition-colors cursor-pointer ${
                    activePageNum === pg
                      ? 'bg-[#3157D5] text-white border-[#3157D5]'
                      : 'bg-white text-[#344054] border-[#D9DEE5] hover:bg-gray-50'
                  }`}
                >
                  Inspect Page {pg} &rarr;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Raw Page Text Browser */}
        <div className="flex-1 flex flex-col min-h-75">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Document Content (Page {activePageNum} of {totalPages})
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                disabled={activePageNum <= 1}
                onClick={() => setNavPageNum(Math.max(1, activePageNum - 1))}
                className="px-2.5 py-1 text-[11.5px] font-medium border border-[#D9DEE5] rounded bg-white text-gray-700 disabled:opacity-40 cursor-pointer"
              >
                &larr; Prev
              </button>
              <button
                disabled={activePageNum >= totalPages}
                onClick={() => setNavPageNum(Math.min(totalPages, activePageNum + 1))}
                className="px-2.5 py-1 text-[11.5px] font-medium border border-[#D9DEE5] rounded bg-white text-gray-700 disabled:opacity-40 cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 bg-[#FAFBF9] border border-[#D9DEE5] rounded-sm font-mono text-[12px] leading-relaxed text-[#212529] overflow-y-auto whitespace-pre-wrap">
            {renderedPageContent}
          </div>
        </div>

      </div>
    );
  }

  // 3. STANDARD FINDING INSPECTION
  const finding = selectedFinding!;
  const severity = (finding.severity || 'MEDIUM').toUpperCase();

  return (
    <div className="h-full bg-white flex flex-col overflow-y-auto p-6 sm:p-8">
      
      {/* Header Strip: Category + Severity + Close Button */}
      <div className="pb-4 border-b border-[#D9DEE5] mb-6">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#475467] bg-[#F5F6F4] px-2 py-0.5 rounded border border-[#D9DEE5]">
              {finding.category.replace(/_/g, ' ')}
            </span>
            <span
              className={`text-[10.5px] font-bold uppercase px-2 py-0.5 rounded ${
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
          </div>

          <button
            onClick={onClearSelection}
            className="p-1.5 text-[#667085] hover:text-[#111827] hover:bg-[#F5F6F4] rounded-sm transition-colors cursor-pointer text-[13px] font-semibold"
          >
            ✕ Close
          </button>
        </div>

        <h3 className="text-[19px] font-bold text-[#111827] leading-snug">
          {finding.title || finding.finding}
        </h3>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* 1. WHAT WAS IDENTIFIED (Fact) */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
            What Was Identified (Verified Fact)
          </h4>
          <p className="text-[14px] text-[#111827] leading-relaxed">
            {finding.finding}
          </p>
        </div>

        {/* 2. WHY IT MATTERS (Business Implication) */}
        {finding.business_implication && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
              Why It Matters (Commercial Implication)
            </h4>
            <div className="p-4 bg-[#F8F9FC] border border-[#E0E8F9] rounded-sm text-[13.5px] text-[#1E3A8A] leading-relaxed">
              {finding.business_implication}
            </div>
          </div>
        )}

        {/* 3. VERBATIM SOURCE EVIDENCE (Source Serif 4) */}
        {finding.quotes && finding.quotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                Verbatim Extracted Evidence
              </h4>
              <span className="text-[11px] font-mono text-[#667085]">
                Verified 100% Against Page Text
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {finding.quotes.map((q) => {
                const quoteKey = q.id || String(q.page_number);
                const isCopied = copiedQuoteId === quoteKey;

                const handleCopyCitation = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const citationText = `Page ${q.page_number} · ${finding.category.replace(/_/g, ' ')}\n"${q.quote_text}"`;
                  navigator.clipboard.writeText(citationText).then(() => {
                    setCopiedQuoteId(quoteKey);
                    setTimeout(() => setCopiedQuoteId(null), 2000);
                  });
                };

                return (
                  <div
                    key={quoteKey}
                    className="p-4 bg-[#FBFBFA] border-l-4 border-l-[#3157D5] border-y border-r border-[#D9DEE5] rounded-r-sm"
                  >
                    <p className="font-serif text-[15px] leading-[1.65] text-[#111827]">
                      &ldquo;{q.quote_text}&rdquo;
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-[#ECEEEA] flex items-center justify-between text-[11.5px] font-mono text-[#667085]">
                      <div className="flex items-center gap-3">
                        <span>Page {q.page_number}</span>
                        <button
                          onClick={handleCopyCitation}
                          className="font-sans text-[11.5px] font-semibold text-[#667085] hover:text-[#111827] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {isCopied ? (
                            <span className="text-[#027A48] font-bold">✓ Citation copied</span>
                          ) : (
                            <span>Copy citation</span>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => setNavPageNum(q.page_number)}
                        className="text-[#3157D5] hover:underline font-sans font-medium text-[12px] cursor-pointer"
                      >
                        Open Page {q.page_number} Context &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. ANALYST ACTION RECOMMENDATION */}
        {finding.action_recommendation && (
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
              Analyst Action Recommendation
            </h4>
            <div className="p-4 bg-[#F9FAFB] border border-[#EAECF0] rounded-sm text-[13px] text-[#344054] leading-relaxed">
              {finding.action_recommendation}
            </div>
          </div>
        )}

        {/* 5. SURROUNDING DOCUMENT CONTEXT */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
              Surrounding Page Context (Page {activePageNum} of {totalPages})
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                disabled={activePageNum <= 1}
                onClick={() => setNavPageNum(Math.max(1, activePageNum - 1))}
                className="px-2.5 py-1 text-[11px] font-medium border border-[#D9DEE5] rounded bg-white text-gray-700 disabled:opacity-40 cursor-pointer"
              >
                &larr; Prev
              </button>
              <button
                disabled={activePageNum >= totalPages}
                onClick={() => setNavPageNum(Math.min(totalPages, activePageNum + 1))}
                className="px-2.5 py-1 text-[11px] font-medium border border-[#D9DEE5] rounded bg-white text-gray-700 disabled:opacity-40 cursor-pointer"
              >
                Next &rarr;
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#FAFBF9] border border-[#D9DEE5] rounded-sm font-mono text-[12px] leading-relaxed text-[#212529] max-h-72 overflow-y-auto whitespace-pre-wrap">
            {renderedPageContent}
          </div>
        </div>

      </div>

    </div>
  );
}

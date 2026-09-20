'use client';

import React from 'react';
import { FindingItem } from './FindingsLedger';
import { UnclearCoverageItem } from '@/lib/ai/attention-lanes';
import { CategoryInspectionState } from './EvidenceInspector';
import { FileText, Lock, ArrowRight } from 'lucide-react';

interface AttentionBriefProps {
  primaryFinding: FindingItem | null;
  mustMeetFindings: FindingItem[];
  couldHurtFindings: FindingItem[];
  stillUnclearFindings: FindingItem[];
  stillUnclearCoverage: UnclearCoverageItem[];
  totalPages: number;
  userPlan?: 'FREE' | 'PRO_INDIA' | 'PRO_GLOBAL';
  onSelectFinding: (finding: FindingItem) => void;
  onInspectCategoryAudit: (catState: CategoryInspectionState) => void;
  onOpenFullLedger: (categoryFilter?: string) => void;
  onOpenCoverageAudit: () => void;
  onUpgradeToPro?: () => void;
}

export default function AttentionBrief({
  primaryFinding,
  mustMeetFindings,
  couldHurtFindings,
  stillUnclearFindings,
  stillUnclearCoverage,
  totalPages,
  userPlan = 'FREE',
  onSelectFinding,
  onInspectCategoryAudit,
  onOpenFullLedger,
  onOpenCoverageAudit,
  onUpgradeToPro
}: AttentionBriefProps) {
  // If there are zero findings and zero unverified coverage items across the entire document
  if (!primaryFinding && mustMeetFindings.length === 0 && couldHurtFindings.length === 0 && stillUnclearFindings.length === 0 && stillUnclearCoverage.length === 0) {
    return (
      <div className="bg-white border border-[#D9DEE5] rounded-sm p-6 sm:p-8 text-center shadow-2xs">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#F2F4F7] border border-[#EAECF0] text-[#475467] mb-3">
          <FileText className="w-5 h-5 text-[#667085]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[15px] font-bold text-[#111827] mb-1">
          No Verified Findings Extracted
        </h3>
        <p className="text-[13px] text-[#667085] max-w-md mx-auto mb-4">
          No verified procurement findings were produced from the available evidence in this document. Review the coverage audit to inspect candidate pages and unverified clauses.
        </p>
        <button
          onClick={onOpenCoverageAudit}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#111827] hover:bg-black text-white text-[12px] font-semibold rounded-sm transition-colors cursor-pointer"
        >
          <span>View Coverage Audit</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  // Get primary page quote number if available
  const primaryPage = primaryFinding?.quotes?.[0]?.page_number || null;

  return (
    <div className="flex flex-col gap-6">
      
      {/* ----------------------------------------------------------------- */}
      {/* 1. WHAT DESERVES ATTENTION (Dominant Primary Item)                */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-white border border-[#D9DEE5] rounded-sm shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-6 flex flex-col gap-3.5">
          
          {primaryFinding ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAECF0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                    What Deserves Attention
                  </span>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-xs font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                    {primaryFinding.severity || 'HIGH'} PRIORITY
                  </span>
                </div>

                {primaryPage && (
                  <span className="text-[12px] font-mono text-[#667085]">
                    Source: Page {primaryPage} {totalPages > 0 ? `of ${totalPages}` : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-[#111827] tracking-tight leading-snug">
                  {primaryFinding.title}
                </h2>

                <p className="text-[13.5px] text-[#344054] leading-relaxed">
                  {primaryFinding.finding}
                </p>

                {primaryFinding.business_implication && (
                  <div className="mt-1 bg-[#F9FAFB] border-l-2 border-[#3157D5] p-3 rounded-r-xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#3157D5] block mb-0.5">
                      Why It Matters (Operational Implication)
                    </span>
                    <p className="text-[12.5px] text-[#1D2939] leading-relaxed">
                      {primaryFinding.business_implication}
                    </p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11.5px] text-[#667085] font-mono">
                    Domain: {primaryFinding.category.replace(/_/g, ' ')}
                  </span>

                  <button
                    onClick={() => onSelectFinding(primaryFinding)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3157D5] hover:bg-[#2546B8] text-white text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Review Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] block mb-1">
                  Primary Attention Finding
                </span>
                <p className="text-[14px] font-semibold text-[#111827]">
                  No verified findings were produced from the available evidence.
                </p>
                <p className="text-[12px] text-[#667085] mt-0.5">
                  Inspect the coverage audit below to evaluate unverified candidate pages or extraction uncertainties.
                </p>
              </div>
              <button
                onClick={onOpenCoverageAudit}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#111827] hover:bg-black text-white text-[12px] font-semibold rounded-sm transition-colors cursor-pointer shrink-0"
              >
                <span>Inspect Coverage Audit</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          )}

        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. THREE ATTENTION LANES (Editorial Vertical Composition)         */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-6">

        {/* --------------------------------------------------------------- */}
        {/* LANE 01 — MUST MEET                                             */}
        {/* --------------------------------------------------------------- */}
        <section className="bg-white border border-[#D9DEE5] rounded-sm p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAECF0] pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#111827] tracking-tight">
                  01 / MUST MEET
                </span>
                <span className="text-[11px] font-mono px-2 py-0.2 rounded-xs bg-[#F2F4F7] text-[#344054] font-semibold">
                  {mustMeetFindings.length} items
                </span>
              </div>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Requirements that may affect eligibility, participation, or mandatory submission.
              </p>
            </div>

            {mustMeetFindings.length > 4 && (
              <button
                onClick={() => onOpenFullLedger('LANE_MUST_MEET')}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3157D5] hover:underline cursor-pointer"
              >
                <span>View all ({mustMeetFindings.length})</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {mustMeetFindings.length > 0 ? (
            <div className="divide-y divide-[#F2F4F7]">
              {mustMeetFindings.slice(0, 4).map((item, idx) => {
                const pageNum = item.quotes?.[0]?.page_number || null;
                const isCritical = (item.severity || '').toUpperCase() === 'CRITICAL';
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] px-2 rounded-xs transition-colors group cursor-pointer"
                    onClick={() => onSelectFinding(item)}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-[12px] font-mono text-[#98A2B3] font-semibold shrink-0 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#111827] group-hover:text-[#3157D5] transition-colors truncate">
                            {item.title}
                          </span>
                          {isCritical && (
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#B42318] bg-[#FEF3F2] px-1.5 py-0.2 rounded-xs border border-[#FECDCA]">
                              Critical
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#475467] line-clamp-1 mt-0.5">
                          {item.finding}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {pageNum && (
                        <span className="text-[11.5px] font-mono text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-xs">
                          p.{pageNum}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#3157D5] font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12.5px] text-[#667085] py-2">
              No mandatory eligibility or submission constraints extracted for this document. Check the Coverage Audit to inspect unverified criteria.
            </p>
          )}
        </section>

        {/* --------------------------------------------------------------- */}
        {/* LANE 02 — COULD HURT                                            */}
        {/* --------------------------------------------------------------- */}
        <section className="bg-white border border-[#D9DEE5] rounded-sm p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAECF0] pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#111827] tracking-tight">
                  02 / COULD HURT
                </span>
                <span className="text-[11px] font-mono px-2 py-0.2 rounded-xs bg-[#F2F4F7] text-[#344054] font-semibold">
                  {couldHurtFindings.length} items
                </span>
              </div>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Contractual or commercial issues that may create material legal, financial, or delivery exposure.
              </p>
            </div>

            {couldHurtFindings.length > 4 && userPlan === 'PRO_GLOBAL' && (
              <button
                onClick={() => onOpenFullLedger('LANE_COULD_HURT')}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3157D5] hover:underline cursor-pointer"
              >
                <span>View all ({couldHurtFindings.length})</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {userPlan !== 'PRO_GLOBAL' ? (
            /* Non-Pro (Free or Plus) Gated Preview */
            <div className="p-4 sm:p-5 bg-linear-to-b from-[#FAFBFD] to-[#F0F4FE] border border-[#D9DEE5] rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E0E8F9] text-[#3157D5] flex items-center justify-center shrink-0 mt-0.5 border border-[#C5D5F6]">
                  <Lock className="w-4 h-4 text-[#3157D5]" strokeWidth={2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-bold text-[#111827]">
                      Contract Exposure
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#3157D5] text-white px-2 py-0.5 rounded-full">
                      PRO ONLY
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[#475467] mt-1 leading-relaxed max-w-xl">
                    This tender contains <strong>{couldHurtFindings.length} contractual exposure findings</strong> covering liability, indemnity, termination, liquidated damages, and insurance obligations. Upgrade to Pro to inspect the findings and supporting evidence.
                  </p>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <button
                  onClick={onUpgradeToPro}
                  className="w-full sm:w-auto px-4 py-2 bg-[#3157D5] hover:bg-[#2544ab] text-white text-[12.5px] font-semibold rounded-sm transition-colors cursor-pointer shadow-xs whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : couldHurtFindings.length > 0 ? (
            <div className="divide-y divide-[#F2F4F7]">
              {couldHurtFindings.slice(0, 4).map((item, idx) => {
                const pageNum = item.quotes?.[0]?.page_number || null;
                const isHighOrCrit = ['CRITICAL', 'HIGH'].includes((item.severity || '').toUpperCase());
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] px-2 rounded-xs transition-colors group cursor-pointer"
                    onClick={() => onSelectFinding(item)}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-[12px] font-mono text-[#98A2B3] font-semibold shrink-0 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[#111827] group-hover:text-[#3157D5] transition-colors truncate">
                            {item.title}
                          </span>
                          {isHighOrCrit && (
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#B54708] bg-[#FFFAEB] px-1.5 py-0.2 rounded-xs border border-[#FEDF89]">
                              Exposure
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#475467] line-clamp-1 mt-0.5">
                          {item.finding}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {pageNum && (
                        <span className="text-[11.5px] font-mono text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-xs">
                          p.{pageNum}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#3157D5] font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12.5px] text-[#667085] py-2">
              No material liabilities, unilateral penalties, or termination clauses extracted for this document.
            </p>
          )}
        </section>

        {/* --------------------------------------------------------------- */}
        {/* LANE 03 — STILL UNCLEAR                                         */}
        {/* --------------------------------------------------------------- */}
        <section className="bg-white border border-[#D9DEE5] rounded-sm p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EAECF0] pb-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-[#111827] tracking-tight">
                  03 / STILL UNCLEAR
                </span>
                <span className="text-[11px] font-mono px-2 py-0.2 rounded-xs bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] font-semibold">
                  {stillUnclearFindings.length + stillUnclearCoverage.length} open items
                </span>
              </div>
              <p className="text-[12px] text-[#667085] mt-0.5">
                Contradictions, missing specifications, and coverage domains requiring human review.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {stillUnclearFindings.length > 3 && (
                <button
                  onClick={() => onOpenFullLedger('LANE_STILL_UNCLEAR')}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3157D5] hover:underline cursor-pointer"
                >
                  <span>View all ({stillUnclearFindings.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
              <button
                onClick={onOpenCoverageAudit}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3157D5] hover:underline cursor-pointer"
              >
                <span>Full Coverage Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* 1. Explicit Findings (Ambiguities, Contradictions, Missing Info) */}
            {stillUnclearFindings.length > 0 && (
              <div className="divide-y divide-[#F2F4F7]">
                {stillUnclearFindings.slice(0, 3).map((item, idx) => {
                  const pageNum = item.quotes?.[0]?.page_number || null;
                  return (
                    <div
                      key={item.id}
                      className="py-2 flex items-start justify-between gap-3 hover:bg-[#F9FAFB] px-2 rounded-xs transition-colors group cursor-pointer"
                      onClick={() => onSelectFinding(item)}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-[12px] font-mono text-[#B54708] font-semibold shrink-0 mt-0.5">
                          U{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] font-semibold text-[#111827] group-hover:text-[#3157D5] transition-colors truncate block">
                            {item.title}
                          </span>
                          <p className="text-[12px] text-[#475467] line-clamp-1 mt-0.5">
                            {item.finding}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {pageNum && (
                          <span className="text-[11.5px] font-mono text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-xs">
                            p.{pageNum}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[12px] text-[#3157D5] font-semibold group-hover:translate-x-0.5 transition-transform">
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Coverage Uncertainty Items (REVIEW_REQUIRED / EXTRACTION_UNCERTAIN) */}
            {stillUnclearCoverage.length > 0 && (
              <div className="pt-2 border-t border-[#F2F4F7] flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  Unverified Domain Coverage
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stillUnclearCoverage.slice(0, 4).map((cov) => {
                    const isReviewReq = cov.status === 'REVIEW_REQUIRED';
                    return (
                      <div
                        key={cov.category}
                        onClick={() =>
                          onInspectCategoryAudit({
                            name: cov.category,
                            status: cov.status,
                            reason: cov.reason,
                            evidence_units_count: cov.evidence_units_count,
                            verified_findings_count: 0,
                            candidatePages: cov.trigger_pages
                          })
                        }
                        className={`p-2.5 rounded-xs border transition-colors cursor-pointer flex flex-col justify-between ${
                          isReviewReq
                            ? 'bg-[#FFFAEB]/50 border-[#FEDF89] hover:bg-[#FFFAEB]'
                            : 'bg-[#F9FAFB] border-[#EAECF0] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[12px] font-bold text-[#111827]">
                            {cov.category.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-xs font-semibold ${
                              isReviewReq
                                ? 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
                                : 'bg-[#F2F4F7] text-[#475467]'
                            }`}
                          >
                            {isReviewReq ? 'Review Required' : 'Uncertain'}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-[#667085] line-clamp-2">
                          {cov.reason}
                        </p>
                        <div className="mt-2 pt-1 border-t border-[#EAECF0] flex items-center justify-between text-[11px]">
                          <span className="font-mono text-[#667085]">
                            {cov.trigger_pages.length > 0
                              ? `Pages ${cov.trigger_pages.join(', ')}`
                              : 'No candidate pages'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[#3157D5]">
                            <span>Inspect uncertainty</span>
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state when zero uncertainties exist */}
            {stillUnclearFindings.length === 0 && stillUnclearCoverage.length === 0 && (
              <p className="text-[12.5px] text-[#667085] py-2">
                No ambiguities or extraction uncertainties surfaced for this document.
              </p>
            )}

            {/* Principle badge */}
            <div className="mt-2 p-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-xs flex items-center gap-2 text-[11px] text-[#475467]">
              <span className="font-bold text-[#111827]">Core Rule:</span>
              <span>No Verified Finding ≠ No Requirement. Always inspect candidate text for unverified domains.</span>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}

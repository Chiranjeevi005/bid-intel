'use client';

import React, { useState, useMemo } from 'react';
import { Search, Lock, ArrowRight, FilterX } from 'lucide-react';
import { classifyFindingToLane } from '@/lib/ai/attention-lanes';

export interface FindingQuote {
  id: string;
  finding_id: string;
  page_number: number;
  quote_text: string;
}

export interface FindingItem {
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
  quotes?: FindingQuote[];
  is_pro_gated?: boolean;
  created_at: string;
}

interface FindingsLedgerProps {
  findings: FindingItem[];
  selectedFindingId: string | null;
  onSelectFinding: (finding: FindingItem) => void;
  activeCategoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  userPlan?: 'FREE' | 'PRO_INDIA' | 'PRO_GLOBAL';
  onUpgradeToPro?: () => void;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4
};

export default function FindingsLedger({
  findings,
  selectedFindingId,
  onSelectFinding,
  activeCategoryFilter,
  onCategoryFilterChange,
  userPlan = 'FREE',
  onUpgradeToPro
}: FindingsLedgerProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories present in actual records
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    findings.forEach((f) => set.add(f.category));
    return Array.from(set);
  }, [findings]);

  // Compute live attention lane counts
  const laneCounts = useMemo(() => {
    const counts = { MUST_MEET: 0, COULD_HURT: 0, STILL_UNCLEAR: 0 };
    findings.forEach((f) => {
      const lane = classifyFindingToLane(f);
      if (lane === 'MUST_MEET') counts.MUST_MEET++;
      else if (lane === 'COULD_HURT') counts.COULD_HURT++;
      else if (lane === 'STILL_UNCLEAR') counts.STILL_UNCLEAR++;
    });
    return counts;
  }, [findings]);

  // First filter by Domain or Attention Lane
  const domainFilteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (activeCategoryFilter === 'ALL') return true;
      const upperFilter = activeCategoryFilter.toUpperCase();
      if (upperFilter === 'LANE_MUST_MEET' || upperFilter === 'MUST_MEET' || upperFilter === 'MANDATORY_ELIGIBILITY') {
        return classifyFindingToLane(f) === 'MUST_MEET' || f.category.toUpperCase() === 'ELIGIBILITY';
      }
      if (upperFilter === 'LANE_COULD_HURT' || upperFilter === 'COULD_HURT' || upperFilter === 'LIABILITY_INDEMNITY') {
        return classifyFindingToLane(f) === 'COULD_HURT' || f.category.toUpperCase() === 'LIABILITY_RISK';
      }
      if (upperFilter === 'LANE_STILL_UNCLEAR' || upperFilter === 'STILL_UNCLEAR') {
        return classifyFindingToLane(f) === 'STILL_UNCLEAR';
      }
      return f.category.toUpperCase() === upperFilter;
    });
  }, [findings, activeCategoryFilter]);

  // Compute live severity counts based on the active domain/lane filter
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: domainFilteredFindings.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    domainFilteredFindings.forEach((f) => {
      const sev = (f.severity || 'MEDIUM').toUpperCase();
      if (counts[sev] !== undefined) {
        counts[sev]++;
      }
    });
    return counts;
  }, [domainFilteredFindings]);

  // Finally filter by severity and search query
  const filteredFindings = useMemo(() => {
    return domainFilteredFindings
      .filter((f) => {
        // Severity filter
        if (severityFilter !== 'ALL' && (f.severity || 'MEDIUM').toUpperCase() !== severityFilter.toUpperCase()) {
          return false;
        }
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = f.title?.toLowerCase().includes(q);
          const matchFact = f.finding?.toLowerCase().includes(q);
          const matchImp = f.business_implication?.toLowerCase().includes(q);
          const matchQuote = f.quotes?.some((quote) => quote.quote_text.toLowerCase().includes(q));
          return matchTitle || matchFact || matchImp || matchQuote;
        }
        return true;
      })
      .sort((a, b) => {
        const orderA = SEVERITY_ORDER[(a.severity || 'MEDIUM').toUpperCase()] || 99;
        const orderB = SEVERITY_ORDER[(b.severity || 'MEDIUM').toUpperCase()] || 99;
        return orderA - orderB;
      });
  }, [domainFilteredFindings, severityFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#F5F6F4]">
      
      {/* Ledger Filter & Search Strip */}
      <div className="p-4 bg-white border-b border-[#D9DEE5] flex flex-col gap-3">
        
        {/* Top Filter Bar: Category & Search */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          
          {/* Category / Lane Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] shrink-0">
              Domain:
            </span>
            <select
              value={activeCategoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="text-[12px] font-semibold text-[#111827] bg-[#F5F6F4] border border-[#D9DEE5] rounded-sm px-2.5 py-1 focus:ring-1 focus:ring-[#3157D5] focus:outline-none"
            >
              <option value="ALL">All Domains ({findings.length})</option>
              
              <optgroup label="Attention Lanes">
                <option value="LANE_MUST_MEET">
                  01 / Must Meet ({laneCounts.MUST_MEET})
                </option>
                <option value="LANE_COULD_HURT">
                  02 / Could Hurt ({laneCounts.COULD_HURT})
                </option>
                <option value="LANE_STILL_UNCLEAR">
                  03 / Still Unclear ({laneCounts.STILL_UNCLEAR})
                </option>
              </optgroup>

              <optgroup label="Specific Categories">
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')} ({findings.filter(f => f.category === cat).length})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search findings or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 md:w-56 text-[12px] bg-[#F5F6F4] border border-[#D9DEE5] rounded-sm pl-8 pr-2 py-1 text-[#111827] placeholder-[#667085] focus:ring-1 focus:ring-[#3157D5] focus:outline-none"
            />
          </div>
        </div>

        {/* Severity Priority Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085] mr-1">
            Priority:
          </span>

          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
              severityFilter === 'ALL'
                ? 'bg-[#111827] text-white'
                : 'bg-white text-[#475467] border border-[#D9DEE5] hover:bg-gray-50'
            }`}
          >
            ALL ({severityCounts.ALL})
          </button>

          {severityCounts.CRITICAL > 0 && (
            <button
              onClick={() => setSeverityFilter('CRITICAL')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                severityFilter === 'CRITICAL'
                  ? 'bg-[#B42318] text-white'
                  : 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] hover:bg-red-100'
              }`}
            >
              CRITICAL ({severityCounts.CRITICAL})
            </button>
          )}

          {severityCounts.HIGH > 0 && (
            <button
              onClick={() => setSeverityFilter('HIGH')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                severityFilter === 'HIGH'
                  ? 'bg-[#B54708] text-white'
                  : 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] hover:bg-amber-100'
              }`}
            >
              HIGH ({severityCounts.HIGH})
            </button>
          )}

          {severityCounts.MEDIUM > 0 && (
            <button
              onClick={() => setSeverityFilter('MEDIUM')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                severityFilter === 'MEDIUM'
                  ? 'bg-[#344054] text-white'
                  : 'bg-white text-[#475467] border border-[#D9DEE5] hover:bg-gray-50'
              }`}
            >
              MEDIUM ({severityCounts.MEDIUM})
            </button>
          )}

          {severityCounts.LOW > 0 && (
            <button
              onClick={() => setSeverityFilter('LOW')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                severityFilter === 'LOW'
                  ? 'bg-[#027A48] text-white'
                  : 'bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6] hover:bg-green-100'
              }`}
            >
              LOW ({severityCounts.LOW})
            </button>
          )}
        </div>

      </div>

      {/* Findings List Stream */}
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-2.5">
        
        {filteredFindings.length === 0 ? (
          <div className="bg-white border border-[#D9DEE5] rounded-sm p-8 text-center flex flex-col items-center justify-center my-auto">
            <FilterX className="w-8 h-8 text-[#98A2B3] mx-auto mb-2" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-[#111827] mb-1">
              No findings matching active filters
            </span>
            <p className="text-[12px] text-[#667085] max-w-sm mb-3">
              {findings.length === 0
                ? 'No verified findings were extracted for this document. Use the Critical Coverage audit below to review candidate evidence sections manually.'
                : 'Adjust your domain or priority filters above to display other extracted records.'}
            </p>
            {findings.length > 0 && (
              <button
                onClick={() => {
                  onCategoryFilterChange('ALL');
                  setSeverityFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 bg-[#111827] hover:bg-black text-white text-[12px] font-semibold rounded-sm transition-colors cursor-pointer"
              >
                Reset Filters to All Domains ({findings.length})
              </button>
            )}
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isSelected = finding.id === selectedFindingId;
            const primaryQuote = finding.quotes?.[0];
            const severity = (finding.severity || 'MEDIUM').toUpperCase();

            if (finding.is_pro_gated) {
              return (
                <div
                  key={finding.id}
                  className="p-3.5 rounded-sm bg-[#FAFBFD] border border-blue-200 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#475467] bg-[#F5F6F4] px-1.5 py-0.5 rounded border border-[#D9DEE5]">
                        {finding.category.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider bg-[#3157D5] text-white px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" strokeWidth={2.5} />
                        PRO ONLY
                      </span>
                    </div>
                  </div>

                  <h4 className="text-[13.5px] font-semibold text-[#111827] leading-snug mb-1">
                    Contractual Exposure Finding
                  </h4>
                  <p className="text-[12px] text-[#475467] leading-relaxed mb-2.5">
                    Substantive contractual finding details and verbatim evidence are protected under the Pro plan.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpgradeToPro) onUpgradeToPro();
                    }}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3157D5] hover:text-[#2544ab] cursor-pointer"
                  >
                    <span>Upgrade to Pro to inspect findings & evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={finding.id}
                onClick={() => onSelectFinding(finding)}
                className={`p-3.5 rounded-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-l-4 border-l-[#3157D5] border-y border-r border-[#3157D5] shadow-xs'
                    : 'bg-white border border-[#D9DEE5] hover:border-gray-400'
                }`}
              >
                {/* Meta Row: Domain + Severity + Page Tag */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Domain Badge */}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#475467] bg-[#F5F6F4] px-1.5 py-0.5 rounded border border-[#D9DEE5]">
                      {finding.category.replace(/_/g, ' ')}
                    </span>

                    {/* Severity Pill */}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
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

                  {/* Page Citation Reference */}
                  {primaryQuote && (
                    <span className="text-[11px] font-mono font-medium text-[#667085] shrink-0 bg-[#F8F9FA] px-1.5 py-0.5 rounded border border-[#E9ECEF]">
                      Page {primaryQuote.page_number}
                    </span>
                  )}
                </div>

                {/* Finding Title & Fact */}
                <h4 className="text-[13.5px] font-semibold text-[#111827] leading-snug mb-1">
                  {finding.title || finding.finding}
                </h4>

                {/* Business Implication Snippet */}
                {finding.business_implication && (
                  <p className="text-[12px] text-[#475467] leading-relaxed line-clamp-2 mb-1.5">
                    {finding.business_implication}
                  </p>
                )}

                {/* Verbatim Evidence Excerpt Snippet */}
                {primaryQuote && (
                  <div className="bg-[#FAFBF9] border-l-2 border-[#3157D5] px-2.5 py-1 rounded-r-xs mt-1">
                    <p className="font-serif text-[11.5px] italic text-[#344054] line-clamp-1">
                      &ldquo;{primaryQuote.quote_text}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}

      </div>

    </div>
  );
}

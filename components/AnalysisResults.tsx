'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Finding = {
  id: string;
  category: string;
  title: string;
  finding: string;
  business_implication: string | null;
  action_recommendation: string | null;
  severity: string | null;
  confidence: string;
  quotes: { id: string; page_number: number; quote_text: string }[];
};

export default function AnalysisResults({ runId }: { runId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadFindings() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('analysis_findings')
        .select('*, quotes:analysis_finding_quotes(*)')
        .eq('analysis_run_id', runId)
        .order('category', { ascending: true });

      if (error) {
        console.error(error);
        setError('Failed to load findings.');
      } else {
        setFindings(data || []);
      }
      setLoading(false);
    }
    loadFindings();
  }, [runId]);

  if (loading) return <div className="mt-8 text-center text-gray-500">Loading analysis results...</div>;
  if (error) return <div className="mt-8 text-center text-red-600">{error}</div>;
  if (findings.length === 0) return <div className="mt-8 text-center text-gray-500">No findings extracted.</div>;

  const macroCategories: Record<string, string[]> = {
    'Executive Intelligence': ['OPPORTUNITY_FIT', 'MANDATORY_ELIGIBILITY', 'KEY_DATES'],
    'Requirements': ['SUBMISSION_REQUIREMENTS', 'EVALUATION_CRITERIA', 'UNUSUAL_OBLIGATIONS'],
    'Commercial & Risk': ['LIABILITY_INDEMNITY', 'TERMINATION_RIGHTS', 'COMMERCIAL_TERMS'],
    'Gaps & Clarifications': ['AMBIGUITIES_CONTRADICTIONS', 'MISSING_INFORMATION']
  };

  const groupedFindings = findings.reduce((acc, f) => {
    let macroCategory = 'Other';
    for (const [macro, cats] of Object.entries(macroCategories)) {
      if (cats.includes(f.category)) {
        macroCategory = macro;
        break;
      }
    }
    if (!acc[macroCategory]) acc[macroCategory] = [];
    acc[macroCategory].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  return (
    <div className="mt-8 space-y-8">
      <h3 className="text-2xl font-bold text-gray-900 border-b pb-4">Intelligence Report</h3>
      
      {Object.entries(groupedFindings).map(([macroGroup, items]) => (
        <div key={macroGroup} className="space-y-6">
          <h4 className="text-xl font-bold text-gray-800">{macroGroup}</h4>
          {items.map(f => (
            <div key={f.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {f.category.replace(/_/g, ' ')}
                  </div>
                  <h5 className="text-lg font-bold text-gray-900">{f.title}</h5>
                </div>
                <div className="flex space-x-2">
                  {f.severity && (
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      f.severity === 'CRITICAL' ? 'bg-red-200 text-red-900' :
                      f.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      f.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {f.severity} PRIORITY
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-300">
                  <h6 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Verified Fact</h6>
                  <p className="text-gray-900 mb-3 font-medium">{f.finding}</p>
                  
                  <div className="space-y-2">
                    {f.quotes && f.quotes.length > 0 ? f.quotes.map((q) => (
                      <div key={q.id} className="bg-white border border-gray-200 rounded p-3 text-sm flex gap-3">
                        <div className="shrink-0 pt-0.5">
                          <span className="bg-gray-200 text-gray-700 px-2 py-1 text-xs font-bold rounded">PAGE {q.page_number}</span>
                        </div>
                        <p className="text-gray-600 italic">"{q.quote_text}"</p>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500 italic">No quotes available.</div>
                    )}
                  </div>
                </div>

                {(f.business_implication || f.action_recommendation) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {f.business_implication && (
                      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <h6 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Business Implication</h6>
                        <p className="text-sm text-gray-800">{f.business_implication}</p>
                      </div>
                    )}
                    {f.action_recommendation && (
                      <div className="bg-green-50/50 p-4 rounded-lg border border-green-100">
                        <h6 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Recommended Action</h6>
                        <p className="text-sm text-gray-800">{f.action_recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

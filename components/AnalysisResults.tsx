'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Finding = {
  id: string;
  category: string;
  title: string;
  finding: string;
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

  const groupedFindings = findings.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {} as Record<string, Finding[]>);

  return (
    <div className="mt-8 space-y-8">
      <h3 className="text-2xl font-bold text-gray-900 border-b pb-4">Intelligence Report</h3>
      
      {Object.entries(groupedFindings).map(([category, items]) => (
        <div key={category} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <h4 className="text-lg font-semibold text-gray-800">{category.replace(/_/g, ' ')}</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map(f => (
              <div key={f.id} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-bold text-gray-900">{f.title}</h5>
                  <div className="flex space-x-2">
                    {f.severity && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        f.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                        f.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {f.severity} RISK
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      {f.confidence} CONFIDENCE
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{f.finding}</p>
                
                <div className="space-y-3">
                  {f.quotes && f.quotes.length > 0 ? f.quotes.map((q) => (
                    <div key={q.id} className="bg-blue-50/50 border border-blue-100 rounded-md p-4 text-sm relative mt-2">
                      <div className="absolute -top-3 left-4 bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-bold rounded">
                        PAGE {q.page_number}
                      </div>
                      <p className="text-gray-600 italic mt-2">"{q.quote_text}"</p>
                    </div>
                  )) : (
                    <div className="text-sm text-gray-500 italic">No quotes available.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

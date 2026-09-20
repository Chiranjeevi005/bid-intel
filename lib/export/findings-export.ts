import { FindingItem } from '@/components/workspace/FindingsLedger';

export function exportFindingsToJSON(findings: FindingItem[], filename: string) {
  const exportData = {
    exported_at: new Date().toISOString(),
    total_findings: findings.length,
    findings: findings.map((f) => ({
      id: f.id,
      category: f.category,
      title: f.title,
      finding: f.finding,
      severity: f.severity || 'MEDIUM',
      confidence: f.confidence || 'HIGH',
      business_implication: f.business_implication || null,
      action_recommendation: f.action_recommendation || null,
      quotes: f.quotes?.map((q) => ({
        page_number: q.page_number,
        quote_text: q.quote_text,
      })) || [],
    })),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\.[^/.]+$/, '')}_findings.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFindingsToCSV(findings: FindingItem[], filename: string) {
  const headers = [
    'Category',
    'Priority',
    'Title',
    'Finding / Fact',
    'Business Implication',
    'Action Recommendation',
    'Pages',
    'Evidence Quotes',
  ];

  const escapeCSV = (val: string | null | undefined): string => {
    if (!val) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = findings.map((f) => {
    const pages = (f.quotes || []).map((q) => q.page_number).join(', ');
    const quotes = (f.quotes || []).map((q) => `[p.${q.page_number}] "${q.quote_text}"`).join(' | ');

    return [
      escapeCSV(f.category),
      escapeCSV(f.severity || 'MEDIUM'),
      escapeCSV(f.title),
      escapeCSV(f.finding),
      escapeCSV(f.business_implication),
      escapeCSV(f.action_recommendation),
      escapeCSV(pages),
      escapeCSV(quotes),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/\.[^/.]+$/, '')}_findings.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

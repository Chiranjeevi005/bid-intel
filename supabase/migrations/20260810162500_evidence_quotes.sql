-- Create the new quotes table
CREATE TABLE analysis_finding_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID NOT NULL REFERENCES analysis_findings(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    quote_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving quotes by finding
CREATE INDEX idx_analysis_finding_quotes_finding_id ON analysis_finding_quotes(finding_id);

-- Enable RLS
ALTER TABLE analysis_finding_quotes ENABLE ROW LEVEL SECURITY;

-- Database Policies for analysis_finding_quotes
CREATE POLICY "Users can view own finding quotes" 
ON analysis_finding_quotes FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM analysis_findings af
        JOIN documents d ON d.id = af.document_id
        WHERE af.id = analysis_finding_quotes.finding_id 
        AND d.user_id = (select auth.uid())
    )
);

CREATE POLICY "Users can insert own finding quotes" 
ON analysis_finding_quotes FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM analysis_findings af
        JOIN documents d ON d.id = af.document_id
        WHERE af.id = finding_id 
        AND d.user_id = (select auth.uid())
    )
);

-- Migrate existing data (if any)
INSERT INTO analysis_finding_quotes (finding_id, page_number, quote_text, created_at)
SELECT id, page_number, evidence, created_at
FROM analysis_findings
WHERE evidence IS NOT NULL AND page_number IS NOT NULL;

-- Remove old columns from analysis_findings
ALTER TABLE analysis_findings 
DROP COLUMN page_number,
DROP COLUMN evidence;

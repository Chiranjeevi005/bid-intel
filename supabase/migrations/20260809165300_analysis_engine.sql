-- Create analysis_runs table
CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    model TEXT NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving runs by document
CREATE INDEX idx_analysis_runs_document_id ON analysis_runs(document_id);

-- Enforce idempotency: Only one active analysis run per document at a time
CREATE UNIQUE INDEX idx_one_active_analysis_per_document 
ON analysis_runs(document_id) 
WHERE status IN ('QUEUED', 'PROCESSING');

-- Create analysis_findings table
CREATE TABLE analysis_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    finding TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    confidence TEXT NOT NULL CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
    page_number INTEGER NOT NULL,
    evidence TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving findings by run or document
CREATE INDEX idx_analysis_findings_run_id ON analysis_findings(analysis_run_id);
CREATE INDEX idx_analysis_findings_document_id ON analysis_findings(document_id);

-- Enable RLS
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_findings ENABLE ROW LEVEL SECURITY;

-- Database Policies for analysis_runs
CREATE POLICY "Users can view own analysis runs" 
ON analysis_runs FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = analysis_runs.document_id 
        AND documents.user_id = (select auth.uid())
    )
);

CREATE POLICY "Users can insert own analysis runs" 
ON analysis_runs FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = document_id 
        AND documents.user_id = (select auth.uid())
    )
);

CREATE POLICY "Users can update own analysis runs" 
ON analysis_runs FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = analysis_runs.document_id 
        AND documents.user_id = (select auth.uid())
    )
);

-- Database Policies for analysis_findings
CREATE POLICY "Users can view own analysis findings" 
ON analysis_findings FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = analysis_findings.document_id 
        AND documents.user_id = (select auth.uid())
    )
);

CREATE POLICY "Users can insert own analysis findings" 
ON analysis_findings FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = document_id 
        AND documents.user_id = (select auth.uid())
    )
);

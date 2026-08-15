ALTER TABLE analysis_findings
ADD COLUMN IF NOT EXISTS business_implication TEXT,
ADD COLUMN IF NOT EXISTS action_recommendation TEXT;

-- Drop the old constraint and add the new one for severity/priority
ALTER TABLE analysis_findings
DROP CONSTRAINT IF EXISTS analysis_findings_severity_check;

ALTER TABLE analysis_findings
ADD CONSTRAINT analysis_findings_severity_check 
CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

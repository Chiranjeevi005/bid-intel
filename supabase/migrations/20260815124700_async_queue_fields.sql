-- Add background queue metadata fields to analysis_runs table
ALTER TABLE analysis_runs 
ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3,
ADD COLUMN last_error TEXT,
ADD COLUMN failed_at TIMESTAMPTZ;

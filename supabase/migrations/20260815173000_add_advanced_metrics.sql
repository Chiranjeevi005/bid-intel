ALTER TABLE analysis_metrics
ADD COLUMN IF NOT EXISTS reasoning_tokens INTEGER,
ADD COLUMN IF NOT EXISTS cached_tokens INTEGER,
ADD COLUMN IF NOT EXISTS estimated_cost_cents NUMERIC(10, 4);

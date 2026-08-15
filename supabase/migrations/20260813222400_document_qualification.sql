-- Add qualification fields to documents table
ALTER TABLE documents 
ADD COLUMN document_type TEXT,
ADD COLUMN qualification_status TEXT DEFAULT 'PENDING' CHECK (qualification_status IN ('PENDING', 'AI_QUALIFIED', 'AI_REJECTED', 'AI_AMBIGUOUS', 'USER_CONFIRMED')),
ADD COLUMN qualification_confidence TEXT CHECK (qualification_confidence IN ('LOW', 'MEDIUM', 'HIGH')),
ADD COLUMN qualification_reason TEXT;

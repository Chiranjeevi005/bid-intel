-- Update the status check constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check CHECK (status IN ('UPLOADED', 'PROCESSING', 'TEXT_EXTRACTED', 'OCR_REQUIRED', 'FAILED'));

-- Allow users to update their own documents (needed for status changes)
CREATE POLICY "Users can update own documents" 
ON documents FOR UPDATE 
TO authenticated
USING ((select auth.uid()) = user_id);

-- Create document_pages table
CREATE TABLE document_pages (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, page_number)
);

-- Index for retrieving pages by document
CREATE INDEX idx_document_pages_document_id ON document_pages(document_id);

-- Enable RLS
ALTER TABLE document_pages ENABLE ROW LEVEL SECURITY;

-- Database Policies for document_pages
CREATE POLICY "Users can view own document pages" 
ON document_pages FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = document_pages.document_id 
        AND documents.user_id = (select auth.uid())
    )
);

CREATE POLICY "Users can insert own document pages" 
ON document_pages FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = document_pages.document_id 
        AND documents.user_id = (select auth.uid())
    )
);

CREATE POLICY "Users can update own document pages" 
ON document_pages FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents 
        WHERE documents.id = document_pages.document_id 
        AND documents.user_id = (select auth.uid())
    )
);

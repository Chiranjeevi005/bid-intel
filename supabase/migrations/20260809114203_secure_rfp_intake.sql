-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'PROCESSING', 'READY', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for retrieving a user's documents efficiently
CREATE INDEX idx_documents_user_id ON documents(user_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Database Policies
CREATE POLICY "Users can view own documents" 
ON documents FOR SELECT 
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own documents" 
ON documents FOR INSERT 
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

-- Create Storage Bucket for RFPs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rfps',
  'rfps',
  false, -- MUST be private
  10485760, -- 10 MB limit as MVP application requirement
  ARRAY['application/pdf'] -- Restrict to PDF MIME type
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- Storage Policies
CREATE POLICY "Users can upload to own folder" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
    bucket_id = 'rfps' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own folder" 
ON storage.objects FOR SELECT 
TO authenticated
USING (
    bucket_id = 'rfps' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'rfps' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
);

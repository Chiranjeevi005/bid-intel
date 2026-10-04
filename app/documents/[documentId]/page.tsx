import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnalysisWorkspace from '@/components/workspace/AnalysisWorkspace';
import { getDocumentAnalysisPayload } from '@/lib/server/document-analysis';

interface DocumentPageProps {
  params: Promise<{ documentId: string }>;
}

export default async function DocumentWorkspacePage({ params }: DocumentPageProps) {
  const { documentId } = await params;

  if (!documentId) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch document analysis data and user's documents list server-side
  const [analysisResult, docsResult] = await Promise.all([
    getDocumentAnalysisPayload(documentId, user.id, supabase),
    supabase
      .from('documents')
      .select('id, original_filename, size_bytes, status, qualification_status, document_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  if (analysisResult.error || !analysisResult.data) {
    // Return standard 404 anti-enumeration response
    notFound();
  }

  return (
    <AnalysisWorkspace
      key={documentId}
      userId={user.id}
      initialDocumentId={documentId}
      initialDocData={analysisResult.data}
      initialDocumentsList={docsResult.data || []}
    />
  );
}

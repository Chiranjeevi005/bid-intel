import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnalysisWorkspace from '@/components/workspace/AnalysisWorkspace';

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

  // Authoritative server-side ownership verification
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !doc) {
    // Return standard 404 anti-enumeration response
    notFound();
  }

  return (
    <AnalysisWorkspace
      userId={user.id}
      initialDocumentId={documentId}
    />
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DocumentLibrary from '@/components/dashboard/DocumentLibrary';
import { getUserDocumentsPayload } from '@/lib/server/documents';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { documents } = await getUserDocumentsPayload(user.id, supabase);

  return (
    <DocumentLibrary userId={user.id} userEmail={user.email} initialDocuments={documents || []} />
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DocumentLibrary from '@/components/dashboard/DocumentLibrary';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  return (
    <DocumentLibrary userId={user.id} userEmail={user.email} />
  );
}

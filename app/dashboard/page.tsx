import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AnalysisWorkspace from '@/components/workspace/AnalysisWorkspace';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  return (
    <AnalysisWorkspace userId={user.id} />
  );
}

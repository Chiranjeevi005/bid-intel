import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';
import UploadWorkspace from '@/components/UploadWorkspace';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Optionally log the successful landing as login_completed if they just arrived
  // We don't have a perfect way to know they JUST logged in without session state flags,
  // but we can track pageview in analytics layer instead. 
  // For the prompt requirement, we'll log it client-side inside the callback or here via client component.
  // Actually, we'll track login_completed in the client component on this page.

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Pre-Bid Intelligence</h1>
        <LogoutButton />
      </header>

      <main className="grow p-6 max-w-4xl mx-auto w-full">
        <div className="mt-8">
          <UploadWorkspace userId={user.id} />
        </div>
      </main>
    </div>
  );
}

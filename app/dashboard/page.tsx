import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from './LogoutButton';

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
      
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mt-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dashboard</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            You are securely authenticated. This is the future home of the RFP Upload Intake workflow.
          </p>
          <div className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 cursor-not-allowed">
            Upload Workflow Coming in BUILD-004
          </div>
        </div>
      </main>
    </div>
  );
}

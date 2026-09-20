import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function NotFoundState() {
  let isAuthenticated = false;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isAuthenticated = !!user;
  } catch {
    isAuthenticated = false;
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-md border border-gray-100">
        <h2 className="mb-2 text-3xl font-bold text-gray-900">404</h2>
        <p className="mb-6 text-base text-gray-500">
          The page you are looking for does not exist.
        </p>
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Return to Document Library
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Return Home
          </Link>
        )}
      </div>
    </div>
  );
}


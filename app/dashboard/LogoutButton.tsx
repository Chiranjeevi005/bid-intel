'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { event } from '@/lib/analytics';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const trackedLogin = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Fire login_completed exactly once when the dashboard mounts
    if (!trackedLogin.current) {
      event({ action: 'login_completed', category: 'auth' });
      trackedLogin.current = true;
    }
  }, []);

  const handleLogout = async () => {
    if (isSigningOut) return;
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSigningOut}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      title="Sign Out"
    >
      {isSigningOut ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}

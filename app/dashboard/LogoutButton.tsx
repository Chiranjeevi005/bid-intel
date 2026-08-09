'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { event } from '@/lib/analytics';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const trackedLogin = useRef(false);

  useEffect(() => {
    // Fire login_completed exactly once when the dashboard mounts
    if (!trackedLogin.current) {
      event({ action: 'login_completed', category: 'auth' });
      trackedLogin.current = true;
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      Sign Out
    </button>
  );
}

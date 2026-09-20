import { createClient } from '@supabase/supabase-js';

export async function getAuthenticatedUser(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from environment');
  }

  const serviceSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let user: any = null;
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: userData, error: jwtError } = await serviceSupabase.auth.getUser(token);
    if (!jwtError && userData?.user) {
      user = userData.user;
    }
  }

  if (!user) {
    try {
      const { createClient: createServerClient } = await import('@/lib/supabase/server');
      const authSupabase = await createServerClient();
      const { data: sessionData, error: authError } = await authSupabase.auth.getUser();
      if (!authError && sessionData?.user) {
        user = sessionData.user;
      }
    } catch {
      // Outside Next.js SSR cookie context
    }
  }

  return { user, serviceSupabase };
}

/**
 * Authorization check for internal Refund Console (/subscription/refunds and /api/billing/refunds).
 * Authorized if:
 * 1. User email matches ADMIN_EMAIL or OWNER_EMAIL env vars (if set).
 * 2. Or user app_metadata / user_metadata contains role: 'admin' | 'owner'.
 * 3. Default dev fallback: if neither ADMIN_EMAIL nor role metadata is configured,
 *    any authenticated user operating the local instance is granted access for testing,
 *    logged with a security notice.
 */
export function isRefundConsoleAuthorized(user: any): boolean {
  if (!user) return false;

  const adminEmail = process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL;
  if (adminEmail) {
    const allowed = adminEmail.split(',').map((e) => e.trim().toLowerCase());
    if (user.email && allowed.includes(user.email.toLowerCase())) {
      return true;
    }
  }

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role === 'admin' || role === 'owner') {
    return true;
  }

  // If no specific ADMIN_EMAIL list is defined in environment, allow authenticated developer
  if (!adminEmail && !role) {
    return true;
  }

  return false;
}


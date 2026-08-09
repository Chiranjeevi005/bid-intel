import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const url = new URL(request.url);
      url.pathname = next;
      url.search = '';

      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      if (forwardedHost) {
        url.host = forwardedHost;
      }

      // Force HTTP for localhost to prevent ERR_SSL_PROTOCOL_ERROR
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.protocol = 'http:';
      } else if (forwardedHost) {
        url.protocol = 'https:';
      }

      return NextResponse.redirect(url);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}

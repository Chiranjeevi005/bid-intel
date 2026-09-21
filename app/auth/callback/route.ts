import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  // Safe internal path validation: must start with / and not // or /\, no backslashes, and no external scheme/origin
  let next = '/dashboard';
  if (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\') && !rawNext.includes('\\') && !rawNext.includes(':')) {
    next = rawNext;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const url = new URL(request.url);
      const [nextPath, nextSearch] = next.split('?');
      url.pathname = nextPath;
      url.search = nextSearch ? `?${nextSearch}` : '';

      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      if (forwardedHost) {
        url.host = forwardedHost;
      }

      // If NEXT_PUBLIC_APP_URL is explicitly configured, redirect to the canonical domain
      const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (canonicalAppUrl && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        const canonicalUrl = new URL(next, canonicalAppUrl);
        return NextResponse.redirect(canonicalUrl);
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

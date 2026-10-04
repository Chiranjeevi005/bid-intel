import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCanonicalOrigin } from '@/lib/auth/origin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  // Safe internal path validation: must start with / and not // or /\, no backslashes, and no external scheme/origin
  let next = '/dashboard';
  if (
    rawNext &&
    rawNext !== '/' &&
    rawNext !== '/login' &&
    !rawNext.startsWith('/login?') &&
    !rawNext.startsWith('/auth') &&
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//') &&
    !rawNext.startsWith('/\\') &&
    !rawNext.includes('\\') &&
    !rawNext.includes(':')
  ) {
    next = rawNext;
  }

  const canonicalOrigin = getCanonicalOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const canonicalUrl = new URL(next, canonicalOrigin);

      // Force HTTP for localhost to prevent ERR_SSL_PROTOCOL_ERROR
      if (canonicalUrl.hostname === 'localhost' || canonicalUrl.hostname === '127.0.0.1') {
        canonicalUrl.protocol = 'http:';
      }

      return NextResponse.redirect(canonicalUrl);
    }
  }

  // return the user to an error page with instructions on canonical origin
  return NextResponse.redirect(`${canonicalOrigin}/login?error=auth-callback-failed`);
}

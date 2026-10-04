import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-browser cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect authenticated routes
  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/documents');

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    const nextTarget = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = '/login';
    url.searchParams.set('next', nextTarget);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from the login page
  if (user && request.nextUrl.pathname === '/login') {
    const nextParam = request.nextUrl.searchParams.get('next');
    let target = '/dashboard';
    if (
      nextParam &&
      nextParam !== '/' &&
      nextParam !== '/login' &&
      !nextParam.startsWith('/login?') &&
      !nextParam.startsWith('/auth') &&
      nextParam.startsWith('/') &&
      !nextParam.startsWith('//') &&
      !nextParam.startsWith('/\\') &&
      !nextParam.includes('\\') &&
      !nextParam.includes(':')
    ) {
      target = nextParam;
    }
    const url = new URL(target, request.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  // If Supabase OAuth redirects to root / with an authorization code, route it into auth callback
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const code = request.nextUrl.searchParams.get('code')!;
    const rawNext = request.nextUrl.searchParams.get('next');
    let target = '/dashboard';
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
      target = rawNext;
    }
    const url = new URL('/auth/callback', request.nextUrl.origin);
    url.searchParams.set('code', code);
    url.searchParams.set('next', target);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

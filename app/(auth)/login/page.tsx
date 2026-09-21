'use client';

import { useState, Suspense } from 'react';
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { event } from '@/lib/analytics';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const nextParam = searchParams.get('next');

  // Validate internal path for next to prevent open redirect
  let safeNext = '/dashboard';
  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\') && !nextParam.includes('\\') && !nextParam.includes(':')) {
    safeNext = nextParam;
  }

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic frontend validation for Taste-Skill state completeness
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    
    setLoading(true);
    setStatus(null);

    event({ action: 'login_started', category: 'auth', label: 'magic_link' });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const emailRedirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        setStatus({ type: 'error', text: 'Authentication failed. Please check your email and try again.' });
      } else {
        setStatus({ type: 'success', text: 'Check your email for the login link.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'A network error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setStatus(null);

    event({ action: 'login_started', category: 'auth', label: 'google' });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setStatus({ type: 'error', text: 'Google authentication failed. Please try again.' });
        setLoading(false);
      }
    } catch {
      setStatus({ type: 'error', text: 'A network error occurred. Please try again.' });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background font-sans text-foreground selection:bg-[#3157D5]/15 selection:text-[#3157D5]">
      
      {/* Top Application Bar */}
      <header className="w-full h-14 border-b border-[#D9DEE5] px-6 flex items-center justify-between shrink-0 bg-[#F5F6F4]">
        <div className="text-[14px] tracking-tight">
          <span className="font-semibold">RFP</span>ground
        </div>
        <nav className="flex items-center gap-6 text-[13px] text-[#667085] font-medium">
          <Link href="#" className="hover:text-[#111827] transition-colors duration-150">Support</Link>
          <Link href="#" className="hover:text-[#111827] transition-colors duration-150">Legal</Link>
        </nav>
      </header>

      {/* Main Operational Canvas */}
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-[#D9DEE5]">
        
        {/* Left Side: Document Evidence Object (Canvas) */}
        <div className="flex flex-col pt-16 pb-12 px-8 md:px-16 lg:px-24 justify-center max-w-240 mx-auto w-full">
          <div className="mb-10">
            <h1 className="text-[20px] md:text-[24px] font-semibold text-[#111827] leading-[1.1] mb-2 tracking-tight">
              Ministry of Transport
            </h1>
            <div className="text-[15px] md:text-[16px] text-[#111827] font-medium mb-3">
              Infrastructure RFP
            </div>
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#667085]">
              <span>49 PAGES</span>
              <span>·</span>
              <span>UNDER REVIEW</span>
              <span>·</span>
              <span>SUBMISSION: 18 SEP 2026</span>
            </div>
          </div>

          <div className="border-t border-b border-[#D9DEE5] py-10 my-4 space-y-6">
            <div className="mb-6">
              <div className="text-[11px] font-medium text-[#667085] uppercase tracking-wider mb-1">SECTION 6.2</div>
              <div className="text-[15px] font-semibold text-[#111827] tracking-tight">LIABILITY & INDEMNIFICATION</div>
            </div>

            <div className="pl-5 border-l-[3px] border-[#D9DEE5] text-[16px] leading-[1.6] text-[#111827] font-serif">
              &quot;The Supplier shall indemnify, defend and hold harmless the Authority from and against any and all claims, losses, damages, liabilities, costs and expenses arising out of or related to this Agreement...&quot;
            </div>

            <div className="text-[12px] font-medium text-[#667085]">
              Page 14 · Source document
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#B42318]"></span>
              <span className="text-[11px] font-semibold text-[#B42318] uppercase tracking-wider">REVIEW REQUIRED</span>
            </div>
            <div className="text-[14px] font-medium text-[#B42318] bg-[#FEF3F2] inline-flex px-2 py-1 rounded-[3px]">
              Uncapped liability exposure
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Utility Rail */}
        <div className="bg-[#F5F6F4] flex flex-col pt-16 px-8 md:px-12 w-full max-w-105 mx-auto lg:max-w-none">
          <div className="mb-10">
            <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Welcome back.</h2>
            <p className="text-[14px] text-[#667085]">Enter your workspace.</p>
          </div>

          {errorParam === 'auth-callback-failed' && (
            <div
              className="mb-6 text-[13px] font-medium p-3 rounded-sm border flex items-start gap-2.5 bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0 mt-0.5" strokeWidth={2} />
              <div className="leading-snug">
                Your login link has expired or has already been used. Please enter your email to request a fresh link.
              </div>
            </div>
          )}

          {status && (
            <div
              className={`mb-6 text-[13px] font-medium p-3 rounded-sm border flex items-center gap-2 ${
                status.type === 'success'
                  ? 'bg-[#ECFDF3] border-[#027A48]/20 text-[#027A48]'
                  : 'bg-[#FEF3F2] border-[#B42318]/20 text-[#B42318]'
              }`}
              role="alert"
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#027A48] shrink-0" strokeWidth={2} />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#B42318] shrink-0" strokeWidth={2} />
              )}
              <span>{status.text}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleMagicLink} noValidate>
            <div className="group">
              <label htmlFor="email" className="block text-[12px] font-medium text-[#111827] mb-2">
                Email
              </label>
              <div className={`relative flex items-center transition-all duration-150 ${isFocused ? 'ring-2 ring-[#3157D5] ring-offset-1 ring-offset-[#F5F6F4]' : ''}`}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="block w-full rounded-sm border border-[#D9DEE5] bg-[#FFFFFF] px-3.5 py-2.5 text-[14px] text-[#111827] placeholder-[#667085] shadow-2xs focus:outline-none"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status?.type === 'error') setStatus(null);
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center rounded-sm bg-[#3157D5] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#2845a9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] focus-visible:ring-offset-2 disabled:opacity-60 transition-all duration-150 active:scale-[0.98] active:translate-y-px"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" strokeWidth={2.5} />
                  Sending...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          <div className="mt-8 mb-8 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-[#D9DEE5]"></div>
            </div>
            <div className="relative flex justify-center text-[12px] font-medium text-[#667085]">
              <span className="bg-[#F5F6F4] px-4">or</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center rounded-sm border border-[#D9DEE5] bg-[#FFFFFF] px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-2 disabled:opacity-60 transition-all duration-150 active:scale-[0.98] active:translate-y-px"
          >
            <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Google
          </button>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-[#F5F6F4]">
        <Loader2 className="w-8 h-8 text-[#3157D5] animate-spin" strokeWidth={2} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}


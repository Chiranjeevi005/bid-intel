'use client';

import { useState, Suspense } from 'react';
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { event } from '@/lib/analytics';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className="min-h-dvh flex flex-col bg-[#F5F6F4] font-sans text-foreground selection:bg-[#3157D5]/15 selection:text-[#3157D5]">
      
      {/* Top Navigation Bar: Exact height (h-18), background, logo asset and container width as homepage navbar */}
      <header className="w-full h-18 border-b border-[#D9DEE5] bg-background px-6 lg:px-12 sticky top-0 z-50 flex items-center justify-center shrink-0">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo matching homepage */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center">
              <Image 
                src="/brand-assets/navbar-logo.png" 
                alt="RFPground" 
                width={200} 
                height={48} 
                className="h-10 md:h-11 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Nav links: Legal, Privacy, Support */}
          <nav className="flex items-center gap-6 sm:gap-8 text-[13px] font-medium text-[#667085]">
            <Link href="#" className="hover:text-foreground transition-colors duration-150">
              Legal
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors duration-150">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors duration-150">
              Support
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Operational Canvas */}
      <main className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-8 lg:gap-16 px-6 lg:px-12 py-10 lg:py-16 items-start">
        
        {/* Left Side: Document Evidence Preview */}
        <div className="flex flex-col justify-center w-full">
          <div className="bg-white rounded-lg border border-[#D9DEE5] p-7 md:p-9 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b border-[#EEF2F6]">
              <div>
                <span className="text-[11px] font-bold text-[#3157D5] uppercase tracking-wider bg-[#3157D5]/10 px-2.5 py-1 rounded-sm">
                  SPECIMEN DOSSIER
                </span>
                <h1 className="text-[20px] md:text-[22px] font-semibold text-[#111827] mt-3 mb-1 tracking-tight">
                  Ministry of Transport
                </h1>
                <div className="text-[14px] text-[#475467] font-medium">
                  Infrastructure & Transit Concession RFP
                </div>
              </div>
              <div className="text-right text-[12px] font-medium text-[#667085] flex flex-col items-start sm:items-end">
                <span>49 PAGES · 142 CLAUSES</span>
                <span className="text-[#027A48] font-semibold mt-0.5">PARSED & INDEXED</span>
              </div>
            </div>

            <div className="space-y-4 my-6">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                  SECTION 6.2 — LIABILITY & INDEMNIFICATION
                </div>
                <span className="text-[11px] text-[#98A2B3] font-mono">PAGE 14</span>
              </div>

              <div className="pl-4 border-l-2 border-[#3157D5] text-[15px] leading-relaxed text-[#1F2A37] font-serif bg-[#F8F9FB] p-4 rounded-r-md">
                &quot;The Supplier shall indemnify, defend and hold harmless the Authority from and against any and all claims, losses, damages, liabilities, costs and expenses arising out of or related to this Agreement without limitation...&quot;
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#EEF2F6] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#B42318] animate-pulse"></span>
                <span className="text-[12px] font-semibold text-[#B42318] uppercase tracking-wider">
                  Critical Trap Detected
                </span>
              </div>
              <div className="text-[13px] font-medium text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] px-3 py-1 rounded-sm">
                Uncapped liability exposure (No stop-loss ceiling)
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="w-full flex justify-center">
          <div className="w-full bg-white rounded-lg border border-[#D9DEE5] p-7 md:p-8 shadow-xs">
            <div className="mb-7">
              <h2 className="text-[19px] font-semibold text-[#111827] tracking-tight mb-1.5">
                Sign in to RFPground
              </h2>
              <p className="text-[13px] text-[#667085] leading-relaxed">
                Access your pre-bid intelligence workspace.
              </p>
            </div>

            {errorParam === 'auth-callback-failed' && (
              <div
                className="mb-5 text-[13px] font-medium p-3 rounded-md border flex items-start gap-2.5 bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]"
                role="alert"
              >
                <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0 mt-0.5" strokeWidth={2} />
                <div className="leading-snug">
                  Your login link has expired or has already been used. Please request a fresh link below.
                </div>
              </div>
            )}

            {status && (
              <div
                className={`mb-5 text-[13px] font-medium p-3 rounded-md border flex items-center gap-2 ${
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

            <form className="space-y-4" onSubmit={handleMagicLink} noValidate>
              <div>
                <label htmlFor="email" className="block text-[12px] font-semibold text-[#344054] mb-1.5">
                  Work Email
                </label>
                <div className={`relative flex items-center rounded-md transition-all duration-150 ${isFocused ? 'ring-2 ring-[#3157D5] ring-offset-1' : ''}`}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="block w-full rounded-md border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-[14px] text-[#111827] placeholder-[#98A2B3] focus:outline-none transition-colors"
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
                className="w-full flex justify-center items-center rounded-md bg-[#3157D5] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#2845a9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] focus-visible:ring-offset-2 disabled:opacity-60 transition-all duration-150 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" strokeWidth={2.5} />
                    Sending magic link...
                  </span>
                ) : (
                  'Continue with Email'
                )}
              </button>
            </form>

            <div className="my-6 relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#E4E7EC]"></div>
              </div>
              <div className="relative flex justify-center text-[12px] font-medium text-[#98A2B3]">
                <span className="bg-white px-3">or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center rounded-md border border-[#D0D5DD] bg-white px-4 py-2.5 text-[14px] font-medium text-[#344054] hover:bg-[#F9FAFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] focus-visible:ring-offset-2 disabled:opacity-60 transition-all duration-150 active:scale-[0.98]"
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
            
            <p className="mt-6 text-center text-[12px] text-[#667085] leading-normal">
              By continuing, you agree to our{' '}
              <Link href="#" className="underline hover:text-[#111827]">Terms</Link> and{' '}
              <Link href="#" className="underline hover:text-[#111827]">Privacy Policy</Link>.
            </p>
          </div>
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


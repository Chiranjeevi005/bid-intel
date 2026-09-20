'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ArrowRight, Lock, X, RefreshCw, Clock, ShieldCheck } from 'lucide-react';
import { BillingStatus } from '@/lib/billing/config';

interface SubscriptionViewProps {
  initialUser: any | null;
}

export default function SubscriptionView({ initialUser }: SubscriptionViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(initialUser);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<'PRO_INDIA' | 'PRO_GLOBAL' | null>(null);
  const [confirmingPlan, setConfirmingPlan] = useState<'PRO_INDIA' | 'PRO_GLOBAL' | null>(null);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pollingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = React.useRef<number>(0);

  // Clear polling timers on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/billing/status');
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch billing status:', err);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Bounded status synchronization (every 3s, max 10 attempts / 30s)
  const startStatusPolling = (plan: 'PRO_INDIA' | 'PRO_GLOBAL') => {
    stopPolling();
    attemptsRef.current = 0;
    setConfirmingPlan(plan);
    setIsTimedOut(false);
    setError(null);
    setSuccess(null);

    const checkServerStatus = async () => {
      attemptsRef.current += 1;
      try {
        const data = await fetchStatus();
        if (data && data.status === 'ACTIVE') {
          stopPolling();
          setConfirmingPlan(null);
          setSuccess(`Your ${plan === 'PRO_INDIA' ? 'Plus' : 'Pro'} plan is now active! 15 analyses are available.`);
          return;
        }
        if (data && (data.status === 'HALTED' || data.status === 'CANCELLED' || data.status === 'EXPIRED')) {
          stopPolling();
          setConfirmingPlan(null);
          setError('Payment verification could not be completed. Your account remains unchanged.');
          return;
        }
      } catch (err) {
        console.warn('[Billing Poll Error]', err);
      }

      if (attemptsRef.current >= 10) {
        stopPolling();
        setIsTimedOut(true);
      }
    };

    checkServerStatus();
    pollingTimerRef.current = setInterval(checkServerStatus, 3000);
  };

  const handleSubscribe = async (plan: 'PRO_INDIA' | 'PRO_GLOBAL') => {
    if (!user) {
      router.push(`/login?next=/subscription`);
      return;
    }

    if (actionLoading !== null || confirmingPlan !== null) {
      return;
    }

    try {
      setActionLoading(plan);
      setError(null);
      setSuccess(null);
      setIsTimedOut(false);

      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.error === 'ALREADY_SUBSCRIBED') {
          await fetchStatus();
          setSuccess('Your subscription is already active.');
          return;
        }
        throw new Error(data.message || 'Failed to initiate subscription');
      }

      const { subscriptionId, keyId } = data;

      // Load Razorpay Standard Checkout SDK
      const loadScript = () => {
        return new Promise<boolean>((resolve) => {
          if ((window as any).Razorpay) {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const loaded = await loadScript();
      if (!loaded || !(window as any).Razorpay) {
        throw new Error('Unable to load Razorpay payment gateway. Please check your connection.');
      }

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'RFPground',
        description: plan === 'PRO_INDIA' ? 'Plus Plan - ₹499/mo' : 'Pro Plan - ₹999/mo',
        handler: async function (response: any) {
          // 1. Immediately indicate verification in progress
          setConfirmingPlan(plan);
          setIsTimedOut(false);
          setError(null);
          setSuccess(null);

          try {
            // 2. Transmit checkout signature to server for verification
            const verifyRes = await fetch('/api/billing/verify-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response?.razorpay_payment_id,
                razorpay_subscription_id: response?.razorpay_subscription_id || subscriptionId,
                razorpay_signature: response?.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.status === 'ACTIVE') {
              // Authoritative immediate confirmation
              stopPolling();
              await fetchStatus();
              setConfirmingPlan(null);
              setSuccess(`Your ${plan === 'PRO_INDIA' ? 'Plus' : 'Pro'} plan is now active! 15 analyses are available.`);
              return;
            }
          } catch (verifyErr) {
            console.warn('[Checkout Verification Network Error]', verifyErr);
          }

          // 3. Fallback to bounded polling if verification response is pending or delayed
          startStatusPolling(plan);
        },
        theme: {
          color: '#3157D5',
        },
        modal: {
          ondismiss: function () {
            setActionLoading(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(resp.error?.description || 'Subscription setup was not completed. No active paid plan was granted by this attempt. You can try again.');
      });
      rzp.open();
    } catch (err: any) {
      console.error('[Subscribe Error]', err);
      setError(err.message || 'Payment initiation failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const isPro = billing?.plan !== 'FREE' && billing?.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-[#F5F6F4] flex flex-col font-sans text-[#101828]">
      {/* Top Bar Navigation */}
      <header className="w-full h-18 border-b border-[#D9DEE5] bg-white px-6 lg:px-12 sticky top-0 z-50 flex items-center justify-between">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand-assets/navbar-logo.png"
              alt="RFPground"
              width={180}
              height={42}
              className="h-9 md:h-10 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href={user ? "/dashboard" : "/"}
              className="text-[13px] font-medium text-[#667085] hover:text-[#101828] transition-colors"
            >
              {user ? "← Back to Dashboard" : "← Back to Home"}
            </Link>
            {!user && (
              <Link
                href="/login?next=/subscription"
                className="rounded-sm bg-[#3157D5] px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#2845a9] transition-all"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-blue-50 text-[#3157D5] border border-blue-200 mb-4">
            <span>PLANS & PRICING</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#101828]">
            Tender Qualification & Contract Exposure
          </h1>
          <p className="mt-3 text-[15px] text-[#667085] leading-relaxed">
            Choose the plan that matches your bidding strategy. Qualify tenders rapidly with Plus, or inspect deep contractual risk and exposure with Pro.
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-[13px] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-4 cursor-pointer p-0.5 rounded transition-colors" title="Dismiss">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-800 ml-4 cursor-pointer p-0.5 rounded transition-colors" title="Dismiss">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Confirmation In-Progress Banner */}
        {confirmingPlan && !isTimedOut && (
          <div className="mb-8 p-5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-900 flex items-start gap-3.5">
            <Loader2 className="w-5 h-5 text-[#3157D5] animate-spin shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-[14px] font-bold text-blue-900">
                Payment setup received. We&apos;re confirming your subscription...
              </h4>
              <p className="text-[13px] text-blue-700 mt-1 leading-relaxed">
                Your payment setup has been received. We&apos;re waiting for authoritative confirmation of your subscription with the payment network. You don&apos;t need to pay again.
              </p>
            </div>
          </div>
        )}

        {/* Confirmation Timeout Banner */}
        {isTimedOut && (
          <div className="mb-8 p-5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-[14px] font-bold text-amber-900">
                Payment setup received
              </h4>
              <p className="text-[13px] text-amber-800 mt-1 leading-relaxed">
                We&apos;re still confirming your subscription with the payment network. You don&apos;t need to pay again. Your subscription will update automatically once confirmation is received.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsTimedOut(false);
                    startStatusPolling(confirmingPlan || 'PRO_INDIA');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-amber-600 text-white text-[12.5px] font-medium hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check again
                </button>
                <button
                  onClick={() => fetchStatus()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white border border-amber-300 text-amber-900 text-[12.5px] font-medium hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  View billing status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Plan Banner */}
        {isPro && (
          <div className="mb-10 p-5 rounded-lg border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded">
                  Current Subscription
                </span>
                <h2 className="text-[16px] font-bold text-[#101828]">
                  {billing?.plan === 'PRO_INDIA' ? 'Plus Plan' : 'Pro Plan'}
                </h2>
              </div>
              <p className="text-[13px] text-[#475467] mt-1">
                You have used <strong>{billing?.consumed} of {billing?.limit}</strong> analyses for the current billing cycle.
                {billing?.currentPeriodEnd && (
                  <span> Cycle renews on {new Date(billing.currentPeriodEnd).toLocaleDateString()}.</span>
                )}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-blue-200 text-[12.5px] font-semibold text-blue-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* FREE */}
          <div className="bg-white rounded-xl border border-[#D9DEE5] p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-[13px] font-bold text-[#667085] uppercase tracking-wider mb-2">
                Free
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-extrabold text-[#101828]">₹0</span>
                <span className="text-[13px] text-[#667085]">lifetime</span>
              </div>
              <p className="text-[13px] text-[#475467] mb-6 leading-relaxed">
                Ideal for trying RFPground on your initial tenders with zero commitment.
              </p>

              <div className="border-t border-[#EAECF0] pt-5 space-y-3">
                <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span><strong>3 lifetime</strong> full tender analyses</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Eligibility & compliance ledger</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Financial & legal risk matrix</span>
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Export to JSON & CSV</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Link
                href={user ? "/dashboard" : "/login"}
                className={`w-full block text-center rounded-sm py-2.5 text-[13px] font-semibold transition-all ${
                  !isPro
                    ? 'bg-[#F2F4F7] text-[#344054] cursor-default'
                    : 'bg-white border border-[#D0D5DD] text-[#344054] hover:bg-gray-50'
                }`}
              >
                {!isPro ? 'Current Plan' : 'Free Included'}
              </Link>
            </div>
          </div>

          {/* PLUS */}
          <div className="bg-white rounded-xl border-2 border-[#3157D5] p-6 flex flex-col justify-between shadow-md relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3157D5] text-white text-[11px] font-bold uppercase tracking-wider py-0.5 px-3 rounded-full whitespace-nowrap">
              RECOMMENDED • TENDER QUALIFICATION
            </div>

            <div>
              <div className="text-[13px] font-bold text-[#3157D5] uppercase tracking-wider mb-1">
                PLUS
              </div>
              <h3 className="text-[16px] font-bold text-[#101828] mb-1">
                Tender Qualification
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-extrabold text-[#101828]">₹499</span>
                <span className="text-[13px] text-[#667085]">/month</span>
              </div>
              <p className="text-[12.5px] font-semibold text-[#3157D5] italic mb-2">
                &ldquo;Should we bid?&rdquo;
              </p>
              <p className="text-[13px] text-[#475467] mb-5 leading-relaxed">
                For teams that need to qualify tenders quickly.
              </p>

              <div className="border-t border-[#EAECF0] pt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span><strong>15 tender analyses</strong> per billing cycle</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span>Eligibility & compliance ledger</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span>Submission requirements & deadlines</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span>Evaluation criteria & thresholds</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span>Financial & security requirements</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span>Standard risk analysis & evidence inspection</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-[#3157D5] shrink-0" strokeWidth={2.5} />
                  <span>Structured extraction & exports</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                onClick={() => handleSubscribe('PRO_INDIA')}
                disabled={actionLoading !== null || confirmingPlan !== null || (isPro && billing?.plan === 'PRO_INDIA')}
                className={`w-full rounded-sm py-2.5 text-[13px] font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                  isPro && billing?.plan === 'PRO_INDIA'
                    ? 'bg-[#F2F4F7] text-[#667085] cursor-default'
                    : confirmingPlan !== null || actionLoading !== null
                    ? 'bg-[#3157D5]/60 text-white cursor-not-allowed'
                    : 'bg-[#3157D5] text-white hover:bg-[#2845a9] active:scale-[0.99] cursor-pointer'
                }`}
              >
                {actionLoading === 'PRO_INDIA' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" strokeWidth={2.5} />
                    Opening Checkout...
                  </>
                ) : confirmingPlan === 'PRO_INDIA' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" strokeWidth={2.5} />
                    Confirming...
                  </>
                ) : isPro && billing?.plan === 'PRO_INDIA' ? (
                  'Active Plan'
                ) : (
                  <>
                    Upgrade to Plus
                    <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={2} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PRO */}
          <div className="bg-white rounded-xl border border-[#D9DEE5] p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="text-[13px] font-bold text-[#667085] uppercase tracking-wider mb-1">
                PRO
              </div>
              <h3 className="text-[16px] font-bold text-[#101828] mb-1">
                Tender + Contract Exposure
              </h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-extrabold text-[#101828]">₹999</span>
                <span className="text-[13px] text-[#667085]">/month</span>
              </div>
              <p className="text-[12.5px] font-semibold text-[#101828] italic mb-2">
                &ldquo;What are we taking on if we bid?&rdquo;
              </p>
              <p className="text-[13px] text-[#475467] mb-5 leading-relaxed">
                For teams handling complex tenders with deeper contractual exposure.
              </p>

              <div className="border-t border-[#EAECF0] pt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span><strong>15 tender analyses</strong> per billing cycle</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span><strong>Everything in Plus</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Contract obligation analysis</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Liability & indemnity exposure</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Termination & suspension review</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Penalty & liquidated damages analysis</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Insurance & security obligations</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] text-[#344054]">
                  <Check className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                  <span>Inspect contractual exposure & evidence</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                onClick={() => handleSubscribe('PRO_GLOBAL')}
                disabled={actionLoading !== null || confirmingPlan !== null || (isPro && billing?.plan === 'PRO_GLOBAL')}
                className={`w-full rounded-sm py-2.5 text-[13px] font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                  isPro && billing?.plan === 'PRO_GLOBAL'
                    ? 'bg-[#F2F4F7] text-[#667085] cursor-default'
                    : confirmingPlan !== null || actionLoading !== null
                    ? 'bg-blue-50 text-[#3157D5]/60 border-[#3157D5]/40 cursor-not-allowed'
                    : 'bg-white text-[#3157D5] border-[#3157D5] hover:bg-blue-50 cursor-pointer'
                }`}
              >
                {actionLoading === 'PRO_GLOBAL' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1 text-[#3157D5]" strokeWidth={2.5} />
                    Opening Checkout...
                  </>
                ) : confirmingPlan === 'PRO_GLOBAL' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1 text-[#3157D5]" strokeWidth={2.5} />
                    Confirming...
                  </>
                ) : isPro && billing?.plan === 'PRO_GLOBAL' ? (
                  'Active Plan'
                ) : (
                  <>
                    Upgrade to Pro
                    <ArrowRight className="w-3.5 h-3.5 ml-1" strokeWidth={2} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security & Policy Note */}
        <div className="mt-16 text-center text-[12.5px] text-[#667085]">
          <p className="inline-flex items-center gap-1.5 justify-center flex-wrap">
            <Lock className="w-3.5 h-3.5 text-[#667085] shrink-0" strokeWidth={2} />
            <span>All transactions are securely billed in Indian Rupees (INR) via <strong>Razorpay</strong>. Indian and international credit &amp; debit cards accepted.</span>
          </p>
          <div className="mt-3">
            <Link
              href="/subscription/refunds"
              className="text-[11.5px] text-[#98A2B3] hover:text-[#475467] transition-colors"
            >
              Operations: Refund Console
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

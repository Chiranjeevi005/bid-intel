'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';

interface RefundRecord {
  id: string;
  razorpay_payment_id: string;
  razorpay_refund_id: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  speed_requested: string;
  speed_processed: string | null;
  receipt: string;
  reason: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
  subscription_plan?: string;
}

interface KnownPayment {
  payment_id: string;
  subscription_id: string;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
}

interface RefundConsoleViewProps {
  initialUser: any;
}

export default function RefundConsoleView({ initialUser }: RefundConsoleViewProps) {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [knownPayments, setKnownPayments] = useState<KnownPayment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const [customAmountPaise, setCustomAmountPaise] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('Live payment controlled test refund');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'pending' | 'error';
    text: string;
  } | null>(null);

  // Polling tracker for in-flight pending refunds (bounded polling: max 10 attempts, 3s interval)
  const pollAttemptsRef = React.useRef<number>(0);
  const pollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchRefundData = async (paymentIdFilter?: string) => {
    try {
      const url = paymentIdFilter
        ? `/api/billing/refunds?payment_id=${encodeURIComponent(paymentIdFilter)}`
        : '/api/billing/refunds';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.refunds || []);
        if (data.knownPayments && data.knownPayments.length > 0) {
          setKnownPayments(data.knownPayments);
          if (!selectedPaymentId && data.knownPayments[0]?.payment_id) {
            setSelectedPaymentId(data.knownPayments[0].payment_id);
          }
        }
        return data.refunds as RefundRecord[];
      }
    } catch (err) {
      console.error('Failed to load refund records:', err);
    } finally {
      setIsLoading(false);
    }
    return [];
  };

  useEffect(() => {
    fetchRefundData();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const startBoundedPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollAttemptsRef.current = 0;

    pollTimerRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      const updated = await fetchRefundData();
      const hasPending = updated.some((r) => r.status === 'PENDING');

      if (!hasPending || pollAttemptsRef.current >= 10) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    }, 3000);
  };

  const handleIssueRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter or select a valid Razorpay Payment ID.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload: Record<string, any> = {
        payment_id: selectedPaymentId.trim(),
        reason: customReason || 'Manual test refund via console',
      };

      if (customAmountPaise.trim()) {
        const amountNum = parseInt(customAmountPaise, 10);
        if (!isNaN(amountNum) && amountNum > 0) {
          payload.amount = amountNum;
        }
      }

      const res = await fetch('/api/billing/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to issue refund',
        });
      } else {
        const refundStatus = data.refund?.status || 'PENDING';
        if (refundStatus === 'PROCESSED') {
          setStatusMessage({
            type: 'success',
            text: `Refund PROCESSED successfully! ID: ${data.refund.razorpay_refund_id || data.refund.id}`,
          });
        } else {
          setStatusMessage({
            type: 'pending',
            text: 'Refund requested. Razorpay is still processing the refund.',
          });
          startBoundedPolling();
        }
        await fetchRefundData();
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unexpected network error submitting refund',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header navigation & title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              Internal Operations Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              RFPGround Refund Console
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Controlled Live-Mode Verification & Authoritative Refund Lifecycle Management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRefundData()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/subscription"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to /subscription
            </Link>
          </div>
        </div>

        {/* Operating Notice Banner */}
        <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-300">Operational Security Notice:</span> All refunds are
            executed server-side with Razorpay API using <code className="bg-amber-950/70 px-1.5 py-0.5 rounded text-amber-300">speed: optimum</code>.
            Refunds do NOT automatically modify active subscription lifecycle states. PROCESSED is the final state confirmed by gateway webhooks.
          </div>
        </div>

        {/* Action Panel: Issue Refund Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-400" />
            Issue Authoritative Refund
          </h2>

          <form onSubmit={handleIssueRefund} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Payment ID selector / input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Razorpay Payment ID <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="pay_xxxxxxxxxxxxxx"
                    value={selectedPaymentId}
                    onChange={(e) => setSelectedPaymentId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
                {knownPayments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-[11px] text-slate-400 mr-1">Recent payments:</span>
                    {knownPayments.map((p) => (
                      <button
                        key={p.payment_id}
                        type="button"
                        onClick={() => setSelectedPaymentId(p.payment_id)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors font-mono ${selectedPaymentId === p.payment_id
                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        {p.payment_id.substring(0, 14)}... ({p.subscription_plan})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount input (optional partial refund) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Refund Amount in Subunits (Paise) <span className="text-slate-500">(Leave empty for Full Refund)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 49900 (₹499) or 99900 (₹999)"
                    value={customAmountPaise}
                    onChange={(e) => setCustomAmountPaise(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  {customAmountPaise && !isNaN(parseInt(customAmountPaise, 10)) && (
                    <span className="text-xs text-slate-400 whitespace-nowrap bg-slate-800 px-2.5 py-2.5 rounded-lg border border-slate-700">
                      ₹{(parseInt(customAmountPaise, 10) / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Refund Reason */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Audit Reason / Reference
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Feedback Message */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-lg text-sm border flex items-center gap-2.5 ${statusMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : statusMessage.type === 'pending'
                      ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                      : 'bg-rose-950/40 border-rose-800 text-rose-300'
                  }`}
              >
                {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {statusMessage.type === 'pending' && <Clock className="w-4 h-4 shrink-0 animate-pulse" />}
                {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                Idempotency key will be generated uniquely per request.
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing with Razorpay...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    ISSUE REFUND
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Refund Audit Ledger */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Authoritative Refund Audit Ledger ({refunds.length})
            </h3>
            <span className="text-xs text-slate-400">Synchronized with Razorpay Webhooks</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading refund records...
            </div>
          ) : refunds.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No refund requests recorded yet for this account.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-medium border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Payment ID</th>
                    <th className="py-3 px-4">Refund ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Speed</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Receipt</th>
                    <th className="py-3 px-4">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{r.razorpay_payment_id}</td>
                      <td className="py-3.5 px-4 text-slate-300">{r.razorpay_refund_id || '—'}</td>
                      <td className="py-3.5 px-4 font-sans font-medium text-white">
                        ₹{(r.amount / 100).toFixed(2)} {r.currency}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">
                        <span className="capitalize">{r.speed_processed || r.speed_requested || 'optimum'}</span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${r.status === 'PROCESSED'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              : r.status === 'PENDING'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                            }`}
                        >
                          {r.status === 'PROCESSED' && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === 'PENDING' && <Clock className="w-3 h-3 animate-pulse" />}
                          {r.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{r.receipt}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">
                        <div>Created: {new Date(r.created_at).toLocaleTimeString()}</div>
                        {r.processed_at && (
                          <div className="text-emerald-400/90 text-[11px]">
                            Processed: {new Date(r.processed_at).toLocaleTimeString()}
                          </div>
                        )}
                        {r.failure_reason && (
                          <div className="text-rose-400 text-[11px] truncate max-w-xs">{r.failure_reason}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

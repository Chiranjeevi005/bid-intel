'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BillingStatus } from '@/lib/billing/config';

export type { BillingStatus };

export default function BillingBadge() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/billing/status');
      if (!res.ok) return;
      const data = await res.json();
      setBilling(data);
    } catch (err) {
      console.error('Failed to load billing status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (isLoading || !billing) {
    return null;
  }

  const isPro = billing.plan !== 'FREE' && billing.status === 'ACTIVE';
  const planLabel =
    billing.plan === 'PRO_INDIA'
      ? 'Plus'
      : billing.plan === 'PRO_GLOBAL'
      ? 'Pro'
      : 'Free';

  const isQuotaFull = billing.consumed >= billing.limit;

  return (
    <Link
      href="/subscription"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium border hover:opacity-90 transition-opacity cursor-pointer"
      style={{
        backgroundColor: isPro ? '#F0F5FF' : isQuotaFull ? '#FEF2F2' : '#F8FAFC',
        color: isPro ? '#1E40AF' : isQuotaFull ? '#991B1B' : '#334155',
        borderColor: isPro ? '#BFDBFE' : isQuotaFull ? '#FECACA' : '#E2E8F0',
      }}
      title="View Plans & Pricing"
    >
      <span className="font-semibold">{planLabel}</span>
      <span className="text-gray-400">•</span>
      <span>
        {billing.consumed}/{billing.limit} {isPro ? 'this month' : 'used'}
      </span>
    </Link>
  );
}

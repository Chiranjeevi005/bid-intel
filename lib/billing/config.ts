// ============================================================
// Phase 2C Commercial & Razorpay Configuration
// ============================================================

export type SubscriptionPlan = 'FREE' | 'PRO_INDIA' | 'PRO_GLOBAL';

export interface BillingStatus {
  plan: SubscriptionPlan;
  status: string;
  consumed: number;
  limit: number;
  currency?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  razorpaySubscriptionId?: string | null;
}

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  currency: string;
  priceSubunits: number; // paise for INR (subunits)
  displayPrice: string;
  interval: 'monthly';
  monthlyQuota: number;
}

export const BILLING_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Free',
    currency: 'INR',
    priceSubunits: 0,
    displayPrice: '₹0',
    interval: 'monthly',
    monthlyQuota: 3, // Lifetime for FREE
  },
  PRO_INDIA: {
    id: 'PRO_INDIA',
    name: 'Plus',
    currency: 'INR',
    priceSubunits: 49900, // ₹499
    displayPrice: '₹499/mo',
    interval: 'monthly',
    monthlyQuota: 15,
  },
  PRO_GLOBAL: {
    id: 'PRO_GLOBAL',
    name: 'Pro',
    currency: 'INR',
    priceSubunits: 99900, // ₹999
    displayPrice: '₹999/mo',
    interval: 'monthly',
    monthlyQuota: 15,
  },
};

export function getRazorpayConfig() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const planIdIndia = process.env.RAZORPAY_PLAN_ID_PRO_INDIA || '';
  const planIdGlobal = process.env.RAZORPAY_PLAN_ID_PRO_GLOBAL || '';

  return {
    keyId,
    keySecret,
    webhookSecret,
    planIds: {
      PRO_INDIA: planIdIndia,
      PRO_GLOBAL: planIdGlobal,
    },
  };
}

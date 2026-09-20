import crypto from 'crypto';
import { getRazorpayConfig } from './config';

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

/**
 * Verify Razorpay Webhook signature using HMAC-SHA256 against the raw request body.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature || !secret || !rawBody) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[Razorpay] Signature verification error:', err);
    return false;
  }
}

/**
 * Verify Razorpay Subscription Checkout signature using HMAC-SHA256
 * over (razorpay_payment_id + '|' + razorpay_subscription_id) using RAZORPAY_KEY_SECRET.
 * Mandatory timing-safe comparison per Razorpay official documentation.
 */
export function verifyRazorpaySubscriptionSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string | null | undefined;
  secret: string;
}): boolean {
  const { paymentId, subscriptionId, signature, secret } = params;
  if (!signature || !secret || !paymentId || !subscriptionId) {
    return false;
  }

  try {
    const payload = `${paymentId}|${subscriptionId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[Razorpay] Subscription signature verification error:', err);
    return false;
  }
}

/**
 * Basic Auth header for Razorpay API calls.
 */
function getAuthHeader(): string {
  const { keyId, keySecret } = getRazorpayConfig();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay API credentials missing (KEY_ID or KEY_SECRET)');
  }
  return 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
}

export interface RazorpaySubscriptionResponse {
  id: string;
  entity: 'subscription';
  plan_id: string;
  customer_id: string | null;
  status: string;
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  quantity: number;
  notes: Record<string, string>;
  charge_at: number | null;
  start_at: number | null;
  end_at: number | null;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  customer_notify: boolean;
  created_at: number;
  expire_by: number | null;
  short_url?: string;
  has_scheduled_changes: boolean;
  schedule_change_at: string | null;
}

/**
 * Call Razorpay to create a subscription.
 */
export async function createRazorpaySubscription(params: {
  planId: string;
  totalCount?: number;
  notes?: Record<string, string>;
  customerNotify?: boolean;
}): Promise<RazorpaySubscriptionResponse> {
  const res = await fetch(`${RAZORPAY_BASE_URL}/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      plan_id: params.planId,
      total_count: params.totalCount || 120, // 10 years monthly max
      customer_notify: params.customerNotify !== undefined ? params.customerNotify : true,
      notes: params.notes || {},
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay subscription creation failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as RazorpaySubscriptionResponse;
}

/**
 * Call Razorpay to cancel a subscription.
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true
): Promise<RazorpaySubscriptionResponse> {
  const res = await fetch(`${RAZORPAY_BASE_URL}/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({
      cancel_at_cycle_end: cancelAtCycleEnd,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay subscription cancellation failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as RazorpaySubscriptionResponse;
}

/**
 * Call Razorpay to fetch subscription details.
 */
export async function fetchRazorpaySubscription(
  subscriptionId: string
): Promise<RazorpaySubscriptionResponse> {
  const res = await fetch(`${RAZORPAY_BASE_URL}/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay subscription fetch failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as RazorpaySubscriptionResponse;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded: number;
  captured: boolean;
  description?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  created_at: number;
}

/**
 * Call Razorpay to fetch payment details.
 */
export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentResponse> {
  const res = await fetch(`${RAZORPAY_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay payment fetch failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as RazorpayPaymentResponse;
}

export interface RazorpayRefundResponse {
  id: string;
  entity: 'refund';
  amount: number;
  currency: string;
  payment_id: string;
  status: 'pending' | 'processed' | 'failed';
  speed_requested: string;
  speed_processed: string | null;
  receipt?: string;
  notes?: Record<string, string>;
  acquirer_data?: Record<string, any>;
  created_at: number;
  batch_id?: string | null;
}

/**
 * Call Razorpay to issue a refund.
 * Official API: POST /v1/payments/:payment_id/refund
 * Request parameters: amount (in subunits), speed: 'optimum', receipt, notes.
 */
export async function createRazorpayRefund(params: {
  paymentId: string;
  amount?: number;
  speed?: 'optimum' | 'normal';
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayRefundResponse> {
  const { paymentId, amount, speed = 'optimum', receipt, notes } = params;

  const payload: Record<string, any> = { speed };
  if (amount !== undefined) {
    payload.amount = amount;
  }
  if (receipt) {
    payload.receipt = receipt;
  }
  if (notes) {
    payload.notes = notes;
  }

  const res = await fetch(`${RAZORPAY_BASE_URL}/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Razorpay refund creation failed (${res.status}): ${
        data?.error?.description || JSON.stringify(data)
      }`
    );
  }

  return data as RazorpayRefundResponse;
}


import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/billing/auth';
import { BILLING_PLANS, getRazorpayConfig } from '@/lib/billing/config';
import {
  verifyRazorpaySubscriptionSignature,
  fetchRazorpaySubscription,
  fetchRazorpayPayment,
} from '@/lib/billing/razorpay';
import { reconcileVerifiedSubscription } from '@/lib/billing/webhook-processor';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user session
    const { user, serviceSupabase } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate input fields strictly
    const body = await request.json().catch(() => ({}));
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = body;

    if (
      !razorpay_payment_id ||
      !razorpay_subscription_id ||
      !razorpay_signature ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_subscription_id !== 'string' ||
      typeof razorpay_signature !== 'string' ||
      razorpay_payment_id.length > 255 ||
      razorpay_subscription_id.length > 255 ||
      razorpay_signature.length > 255
    ) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Missing or malformed checkout response parameters' },
        { status: 400 }
      );
    }

    // 3. Cryptographically verify signature with RAZORPAY_KEY_SECRET (HMAC-SHA256, timing-safe)
    const { keySecret, planIds } = getRazorpayConfig();
    if (!keySecret) {
      console.error('[Verify Subscription] Missing RAZORPAY_KEY_SECRET');
      return NextResponse.json(
        { error: 'GATEWAY_CONFIG_ERROR', message: 'Payment gateway configuration error' },
        { status: 503 }
      );
    }

    const isSignatureValid = verifyRazorpaySubscriptionSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
      secret: keySecret,
    });

    if (!isSignatureValid) {
      console.warn(`[Verify Subscription] Cryptographic signature mismatch for sub ${razorpay_subscription_id}`);
      return NextResponse.json(
        { error: 'INVALID_SIGNATURE', message: 'Subscription signature verification failed' },
        { status: 400 }
      );
    }

    // 4. Verify subscription ownership in local user_subscriptions
    const { data: localSub, error: queryErr } = await serviceSupabase
      .from('user_subscriptions')
      .select('id, user_id, plan, status, razorpay_subscription_id, razorpay_plan_id')
      .eq('razorpay_subscription_id', razorpay_subscription_id)
      .maybeSingle();

    if (queryErr || !localSub) {
      return NextResponse.json(
        { error: 'SUBSCRIPTION_NOT_FOUND', message: 'Unknown subscription ID' },
        { status: 404 }
      );
    }

    if (localSub.user_id !== user.id) {
      console.warn(`[Verify Subscription] Ownership mismatch: user ${user.id} tried to verify sub of ${localSub.user_id}`);
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Subscription belongs to another user' },
        { status: 403 }
      );
    }

    // 5. Verify plan integrity against server-side configuration
    const expectedPlanId = planIds[localSub.plan as keyof typeof planIds];
    if (expectedPlanId && localSub.razorpay_plan_id && localSub.razorpay_plan_id !== expectedPlanId) {
      return NextResponse.json(
        { error: 'PLAN_MISMATCH', message: 'Subscription plan does not match server configuration' },
        { status: 400 }
      );
    }

    // 6. Fetch authoritative Subscription and Payment entities from Razorpay API
    let rzpSub: any;
    let rzpPayment: any;

    try {
      rzpSub = await fetchRazorpaySubscription(razorpay_subscription_id);
    } catch (fetchErr: any) {
      console.error('[Verify Subscription] Razorpay fetch subscription failed:', fetchErr);
      return NextResponse.json(
        { error: 'GATEWAY_ERROR', message: 'Could not fetch subscription from Razorpay' },
        { status: 502 }
      );
    }

    if (expectedPlanId && rzpSub.plan_id !== expectedPlanId) {
      return NextResponse.json(
        { error: 'PLAN_MISMATCH', message: 'Razorpay subscription plan mismatch' },
        { status: 400 }
      );
    }

    try {
      rzpPayment = await fetchRazorpayPayment(razorpay_payment_id);
    } catch (payErr: any) {
      console.error('[Verify Subscription] Razorpay payment fetch failed:', payErr);
      return NextResponse.json(
        { error: 'GATEWAY_ERROR', message: 'Could not fetch payment verification from Razorpay' },
        { status: 502 }
      );
    }

    // 7. Unconditional Payment Validation (Fail Closed)
    if (!rzpPayment) {
      return NextResponse.json(
        { error: 'GATEWAY_ERROR', message: 'Payment entity missing from Razorpay' },
        { status: 502 }
      );
    }

    const expectedConfig = BILLING_PLANS[localSub.plan as keyof typeof BILLING_PLANS];
    if (rzpPayment.amount !== expectedConfig.priceSubunits) {
      console.warn(`[Verify Subscription] Amount mismatch: got ${rzpPayment.amount}, expected ${expectedConfig.priceSubunits}`);
      return NextResponse.json(
        { error: 'PAYMENT_AMOUNT_MISMATCH', message: 'Payment amount does not match plan price' },
        { status: 400 }
      );
    }

    if (rzpPayment.currency !== 'INR') {
      console.warn(`[Verify Subscription] Currency mismatch: got ${rzpPayment.currency}, expected INR`);
      return NextResponse.json(
        { error: 'PAYMENT_CURRENCY_MISMATCH', message: 'Payment currency must be INR' },
        { status: 400 }
      );
    }

    if (rzpPayment.status !== 'captured') {
      return NextResponse.json({
        verified: true,
        status: localSub.status,
        message: 'Payment authentication received, waiting for gateway capture',
      });
    }

    // 8. Require authoritative ACTIVE status and valid cycle dates from Razorpay API
    if (rzpSub.status !== 'active') {
      return NextResponse.json({
        verified: true,
        status: localSub.status,
        message: `Subscription state is ${rzpSub.status}. Waiting for active confirmation.`,
      });
    }

    if (!rzpSub.current_start || !rzpSub.current_end) {
      return NextResponse.json({
        verified: true,
        status: localSub.status,
        message: 'Subscription active state missing billing cycle boundaries. Awaiting synchronization.',
      });
    }

    // 9. Invoke shared atomic reconciliation helper (delegating to single Phase 2C transition engine)
    const result = await reconcileVerifiedSubscription({
      userId: user.id,
      razorpaySubscriptionId: razorpay_subscription_id,
      paymentId: razorpay_payment_id,
      subEntity: {
        id: rzpSub.id,
        plan_id: rzpSub.plan_id,
        status: rzpSub.status,
        current_start: rzpSub.current_start,
        current_end: rzpSub.current_end,
      },
      paymentEntity: rzpPayment
        ? {
          id: rzpPayment.id,
          status: rzpPayment.status,
          amount: rzpPayment.amount,
          currency: rzpPayment.currency,
        }
        : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'RECONCILIATION_FAILED', message: result.reason || 'Could not reconcile subscription state' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      verified: true,
      status: 'ACTIVE',
      plan: localSub.plan,
    });
  } catch (err: any) {
    console.error('[Verify Subscription API] Unexpected error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Verification processing error' },
      { status: 500 }
    );
  }
}

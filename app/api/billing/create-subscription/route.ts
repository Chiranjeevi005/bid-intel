import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/billing/auth';
import { BILLING_PLANS, getRazorpayConfig, SubscriptionPlan } from '@/lib/billing/config';
import { createRazorpaySubscription } from '@/lib/billing/razorpay';
import { getDbPool } from '@/lib/db/pool';

export async function POST(request: Request) {
  let dbClient: any = null;
  let lockKey: string | null = null;

  try {
    const { user, serviceSupabase } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const plan = body.plan as SubscriptionPlan;

    if (!plan || (plan !== 'PRO_INDIA' && plan !== 'PRO_GLOBAL')) {
      return NextResponse.json(
        { error: 'INVALID_PLAN', message: 'Plan must be PRO_INDIA or PRO_GLOBAL' },
        { status: 400 }
      );
    }

    // 1. Resolve requested internal plan & commercial configuration server-side
    const planConfig = BILLING_PLANS[plan];
    const rzpConfig = getRazorpayConfig();
    const planId = rzpConfig.planIds[plan];

    // In production, ensure Razorpay configuration is complete; fail safely rather than silently fabricating mock IDs
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (!rzpConfig.keyId || !rzpConfig.keySecret || !planId)) {
      console.error('[Create Subscription] Missing required Razorpay credentials or Plan ID in production.');
      return NextResponse.json(
        { error: 'GATEWAY_CONFIG_ERROR', message: 'Payment gateway configuration is incomplete. Please contact support.' },
        { status: 503 }
      );
    }

    // 2. Check user's existing subscription records
    // Case 4: If user already has an ACTIVE subscription, reject per commercial contract
    const { data: activeSub } = await serviceSupabase
      .from('user_subscriptions')
      .select('id, status, plan')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (activeSub) {
      return NextResponse.json(
        { error: 'ALREADY_SUBSCRIBED', message: 'An active subscription already exists for this user' },
        { status: 409 }
      );
    }

    // --------------------------------------------------------------------------------------
    // 3. Concurrency Serialization: Acquire per-(user, plan) PostgreSQL Advisory Lock
    // Ensures near-simultaneous requests for the exact same user + plan are strictly serialized.
    // Different plans (PRO_INDIA vs PRO_GLOBAL) have distinct lock keys and remain independent.
    // --------------------------------------------------------------------------------------
    try {
      const pool = getDbPool();
      dbClient = await pool.connect();
      lockKey = `${user.id}:${plan}`;
      await dbClient.query('SELECT pg_advisory_lock(hashtext($1));', [lockKey]);
    } catch (poolErr) {
      console.warn('[Create Subscription] DB pool locking warning:', poolErr);
      // If pool connection fails, proceed gracefully with Supabase client (fallback)
      if (dbClient) {
        try { dbClient.release(); } catch {}
        dbClient = null;
      }
    }

    // 4. Safe Reuse Evaluation for Recent Uncompleted Subscriptions (15-minute window)
    // Evaluated INSIDE the lock boundary so concurrent requests find and reuse the newly created subscription!
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: eligibleRecentSubs, error: queryErr } = await serviceSupabase
      .from('user_subscriptions')
      .select('id, plan, status, razorpay_subscription_id, razorpay_plan_id, created_at')
      .eq('user_id', user.id)
      .eq('plan', plan)
      .in('status', ['CREATED', 'AUTHENTICATED'])
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (queryErr) {
      console.error('[Create Subscription] Error querying existing subscriptions:', queryErr);
    }

    const reusableSub = eligibleRecentSubs?.[0];

    if (
      reusableSub &&
      reusableSub.razorpay_subscription_id &&
      (!planId || !reusableSub.razorpay_plan_id || reusableSub.razorpay_plan_id === planId)
    ) {
      // Deterministically reuse the newest matching valid subscription without inserting a duplicate DB row or creating another Razorpay subscription
      return NextResponse.json({
        subscriptionId: reusableSub.razorpay_subscription_id,
        keyId: rzpConfig.keyId || 'rzp_test_placeholder',
        plan,
        currency: planConfig.currency,
        amount: planConfig.priceSubunits,
        reused: true,
      });
    }

    // 5. Create new Razorpay subscription (Strictly executed by only ONE request at a time per user+plan)
    let subscriptionId: string;

    if (!rzpConfig.keyId || !rzpConfig.keySecret || !planId) {
      // Non-production test mode fallback if external keys absent
      subscriptionId = `sub_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    } else {
      const rzpSub = await createRazorpaySubscription({
        planId,
        notes: {
          user_id: user.id,
          user_email: user.email || '',
          plan,
        },
      });
      subscriptionId = rzpSub.id;
    }

    // 6. Record initial pre-activation row in user_subscriptions
    const { data: subRow, error: insertErr } = await serviceSupabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan,
        status: 'CREATED',
        currency: planConfig.currency,
        price_cents: planConfig.priceSubunits,
        razorpay_subscription_id: subscriptionId,
        razorpay_plan_id: planId || null,
        cancel_at_period_end: false,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[Create Subscription] DB insert error:', insertErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Failed to record subscription initiation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptionId,
      keyId: rzpConfig.keyId || 'rzp_test_placeholder',
      plan,
      currency: planConfig.currency,
      amount: planConfig.priceSubunits,
      reused: false,
    });
  } catch (err: any) {
    console.error('[Create Subscription] Error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Failed to create subscription' },
      { status: 500 }
    );
  } finally {
    // Release advisory lock and pool client
    if (dbClient && lockKey) {
      try {
        await dbClient.query('SELECT pg_advisory_unlock(hashtext($1));', [lockKey]);
      } catch (unlockErr) {
        console.warn('[Create Subscription] Advisory unlock error:', unlockErr);
      } finally {
        try {
          dbClient.release();
        } catch {}
      }
    }
  }
}

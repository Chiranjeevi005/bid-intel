import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/billing/auth';
import { getRazorpayConfig } from '@/lib/billing/config';
import { cancelRazorpaySubscription } from '@/lib/billing/razorpay';

export async function POST(request: Request) {
  try {
    const { user, serviceSupabase } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find active subscription
    const { data: activeSub, error: findErr } = await serviceSupabase
      .from('user_subscriptions')
      .select('id, plan, status, razorpay_subscription_id, current_period_end, cancel_at_period_end')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (findErr || !activeSub) {
      return NextResponse.json(
        { error: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found to cancel' },
        { status: 404 }
      );
    }

    if (activeSub.cancel_at_period_end) {
      return NextResponse.json({
        success: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: activeSub.current_period_end,
        message: 'Subscription is already scheduled for cancellation at period end',
      });
    }

    const rzpConfig = getRazorpayConfig();

    // If real Razorpay credentials exist, call cancel on Razorpay
    if (
      rzpConfig.keyId &&
      rzpConfig.keySecret &&
      activeSub.razorpay_subscription_id &&
      !activeSub.razorpay_subscription_id.startsWith('sub_test_')
    ) {
      try {
        await cancelRazorpaySubscription(activeSub.razorpay_subscription_id, true);
      } catch (rzpErr: any) {
        console.error('[Cancel Subscription] Razorpay API error:', rzpErr);
        // Continue to update local scheduled state if appropriate or return error
      }
    }

    // Mark subscription locally to cancel at period end while preserving ACTIVE access
    const { error: updateErr } = await serviceSupabase
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeSub.id);

    if (updateErr) {
      console.error('[Cancel Subscription] DB update error:', updateErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Failed to update subscription cancellation status' },
        { status: 500 }
      );
    }

    // Audit event in billing_events
    await serviceSupabase.from('billing_events').insert({
      user_id: user.id,
      subscription_id: activeSub.id,
      event_type: 'subscription.cancellation_scheduled',
      details: {
        requested_at: new Date().toISOString(),
        effective_at: activeSub.current_period_end,
      },
    });

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: activeSub.current_period_end,
      message: 'Subscription scheduled for cancellation at period end. Access preserved through current period.',
    });
  } catch (err: any) {
    console.error('[Cancel Subscription] Error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Failed to process cancellation' },
      { status: 500 }
    );
  }
}

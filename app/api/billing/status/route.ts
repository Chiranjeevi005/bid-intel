import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/billing/auth';

export async function GET(request: Request) {
  try {
    const { user, serviceSupabase } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check for ACTIVE subscription
    const { data: activeSub } = await serviceSupabase
      .from('user_subscriptions')
      .select('id, plan, status, currency, price_cents, current_period_start, current_period_end, cancel_at_period_end, razorpay_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (activeSub) {
      // Authoritative PRO quota consumption matching start_analysis_session
      const { count: consumedCount } = await serviceSupabase
        .from('analysis_entitlement_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('plan_at_start', activeSub.plan)
        .eq('subscription_id', activeSub.id)
        .eq('period_start', activeSub.current_period_start)
        .eq('period_end', activeSub.current_period_end)
        .in('status', ['RESERVED', 'CONSUMED']);

      return NextResponse.json({
        plan: activeSub.plan,
        status: activeSub.status,
        consumed: consumedCount || 0,
        limit: 15,
        currency: activeSub.currency,
        currentPeriodStart: activeSub.current_period_start,
        currentPeriodEnd: activeSub.current_period_end,
        cancelAtPeriodEnd: activeSub.cancel_at_period_end,
        razorpaySubscriptionId: activeSub.razorpay_subscription_id,
      });
    }

    // 2. Check for latest non-active subscription (e.g. HALTED, CANCELLED)
    const { data: latestSub } = await serviceSupabase
      .from('user_subscriptions')
      .select('id, plan, status, currency, current_period_start, current_period_end, cancel_at_period_end, razorpay_subscription_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Authoritative FREE quota consumption matching start_analysis_session
    const { count: freeConsumedCount } = await serviceSupabase
      .from('analysis_entitlement_ledger')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('plan_at_start', 'FREE')
      .in('status', ['RESERVED', 'CONSUMED']);

    return NextResponse.json({
      plan: 'FREE',
      status: latestSub?.status || 'FREE',
      consumed: freeConsumedCount || 0,
      limit: 3,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      previousSubscription: latestSub || null,
    });
  } catch (err: any) {
    console.error('[Billing Status API] Error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch billing status' },
      { status: 500 }
    );
  }
}

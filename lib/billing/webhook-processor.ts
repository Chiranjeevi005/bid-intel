import { getDbPool } from '../db/pool';

export interface RazorpayWebhookEnvelope {
  entity: 'event';
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        customer_id: string | null;
        status: string;
        current_start: number | null;
        current_end: number | null;
        ended_at: number | null;
        has_scheduled_changes?: boolean;
        schedule_change_at?: string | null;
        [key: string]: any;
      };
    };
    payment?: {
      entity: {
        id: string;
        status: string;
        amount: number;
        currency: string;
        [key: string]: any;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        currency: string;
        status: 'pending' | 'processed' | 'failed';
        speed_requested: string;
        speed_processed?: string | null;
        receipt?: string;
        batch_id?: string | null;
        created_at: number;
        error_description?: string;
        error_reason?: string;
        [key: string]: any;
      };
    };
    [key: string]: any;
  };
  created_at: number; // Unix epoch seconds
}

export interface WebhookProcessingResult {
  status:
    | 'PROCESSED'
    | 'DUPLICATE_SUPPRESSED'
    | 'STALE_EVENT_REJECTED'
    | 'TRANSITION_REJECTED'
    | 'AUTHENTICATED_RECORDED'
    | 'NO_SUBSCRIPTION_ENTITY'
    | 'UNMATCHED_SUBSCRIPTION'
    | 'REFUND_RECORD_NOT_FOUND'
    | 'UNKNOWN_EVENT';
  eventType: string;
  providerEventId: string;
  subscriptionId?: string;
  refundId?: string;
  appliedStatus?: string;
  reason?: string;
}

const IRREVERSIBLE_TERMINAL_STATES = new Set(['CANCELLED', 'COMPLETED', 'EXPIRED']);

/**
 * Atomic Webhook Processor
 * Executes all duplicate checks, watermark checks, and state transitions
 * within a single PostgreSQL transaction.
 */
export async function processRazorpayWebhook(params: {
  providerEventId: string;
  envelope: RazorpayWebhookEnvelope;
  rawBody?: string;
}): Promise<WebhookProcessingResult> {
  const { providerEventId, envelope } = params;
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ------------------------------------------------------------
    // 1. Webhook Deduplication (idx_billing_events_provider_event)
    // ------------------------------------------------------------
    const eventType = envelope.event;
    const eventCreatedAt = envelope.created_at;
    const subEntity = envelope.payload?.subscription?.entity;
    const paymentEntity = envelope.payload?.payment?.entity;
    const refundEntity = envelope.payload?.refund?.entity;
    const razorpaySubId = subEntity?.id || null;

    const dedupeRes = await client.query(
      `
      INSERT INTO public.billing_events (
        provider_event_id,
        event_type,
        amount_cents,
        currency,
        details
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING
      RETURNING id;
      `,
      [
        providerEventId,
        eventType,
        paymentEntity ? paymentEntity.amount : (refundEntity ? refundEntity.amount : null),
        paymentEntity ? paymentEntity.currency : (refundEntity ? refundEntity.currency : null),
        JSON.stringify({
          account_id: envelope.account_id,
          created_at: eventCreatedAt,
          razorpay_subscription_id: razorpaySubId,
          razorpay_payment_id: paymentEntity?.id || refundEntity?.payment_id || null,
          razorpay_refund_id: refundEntity?.id || null,
          contains: envelope.contains,
        }),
      ]
    );

    if (dedupeRes.rows.length === 0) {
      // Event already recorded and processed
      await client.query('COMMIT');
      return {
        status: 'DUPLICATE_SUPPRESSED',
        eventType,
        providerEventId,
        reason: 'Event already recorded in billing_events',
      };
    }

    const billingEventId = dedupeRes.rows[0].id;

    // ------------------------------------------------------------
    // 1.5 Handle Refund Lifecycle Webhooks (refund.processed / refund.failed)
    // ------------------------------------------------------------
    if (eventType === 'refund.processed' || eventType === 'refund.failed') {
      if (!refundEntity) {
        await client.query('COMMIT');
        return {
          status: 'REFUND_RECORD_NOT_FOUND',
          eventType,
          providerEventId,
          reason: 'Payload contains no refund entity',
        };
      }

      const rzpRefundId = refundEntity.id;
      const rzpPaymentId = refundEntity.payment_id;
      const newStatus = eventType === 'refund.processed' ? 'PROCESSED' : 'FAILED';
      const failureReason = eventType === 'refund.failed' ? (refundEntity.error_description || refundEntity.error_reason || 'Refund failed at gateway') : null;
      const speedProcessed = refundEntity.speed_processed || null;
      const processedAt = eventType === 'refund.processed' ? new Date().toISOString() : null;

      // Locate RFPGround refund record by razorpay_refund_id or razorpay_payment_id (with row lock)
      const refundSelect = await client.query(
        `
        SELECT id, user_id, subscription_id, status
        FROM public.refunds
        WHERE razorpay_refund_id = $1 OR (razorpay_payment_id = $2 AND status = 'PENDING')
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE;
        `,
        [rzpRefundId, rzpPaymentId]
      );

      if (refundSelect.rows.length === 0) {
        // Record details in billing_events
        await client.query(
          `
          UPDATE public.billing_events
          SET details = details || '{"unmatched_refund": true}'::jsonb
          WHERE id = $1;
          `,
          [billingEventId]
        );
        await client.query('COMMIT');
        return {
          status: 'REFUND_RECORD_NOT_FOUND',
          eventType,
          providerEventId,
          reason: `No matching public.refunds record for refund ${rzpRefundId} / payment ${rzpPaymentId}`,
        };
      }

      const refundRow = refundSelect.rows[0];

      // Update refund row atomically
      await client.query(
        `
        UPDATE public.refunds
        SET
          razorpay_refund_id = COALESCE(razorpay_refund_id, $1),
          status = $2,
          speed_processed = COALESCE($3, speed_processed),
          failure_reason = COALESCE($4, failure_reason),
          raw_response = $5,
          processed_at = COALESCE(processed_at, $6::timestamptz),
          updated_at = now()
        WHERE id = $7;
        `,
        [
          rzpRefundId,
          newStatus,
          speedProcessed,
          failureReason,
          JSON.stringify(refundEntity),
          processedAt,
          refundRow.id,
        ]
      );

      // Link billing_event to user and subscription if present
      await client.query(
        `
        UPDATE public.billing_events
        SET user_id = $1, subscription_id = $2
        WHERE id = $3;
        `,
        [refundRow.user_id, refundRow.subscription_id, billingEventId]
      );

      await client.query('COMMIT');
      return {
        status: 'PROCESSED',
        eventType,
        providerEventId,
        refundId: refundRow.id,
        appliedStatus: newStatus,
      };
    }

    if (!razorpaySubId || !subEntity) {
      await client.query('COMMIT');
      return {
        status: 'NO_SUBSCRIPTION_ENTITY',
        eventType,
        providerEventId,
        reason: 'Payload contains no subscription entity',
      };
    }

    // ------------------------------------------------------------
    // 2. Fetch & Lock Subscription Row (FOR UPDATE)
    // ------------------------------------------------------------
    const subRes = await client.query(
      `
      SELECT id, user_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, last_event_at
      FROM public.user_subscriptions
      WHERE razorpay_subscription_id = $1
      FOR UPDATE;
      `,
      [razorpaySubId]
    );

    if (subRes.rows.length === 0) {
      // Unknown subscription
      await client.query(
        `
        UPDATE public.billing_events
        SET details = details || '{"unmatched": true}'::jsonb
        WHERE id = $1;
        `,
        [billingEventId]
      );
      await client.query('COMMIT');
      return {
        status: 'UNMATCHED_SUBSCRIPTION',
        eventType,
        providerEventId,
        reason: `No user_subscriptions row found for razorpay_subscription_id: ${razorpaySubId}`,
      };
    }

    const subRow = subRes.rows[0];
    const storedStatus = subRow.status;
    const storedStartSec = subRow.current_period_start
      ? Math.floor(new Date(subRow.current_period_start).getTime() / 1000)
      : null;
    const storedLastEventSec = subRow.last_event_at
      ? Math.floor(new Date(subRow.last_event_at).getTime() / 1000)
      : null;
    const incomingStartSec = subEntity.current_start;

    // Link subscription & user to billing_event
    await client.query(
      `
      UPDATE public.billing_events
      SET subscription_id = $1, user_id = $2
      WHERE id = $3;
      `,
      [subRow.id, subRow.user_id, billingEventId]
    );

    // ------------------------------------------------------------
    // 3. Temporal Ordering (Watermark Check)
    // ------------------------------------------------------------
    let isStale = false;
    let staleReason = '';
    let isNewerCycle = false;
    let isEqualTimestamp = false;

    if (incomingStartSec !== null && storedStartSec !== null) {
      if (incomingStartSec < storedStartSec) {
        isStale = true;
        staleReason = `Incoming cycle start (${incomingStartSec}) is older than stored cycle start (${storedStartSec})`;
      } else if (incomingStartSec > storedStartSec) {
        isNewerCycle = true;
      }
    }

    if (!isStale && !isNewerCycle) {
      if (storedLastEventSec !== null) {
        if (eventCreatedAt < storedLastEventSec) {
          isStale = true;
          staleReason = `Incoming event created_at (${eventCreatedAt}) is older than last_event_at (${storedLastEventSec})`;
        } else if (eventCreatedAt === storedLastEventSec) {
          isEqualTimestamp = true;
        }
      }
    }

    if (isStale) {
      await client.query(
        `
        UPDATE public.billing_events
        SET details = details || $1::jsonb
        WHERE id = $2;
        `,
        [JSON.stringify({ stale: true, reason: staleReason }), billingEventId]
      );
      await client.query('COMMIT');
      return {
        status: 'STALE_EVENT_REJECTED',
        eventType,
        providerEventId,
        subscriptionId: subRow.id,
        reason: staleReason,
      };
    }

    // ------------------------------------------------------------
    // 4. State Transition Validity Evaluation & Execution (Single Shared Authority)
    // ------------------------------------------------------------
    const transitionRes = await executeSubscriptionLifecycleTransition({
      client,
      subRow,
      eventType,
      eventCreatedAt,
      providerEventId,
      billingEventId,
      subEntity,
      paymentEntity,
    });

    if (transitionRes.status === 'TRANSITION_REJECTED' || transitionRes.status === 'AUTHENTICATED_RECORDED') {
      await client.query('COMMIT');
      return {
        status: transitionRes.status as any,
        eventType,
        providerEventId,
        subscriptionId: subRow.id,
        reason: transitionRes.reason,
      };
    }

    await client.query('COMMIT');

    return {
      status: 'PROCESSED',
      eventType,
      providerEventId,
      subscriptionId: subRow.id,
      appliedStatus: transitionRes.appliedStatus,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * The SINGLE, SHARED Phase 2C Subscription Lifecycle Transition Primitive.
 * Used identically by Webhooks and Checkout Verification reconciliation.
 * Enforces:
 * - NO fabricated billing dates (rejects if current_start/current_end missing on activation)
 * - Strict irreversible terminal state preservation (CANCELLED, COMPLETED, EXPIRED cannot be resurrected)
 * - Strict HALTED reactivation (requires captured payment AND active subscription)
 * - Equal timestamp tie-breaker rules
 * - Identical database row update and timestamp recording
 */
export async function executeSubscriptionLifecycleTransition(params: {
  client: any;
  subRow: any;
  eventType: string;
  eventCreatedAt: number;
  providerEventId: string;
  billingEventId?: string;
  subEntity: {
    id: string;
    status: string;
    current_start: number | null;
    current_end: number | null;
    has_scheduled_changes?: boolean;
    schedule_change_at?: string | null;
    [key: string]: any;
  };
  paymentEntity?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    [key: string]: any;
  };
}): Promise<{ status: string; appliedStatus?: string; reason?: string }> {
  const {
    client,
    subRow,
    eventType,
    eventCreatedAt,
    providerEventId,
    billingEventId,
    subEntity,
    paymentEntity,
  } = params;

  const storedStatus = subRow.status;
  const storedLastEventSec = subRow.last_event_at
    ? Math.floor(new Date(subRow.last_event_at).getTime() / 1000)
    : null;
  const isEqualTimestamp = storedLastEventSec !== null && eventCreatedAt === storedLastEventSec;

  // Special Case: subscription.authenticated
  if (eventType === 'subscription.authenticated') {
    if (billingEventId) {
      await client.query(
        `
        UPDATE public.billing_events
        SET details = details || '{"action": "authenticated_recorded_no_state_change"}'::jsonb
        WHERE id = $1;
        `,
        [billingEventId]
      );
    }
    return {
      status: 'AUTHENTICATED_RECORDED',
      reason: 'subscription.authenticated recorded; PRO entitlement requires active subscription',
    };
  }

  let targetStatus: string | null = null;
  let targetCancelAtPeriodEnd: boolean = subRow.cancel_at_period_end;
  let newPeriodStart: Date | null = subRow.current_period_start;
  let newPeriodEnd: Date | null = subRow.current_period_end;

  if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
    // 1. Irreversible terminal states protection
    if (IRREVERSIBLE_TERMINAL_STATES.has(storedStatus)) {
      return {
        status: 'TRANSITION_REJECTED',
        reason: `Cannot resurrect irreversible terminal state: ${storedStatus}`,
      };
    }

    // 2. Strict HALTED reactivation rule: requires BOTH captured payment AND active subscription status
    if (storedStatus === 'HALTED') {
      const isPaymentCaptured = paymentEntity && paymentEntity.status === 'captured';
      const isSubActive = subEntity.status === 'active';

      if (!isPaymentCaptured || !isSubActive) {
        return {
          status: 'TRANSITION_REJECTED',
          reason: 'HALTED -> ACTIVE strictly requires captured payment status and active subscription status',
        };
      }
    }

    // 3. For any transition to ACTIVE, current subscription entity in Razorpay must be 'active'
    if (subEntity.status !== 'active') {
      return {
        status: 'TRANSITION_REJECTED',
        reason: `Subscription cannot transition to ACTIVE when Razorpay status is ${subEntity.status}`,
      };
    }

    // 4. ZERO FABRICATED DATES: Razorpay must provide both current_start and current_end
    if (!subEntity.current_start || !subEntity.current_end) {
      return {
        status: 'TRANSITION_REJECTED',
        reason: 'Razorpay subscription active state missing current_start or current_end. Fabricated dates prohibited.',
      };
    }

    targetStatus = 'ACTIVE';
    newPeriodStart = new Date(subEntity.current_start * 1000);
    newPeriodEnd = new Date(subEntity.current_end * 1000);
  } else if (eventType === 'subscription.pending') {
    if (storedStatus === 'HALTED' || IRREVERSIBLE_TERMINAL_STATES.has(storedStatus)) {
      targetStatus = storedStatus;
    } else if (storedStatus === 'ACTIVE') {
      const now = new Date();
      if (subRow.current_period_end && now <= new Date(subRow.current_period_end)) {
        targetStatus = 'ACTIVE';
      } else {
        targetStatus = 'HALTED';
      }
    }
  } else if (eventType === 'subscription.halted') {
    if (!IRREVERSIBLE_TERMINAL_STATES.has(storedStatus)) {
      targetStatus = 'HALTED';
    }
  } else if (eventType === 'subscription.cancelled') {
    if (
      subEntity.has_scheduled_changes &&
      subEntity.schedule_change_at === 'cycle_end' &&
      subEntity.status === 'active'
    ) {
      targetStatus = 'ACTIVE';
      targetCancelAtPeriodEnd = true;
    } else {
      targetStatus = 'CANCELLED';
    }
  } else if (eventType === 'subscription.completed') {
    targetStatus = 'COMPLETED';
  } else if (eventType === 'subscription.expired') {
    targetStatus = 'EXPIRED';
  }

  if (!targetStatus) {
    return {
      status: 'PROCESSED',
      reason: 'Event processed with no state mutation',
    };
  }

  // Equal-timestamp tie breaker
  if (isEqualTimestamp) {
    if (targetStatus === 'ACTIVE' && (storedStatus === 'HALTED' || IRREVERSIBLE_TERMINAL_STATES.has(storedStatus))) {
      return {
        status: 'TRANSITION_REJECTED',
        reason: 'Equal timestamp tie-breaker: suspension/terminal dominates ACTIVE',
      };
    }
  }

  // Apply atomic state mutation
  await client.query(
    `
    UPDATE public.user_subscriptions
    SET status = $1,
        current_period_start = $2,
        current_period_end = $3,
        cancel_at_period_end = $4,
        last_event_at = to_timestamp($5),
        updated_at = now()
    WHERE id = $6;
    `,
    [
      targetStatus,
      newPeriodStart,
      newPeriodEnd,
      targetCancelAtPeriodEnd,
      eventCreatedAt,
      subRow.id,
    ]
  );

  return {
    status: 'PROCESSED',
    appliedStatus: targetStatus,
  };
}

/**
 * Reconcile a cryptographically verified subscription checkout from the Checkout handler.
 * Reuses the EXACT same Phase 2C executeSubscriptionLifecycleTransition rules.
 * Never invents billing dates. Strictly validates ownership and state.
 */
export async function reconcileVerifiedSubscription(params: {
  userId: string;
  razorpaySubscriptionId: string;
  paymentId: string;
  subEntity: {
    id: string;
    plan_id: string;
    status: string;
    current_start: number | null;
    current_end: number | null;
    [key: string]: any;
  };
  paymentEntity?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    [key: string]: any;
  };
}): Promise<{ success: boolean; status: string; reason?: string }> {
  const { userId, razorpaySubscriptionId, paymentId, subEntity, paymentEntity } = params;
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock subscription row
    const subRes = await client.query(
      `
      SELECT id, user_id, plan, status, current_period_start, current_period_end, cancel_at_period_end, last_event_at
      FROM public.user_subscriptions
      WHERE razorpay_subscription_id = $1
      FOR UPDATE;
      `,
      [razorpaySubscriptionId]
    );

    if (subRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, status: 'UNMATCHED_SUBSCRIPTION', reason: 'Subscription not found' };
    }

    const subRow = subRes.rows[0];

    // Ownership check
    if (subRow.user_id !== userId) {
      await client.query('ROLLBACK');
      return { success: false, status: 'OWNERSHIP_MISMATCH', reason: 'Subscription does not belong to user' };
    }

    // 2. Delegate to the single shared Phase 2C lifecycle state machine
    const nowSec = Math.floor(Date.now() / 1000);
    const transitionRes = await executeSubscriptionLifecycleTransition({
      client,
      subRow,
      eventType: 'subscription.activated',
      eventCreatedAt: nowSec,
      providerEventId: `checkout_verify_${paymentId}`,
      subEntity,
      paymentEntity,
    });

    if (transitionRes.status !== 'PROCESSED' || transitionRes.appliedStatus !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return {
        success: false,
        status: transitionRes.status,
        reason: transitionRes.reason || 'Subscription lifecycle transition rejected',
      };
    }

    // 3. Record verified checkout event in billing_events idempotently
    const providerEventId = `checkout_verify_${paymentId}`;
    await client.query(
      `
      INSERT INTO public.billing_events (
        provider_event_id,
        user_id,
        subscription_id,
        event_type,
        amount_cents,
        currency,
        details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (provider_event_id) WHERE provider_event_id IS NOT NULL DO NOTHING;
      `,
      [
        providerEventId,
        userId,
        subRow.id,
        'checkout.verified',
        paymentEntity ? paymentEntity.amount : null,
        paymentEntity ? paymentEntity.currency : null,
        JSON.stringify({
          payment_id: paymentId,
          razorpay_subscription_id: razorpaySubscriptionId,
          verified_at: new Date().toISOString(),
        }),
      ]
    );

    await client.query('COMMIT');
    return { success: true, status: 'ACTIVE' };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}


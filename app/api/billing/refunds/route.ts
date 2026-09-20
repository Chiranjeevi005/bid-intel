import { NextResponse } from 'next/server';
import { getAuthenticatedUser, isRefundConsoleAuthorized } from '@/lib/billing/auth';
import { fetchRazorpayPayment, createRazorpayRefund } from '@/lib/billing/razorpay';
import { getDbPool } from '@/lib/db/pool';

/**
 * GET /api/billing/refunds
 * Fetches refund records and details for payments associated with the authorized user.
 * Optional query parameter: ?payment_id=pay_xxx
 */
export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    if (!isRefundConsoleAuthorized(user)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Refund Console access restricted' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      let query = `
        SELECT r.id, r.user_id, r.subscription_id, r.razorpay_payment_id, r.razorpay_refund_id,
               r.amount, r.currency, r.status, r.speed_requested, r.speed_processed,
               r.receipt, r.reason, r.failure_reason, r.created_at, r.updated_at, r.processed_at,
               s.plan as subscription_plan
        FROM public.refunds r
        LEFT JOIN public.user_subscriptions s ON r.subscription_id = s.id
        WHERE r.user_id = $1
      `;
      const params: any[] = [user.id];

      if (paymentId) {
        query += ` AND r.razorpay_payment_id = $2`;
        params.push(paymentId);
      }

      query += ` ORDER BY r.created_at DESC LIMIT 50;`;

      const res = await client.query(query, params);

      // Also fetch payments from user_subscriptions or billing_events to give full operational context
      const paymentsRes = await client.query(
        `
        SELECT DISTINCT
          e.details->>'payment_id' as payment_id,
          s.id as subscription_id,
          s.plan as subscription_plan,
          s.status as subscription_status,
          e.created_at
        FROM public.billing_events e
        JOIN public.user_subscriptions s ON e.subscription_id = s.id
        WHERE e.user_id = $1 AND e.details->>'payment_id' IS NOT NULL
        ORDER BY e.created_at DESC
        LIMIT 10;
        `,
        [user.id]
      );

      return NextResponse.json({
        refunds: res.rows,
        knownPayments: paymentsRes.rows.filter((r: any) => Boolean(r.payment_id)),
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Refund API GET] Error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Error fetching refund data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/refunds
 * Issues an authoritative refund for a captured payment.
 * Request Body:
 * {
 *   payment_id: string; // razorpay_payment_id
 *   amount?: number;    // optional partial refund amount in subunits (paise)
 *   reason?: string;
 * }
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    // 2. Authorize Refund Console access
    if (!isRefundConsoleAuthorized(user)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Refund Console access restricted' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { payment_id, amount: requestedAmount, reason } = body;

    if (!payment_id || typeof payment_id !== 'string' || !payment_id.startsWith('pay_')) {
      return NextResponse.json(
        { error: 'INVALID_PAYMENT_ID', message: 'Valid razorpay_payment_id required (pay_...)' },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const client = await pool.connect();

    try {
      // Concurrency protection: Lock based on payment_id
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1));', [`refund:${payment_id}`]);

      // 3. Validate payment belongs to authenticated user
      // Check billing_events or user_subscriptions
      const ownershipCheck = await client.query(
        `
        SELECT s.id as subscription_id, s.user_id, s.plan
        FROM public.billing_events e
        JOIN public.user_subscriptions s ON e.subscription_id = s.id
        WHERE (e.details->>'payment_id' = $1 OR e.provider_event_id = $2)
        LIMIT 1;
        `,
        [payment_id, `checkout_verify_${payment_id}`]
      );

      let subscriptionId: string | null = null;
      if (ownershipCheck.rows.length > 0) {
        if (ownershipCheck.rows[0].user_id !== user.id) {
          return NextResponse.json(
            { error: 'FORBIDDEN', message: 'Payment belongs to another user' },
            { status: 403 }
          );
        }
        subscriptionId = ownershipCheck.rows[0].subscription_id;
      }

      // Check existing refunds for this payment in DB
      const existingRefunds = await client.query(
        `
        SELECT id, razorpay_refund_id, amount, status, receipt
        FROM public.refunds
        WHERE razorpay_payment_id = $1
        ORDER BY created_at DESC;
        `,
        [payment_id]
      );

      // Check if there is an in-flight PENDING refund
      const pendingRefund = existingRefunds.rows.find((r: any) => r.status === 'PENDING');
      if (pendingRefund) {
        return NextResponse.json(
          {
            error: 'REFUND_IN_PROGRESS',
            message: 'A refund for this payment is currently being processed by Razorpay',
            refund: pendingRefund,
          },
          { status: 409 }
        );
      }

      // 4. Fetch authoritative Payment entity directly from Razorpay (Fail Closed)
      let rzpPayment: any;
      try {
        rzpPayment = await fetchRazorpayPayment(payment_id);
      } catch (payErr: any) {
        console.error('[Refund API] Razorpay payment fetch failed:', payErr);
        return NextResponse.json(
          { error: 'GATEWAY_ERROR', message: 'Could not fetch authoritative payment from Razorpay' },
          { status: 502 }
        );
      }

      if (!rzpPayment) {
        return NextResponse.json(
          { error: 'GATEWAY_ERROR', message: 'Payment entity not found in gateway' },
          { status: 502 }
        );
      }

      // 5. Require payment status = captured
      if (rzpPayment.status !== 'captured') {
        return NextResponse.json(
          {
            error: 'PAYMENT_NOT_CAPTURED',
            message: `Payment status is ${rzpPayment.status}. Only captured payments can be refunded.`,
          },
          { status: 400 }
        );
      }

      // 6. Read amount, currency, refund_status, amount_refunded
      const totalAmount = rzpPayment.amount; // paise
      const currency = rzpPayment.currency;
      const alreadyRefunded = rzpPayment.amount_refunded || 0; // paise
      const remainingRefundable = totalAmount - alreadyRefunded;

      // 7 & 8. Validate refundable amount
      if (remainingRefundable <= 0 || rzpPayment.refund_status === 'full') {
        return NextResponse.json(
          {
            error: 'ALREADY_FULLY_REFUNDED',
            message: 'This payment has already been fully refunded',
            totalAmount,
            alreadyRefunded,
            remainingRefundable: 0,
          },
          { status: 400 }
        );
      }

      // Determine refund amount to request
      let refundAmountToProcess = remainingRefundable;
      if (requestedAmount !== undefined) {
        const parsed = parseInt(String(requestedAmount), 10);
        if (isNaN(parsed) || parsed <= 0) {
          return NextResponse.json(
            { error: 'INVALID_REFUND_AMOUNT', message: 'Refund amount must be a positive integer in paise' },
            { status: 400 }
          );
        }
        if (parsed > remainingRefundable) {
          return NextResponse.json(
            {
              error: 'AMOUNT_EXCEEDS_REFUNDABLE',
              message: `Requested refund (₹${(parsed / 100).toFixed(2)}) exceeds remaining refundable amount (₹${(
                remainingRefundable / 100
              ).toFixed(2)})`,
              remainingRefundable,
            },
            { status: 400 }
          );
        }
        refundAmountToProcess = parsed;
      }

      // 9. Generate deterministic unique receipt / idempotency key
      // Format: rfd_<payment_id_short>_<timestamp_or_seq>
      const receipt = `rcpt_${payment_id}_${Date.now()}`;

      // 10. Call Razorpay Refund API
      // speed = 'optimum'
      let rzpRefund: any;
      try {
        rzpRefund = await createRazorpayRefund({
          paymentId: payment_id,
          amount: refundAmountToProcess,
          speed: 'optimum',
          receipt,
          notes: {
            initiated_by: user.email || user.id,
            reason: reason || 'RFPGround Refund Console execution',
            environment: process.env.NODE_ENV || 'production',
          },
        });
      } catch (refundErr: any) {
        console.error('[Refund API] Razorpay refund creation failed:', refundErr);
        return NextResponse.json(
          {
            error: 'GATEWAY_ERROR',
            message: refundErr.message || 'Razorpay rejected the refund request',
          },
          { status: 502 }
        );
      }

      // 11. Persist refund record in RFPGround public.refunds table
      // Razorpay refund states: 'pending' | 'processed' | 'failed'
      const refundStatus = (rzpRefund.status || 'pending').toUpperCase(); // 'PENDING' | 'PROCESSED' | 'FAILED'
      const processedAt = refundStatus === 'PROCESSED' ? new Date().toISOString() : null;

      const insertRes = await client.query(
        `
        INSERT INTO public.refunds (
          user_id,
          subscription_id,
          razorpay_payment_id,
          razorpay_refund_id,
          amount,
          currency,
          status,
          speed_requested,
          speed_processed,
          receipt,
          reason,
          failure_reason,
          raw_response,
          processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, razorpay_refund_id, amount, currency, status, speed_requested, speed_processed, receipt, created_at, processed_at;
        `,
        [
          user.id,
          subscriptionId,
          payment_id,
          rzpRefund.id,
          refundAmountToProcess,
          currency,
          refundStatus,
          rzpRefund.speed_requested || 'optimum',
          rzpRefund.speed_processed || null,
          receipt,
          reason || 'Console manual test refund',
          null,
          JSON.stringify(rzpRefund),
          processedAt,
        ]
      );

      const savedRefund = insertRes.rows[0];

      // 12. Return authoritative response
      return NextResponse.json({
        success: true,
        refund: savedRefund,
        gatewayResponse: {
          id: rzpRefund.id,
          status: rzpRefund.status,
          speed_requested: rzpRefund.speed_requested,
          speed_processed: rzpRefund.speed_processed,
        },
        message:
          refundStatus === 'PROCESSED'
            ? 'Refund processed successfully'
            : 'Refund requested. Razorpay is still processing the refund.',
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[Refund API POST] Unexpected error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Refund processing error' },
      { status: 500 }
    );
  }
}

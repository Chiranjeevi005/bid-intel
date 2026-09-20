import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayConfig } from '@/lib/billing/config';
import { verifyRazorpayWebhookSignature } from '@/lib/billing/razorpay';
import { processRazorpayWebhook, RazorpayWebhookEnvelope } from '@/lib/billing/webhook-processor';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const providerEventId = req.headers.get('x-razorpay-event-id');

    if (!providerEventId) {
      return NextResponse.json(
        { error: 'MISSING_EVENT_ID', message: 'Missing x-razorpay-event-id header' },
        { status: 400 }
      );
    }

    const { webhookSecret } = getRazorpayConfig();

    // Verify signature against raw body bytes
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn(`[Razorpay Webhook] Invalid signature rejected for event: ${providerEventId}`);
      return NextResponse.json(
        { error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    let envelope: RazorpayWebhookEnvelope;
    try {
      envelope = JSON.parse(rawBody);
    } catch (parseErr) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    const result = await processRazorpayWebhook({
      providerEventId,
      envelope,
      rawBody,
    });

    return NextResponse.json({
      received: true,
      status: result.status,
      eventType: result.eventType,
    });
  } catch (err: any) {
    console.error('[Razorpay Webhook] Internal server error:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Error processing webhook' },
      { status: 500 }
    );
  }
}

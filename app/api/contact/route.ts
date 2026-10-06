import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Simple in-memory rate limiter per IP (max 5 requests per 10 minutes)
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const isDev = process.env.NODE_ENV === 'development';
  const isLocal = ip === 'unknown' || ip === '127.0.0.1' || ip === '::1';
  const maxRequests = isDev || isLocal ? 100 : 15;

  const record = ipRequestMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count += 1;
  return false;
}

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (clientIp !== 'unknown' && isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes before submitting another inquiry.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { category, name, email, subject, message, website } = body;

    // Honeypot check: If bot fills the hidden website field, return fake success without sending
    if (website && typeof website === 'string' && website.trim().length > 0) {
      console.warn('[Contact API] Honeypot triggered. Silently dropping request.');
      return NextResponse.json({ success: true });
    }

    // Server-side validation
    const validCategories = ['Product Support', 'Billing Support', 'Procurement Help', 'Procurement Assistance'];
    if (!category || typeof category !== 'string' || !validCategories.includes(category.trim())) {
      return NextResponse.json(
        { error: 'Please select a valid inquiry category.' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Please enter a valid name (2 to 100 characters).' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.trim().length > 254) {
      return NextResponse.json(
        { error: 'Please enter a valid work email address.' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 200) {
      return NextResponse.json(
        { error: 'Please enter a subject (3 to 200 characters).' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
      return NextResponse.json(
        { error: 'Please provide a message between 10 and 5,000 characters.' },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[Contact API] RESEND_API_KEY is not configured in server environment.');
      return NextResponse.json(
        { error: 'Email service is currently misconfigured. Please contact support@rfpground.com directly.' },
        { status: 500 }
      );
    }

    const sanitizedCategory = category.trim();
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim();
    const sanitizedSubject = subject.trim();
    const sanitizedMessage = message.trim();

    const emailSubject = `[RFPGround Support] ${sanitizedSubject}`;
    const emailBody = [
      `RFPGround Support Inquiry`,
      `----------------------------------------`,
      `Category: ${sanitizedCategory}`,
      `Name:     ${sanitizedName}`,
      `Email:    ${sanitizedEmail}`,
      `Subject:  ${sanitizedSubject}`,
      ``,
      `Message:`,
      sanitizedMessage,
      ``,
      `----------------------------------------`,
      `Submitted via: RFPGround Contact Page`,
      `Client IP:     ${clientIp}`,
      `Timestamp:     ${new Date().toISOString()}`
    ].join('\n');

    // Deliver email via Resend REST API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RFPGround Support <support@rfpground.com>',
        to: ['support@rfpground.com'],
        reply_to: sanitizedEmail,
        subject: emailSubject,
        text: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text().catch(() => '');
      console.error(`[Contact API] Resend email delivery failed (${resendResponse.status}):`, errorText);
      return NextResponse.json(
        { error: 'Failed to deliver support email. Please email support@rfpground.com directly.' },
        { status: 502 }
      );
    }

    const resendData = await resendResponse.json().catch(() => ({}));
    console.log(`[Contact API] Support email successfully sent with Resend ID: ${resendData.id || 'ok'}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Contact API] Unexpected error handling support inquiry:', err);
    return NextResponse.json(
      { error: 'An unexpected server error occurred while sending your inquiry.' },
      { status: 500 }
    );
  }
}

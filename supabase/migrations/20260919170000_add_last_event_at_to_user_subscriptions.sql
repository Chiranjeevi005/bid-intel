-- ============================================================
-- Phase 2C Migration: Add last_event_at for Webhook Ordering
-- ============================================================

ALTER TABLE public.user_subscriptions
    ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_subscriptions.last_event_at IS
    'Timestamp of the latest processed Razorpay event (to_timestamp(event.created_at)). Used for monotonic webhook ordering.';

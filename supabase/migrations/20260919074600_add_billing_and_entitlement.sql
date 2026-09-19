-- ============================================================
-- Phase 2A: Billing & Entitlement Foundation
-- Migration: 20260919074600_add_billing_and_entitlement.sql
--
-- Evidence basis: Read-only reconnaissance of linked Supabase
-- project dcicrwkyxqacaronwato (PostgreSQL 17.6)
--
-- This migration creates ONLY new objects.
-- It does NOT create, alter, or drop any existing table.
-- It does NOT modify existing indexes, CHECK constraints,
-- or RLS policies.
-- ============================================================

-- ============================================================
-- 1. ENUM TYPE: subscription_plan
-- ============================================================

CREATE TYPE public.subscription_plan AS ENUM (
    'FREE',
    'PRO_GLOBAL',
    'PRO_INDIA'
);

-- ============================================================
-- 2. TABLE: user_subscriptions
-- ============================================================

CREATE TABLE public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan public.subscription_plan NOT NULL,
    status TEXT NOT NULL,
    currency TEXT NOT NULL,
    price_cents BIGINT NOT NULL,
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    razorpay_plan_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- FREE is the absence of a subscription, not a subscription record.
    -- The enum contains FREE for the ledger's plan_at_start column.
    CONSTRAINT chk_paid_subscription_plan CHECK (plan IN ('PRO_GLOBAL', 'PRO_INDIA'))
);

-- Invariant: at most one ACTIVE subscription per user
CREATE UNIQUE INDEX idx_one_active_subscription_per_user
    ON public.user_subscriptions (user_id)
    WHERE status = 'ACTIVE';

-- General lookup by user
CREATE INDEX idx_subscriptions_user_id
    ON public.user_subscriptions (user_id);

-- One subscription row per Razorpay subscription
CREATE UNIQUE INDEX idx_user_subscriptions_razorpay_subscription_id
    ON public.user_subscriptions (razorpay_subscription_id)
    WHERE razorpay_subscription_id IS NOT NULL;

-- ============================================================
-- 3. TABLE: user_usage (coordination / cache only)
--
-- This row exists solely for FOR UPDATE serialization and as a
-- denormalized counter cache. The ledger remains authoritative.
-- period_start/period_end on FREE users are coordination
-- metadata, NOT entitlement period data.
-- ============================================================

CREATE TABLE public.user_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    consumed BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. TABLE: analysis_entitlement_ledger
--
-- Authoritative source of quota accounting.
-- ============================================================

CREATE TABLE public.analysis_entitlement_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    analysis_run_id UUID NOT NULL REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    plan_at_start public.subscription_plan NOT NULL,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_at TIMESTAMPTZ,
    CONSTRAINT chk_ledger_status CHECK (status IN ('RESERVED', 'CONSUMED', 'RELEASED'))
);

-- One entitlement ledger entry per analysis run
CREATE UNIQUE INDEX idx_ledger_analysis_run_id
    ON public.analysis_entitlement_ledger (analysis_run_id);

-- Request idempotency: one ledger entry per (user, request)
CREATE UNIQUE INDEX idx_ledger_user_request_id
    ON public.analysis_entitlement_ledger (user_id, request_id);

-- One active RESERVED entitlement per document
CREATE UNIQUE INDEX idx_one_reservation_per_document
    ON public.analysis_entitlement_ledger (document_id)
    WHERE status = 'RESERVED';

-- Quota count queries
CREATE INDEX idx_ledger_user_id
    ON public.analysis_entitlement_ledger (user_id);

-- ============================================================
-- 5. TABLE: billing_events (audit trail)
--
-- Preserves billing history even when users, subscriptions,
-- or ledger entries are deleted (SET NULL FKs).
-- ============================================================

CREATE TABLE public.billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    ledger_id UUID REFERENCES public.analysis_entitlement_ledger(id) ON DELETE SET NULL,
    provider_event_id TEXT,
    event_type TEXT NOT NULL,
    amount_cents BIGINT,
    currency TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Internal finalization idempotency:
    -- each ledger entry gets at most one event per type
    CONSTRAINT uq_billing_event_per_ledger UNIQUE (ledger_id, event_type)
);

-- External webhook idempotency (e.g. Razorpay)
CREATE UNIQUE INDEX idx_billing_events_provider_event
    ON public.billing_events (provider_event_id)
    WHERE provider_event_id IS NOT NULL;

-- User event lookup
CREATE INDEX idx_billing_events_user_id
    ON public.billing_events (user_id);

-- ============================================================
-- 6. ROW-LEVEL SECURITY
--
-- Explicit even though rls_auto_enable() event trigger exists.
-- Only SELECT policies for authenticated users.
-- All mutations happen via service_role (bypasses RLS) or
-- SECURITY DEFINER RPCs (restricted to service_role).
-- ============================================================

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_entitlement_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own subscription
CREATE POLICY subscription_owner_read
    ON public.user_subscriptions
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated users can read their own usage
CREATE POLICY usage_owner_read
    ON public.user_usage
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Authenticated users can read their own ledger entries
CREATE POLICY ledger_owner_read
    ON public.analysis_entitlement_ledger
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- billing_events: NO authenticated policies.
-- Only service_role can read/write (bypasses RLS).

-- ============================================================
-- 7. FUNCTION: start_analysis_session
--
-- Entitlement gate. Creates analysis_runs + RESERVED ledger
-- entry atomically in one PostgreSQL transaction.
--
-- p_model is mandatory (no default) because analysis_runs.model
-- is NOT NULL. The caller must supply the actual configured model.
--
-- request_id idempotency: if a ledger entry with the given
-- request_id already exists, the function returns the existing
-- ledger_id without creating a duplicate run or consuming quota.
-- The UNIQUE index on request_id is the race-condition backstop.
-- ============================================================

CREATE OR REPLACE FUNCTION public.start_analysis_session(
    p_user_id UUID,
    p_document_id UUID,
    p_request_id UUID,
    p_model TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_subscription      public.user_subscriptions%ROWTYPE;
    v_usage             public.user_usage%ROWTYPE;
    v_plan              public.subscription_plan;
    v_sub_id            UUID;
    v_period_start      TIMESTAMPTZ;
    v_period_end        TIMESTAMPTZ;
    v_run_id            UUID;
    v_ledger_id         UUID;
    v_existing_doc_id   UUID;
    v_used_count        BIGINT;
    v_constraint_name   TEXT;
BEGIN
    -- --------------------------------------------------------
    -- 0. Validate model parameter
    -- --------------------------------------------------------
    IF p_model IS NULL OR btrim(p_model) = '' THEN
        RAISE EXCEPTION 'Analysis model is required';
    END IF;

    -- --------------------------------------------------------
    -- 1. Request idempotency: if this (user_id, request_id)
    --    already has a ledger entry, verify the document matches
    --    and return the existing ledger_id immediately.
    --    No duplicate run, no duplicate quota consumption.
    -- --------------------------------------------------------
    SELECT id, document_id
    INTO v_ledger_id, v_existing_doc_id
    FROM public.analysis_entitlement_ledger
    WHERE user_id = p_user_id
      AND request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_doc_id <> p_document_id THEN
            RAISE EXCEPTION
                'Request ID already belongs to a different document';
        END IF;

        RETURN v_ledger_id;
    END IF;

    -- --------------------------------------------------------
    -- 2. Verify document ownership
    -- --------------------------------------------------------
    PERFORM 1 FROM public.documents d
        WHERE d.id = p_document_id AND d.user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not owned by user';
    END IF;

    -- --------------------------------------------------------
    -- 3. Serialize concurrent reservations via user_usage row
    --    lock. Ensures at most one reservation attempt per user
    --    proceeds at a time.
    -- --------------------------------------------------------
    INSERT INTO public.user_usage (user_id, period_start, period_end, consumed)
    VALUES (p_user_id, now(), now() + INTERVAL '1 month', 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_usage FROM public.user_usage
        WHERE user_id = p_user_id FOR UPDATE;

    -- --------------------------------------------------------
    -- 4. Determine entitlement path (FREE vs PRO)
    --    FREE = no ACTIVE subscription row exists.
    --    PRO  = exactly one ACTIVE subscription (enforced by
    --           idx_one_active_subscription_per_user).
    --    The chk_paid_subscription_plan constraint guarantees
    --    no FREE rows can exist in user_subscriptions.
    -- --------------------------------------------------------
    SELECT * INTO v_subscription FROM public.user_subscriptions
        WHERE user_id = p_user_id AND status = 'ACTIVE'
        LIMIT 1;

    IF FOUND THEN
        -- PRO path
        v_plan         := v_subscription.plan;
        v_sub_id       := v_subscription.id;
        v_period_start := v_subscription.current_period_start;
        v_period_end   := v_subscription.current_period_end;

        -- Validate PRO period
        IF v_period_start IS NULL
           OR v_period_end IS NULL
           OR v_period_start >= v_period_end THEN
            RAISE EXCEPTION 'Invalid subscription period';
        END IF;

        -- Authoritative PRO quota from ledger
        SELECT COUNT(*) INTO v_used_count
        FROM public.analysis_entitlement_ledger
        WHERE user_id        = p_user_id
          AND plan_at_start  = v_plan
          AND subscription_id = v_sub_id
          AND period_start   = v_period_start
          AND period_end     = v_period_end
          AND status IN ('RESERVED', 'CONSUMED');

        IF v_used_count >= 15 THEN
            RAISE EXCEPTION 'PRO quota exceeded: 15 analyses per billing period';
        END IF;
    ELSE
        -- FREE path
        v_plan         := 'FREE';
        v_sub_id       := NULL;
        v_period_start := NULL;
        v_period_end   := NULL;

        -- Authoritative FREE quota from ledger (lifetime)
        SELECT COUNT(*) INTO v_used_count
        FROM public.analysis_entitlement_ledger
        WHERE user_id       = p_user_id
          AND plan_at_start = 'FREE'
          AND status IN ('RESERVED', 'CONSUMED');

        IF v_used_count >= 3 THEN
            RAISE EXCEPTION 'FREE quota exceeded: 3 lifetime analyses';
        END IF;
    END IF;

    -- --------------------------------------------------------
    -- 5. Create analysis_runs row (same transaction)
    --    analysis_runs already exists — we only INSERT into it.
    --    model is NOT NULL, so p_model is mandatory.
    -- --------------------------------------------------------
    INSERT INTO public.analysis_runs (document_id, status, model, started_at)
    VALUES (p_document_id, 'QUEUED', p_model, now())
    RETURNING id INTO v_run_id;

    -- --------------------------------------------------------
    -- 6. Create RESERVED ledger entry (same transaction)
    --    UNIQUE(user_id, request_id) is the race-condition
    --    backstop: if two concurrent calls with the same
    --    (user_id, request_id) both pass the idempotency check
    --    (step 1), the second INSERT will fail with
    --    unique_violation, caught below.
    -- --------------------------------------------------------
    INSERT INTO public.analysis_entitlement_ledger (
        user_id, document_id, analysis_run_id, request_id,
        plan_at_start, subscription_id, period_start, period_end,
        status
    )
    VALUES (
        p_user_id, p_document_id, v_run_id, p_request_id,
        v_plan, v_sub_id, v_period_start, v_period_end,
        'RESERVED'
    )
    RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;

EXCEPTION
    WHEN unique_violation THEN
        -- Deterministic constraint identification.
        -- GET STACKED DIAGNOSTICS extracts the exact constraint
        -- name that caused the violation, so we never infer.
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

        IF v_constraint_name = 'idx_ledger_user_request_id' THEN
            -- Race condition: another transaction committed the
            -- same (user_id, request_id) between our check
            -- (step 1) and this INSERT. Return the winner's
            -- ledger_id, with document_id verification.
            SELECT id, document_id
            INTO v_ledger_id, v_existing_doc_id
            FROM public.analysis_entitlement_ledger
            WHERE user_id = p_user_id
              AND request_id = p_request_id;

            IF FOUND THEN
                IF v_existing_doc_id <> p_document_id THEN
                    RAISE EXCEPTION
                        'Request ID already belongs to a different document';
                END IF;

                RETURN v_ledger_id;
            END IF;

            -- Should not reach here: the constraint fired but
            -- the row is gone (concurrent delete). Re-raise.
            RAISE;

        ELSIF v_constraint_name = 'idx_one_reservation_per_document' THEN
            RAISE EXCEPTION
                'An active analysis reservation already exists for this document';

        ELSE
            -- Unexpected unique violation — do not swallow.
            -- Re-raise with full PostgreSQL error context.
            RAISE;
        END IF;
END;
$$;

-- ============================================================
-- 8. FUNCTION: finalize_analysis_entitlement
--
-- Idempotent state machine:
--   RESERVED → CONSUMED   +1 entitlement, audit event
--   RESERVED → RELEASED   +0 entitlement, audit event
--   CONSUMED → CONSUMED   no-op (safe retry)
--   RELEASED → RELEASED   no-op (safe retry)
--   CONSUMED → RELEASED   ERROR
--   RELEASED → CONSUMED   ERROR
-- ============================================================

CREATE OR REPLACE FUNCTION public.finalize_analysis_entitlement(
    p_ledger_id UUID,
    p_success BOOLEAN,
    p_consumed BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_ledger public.analysis_entitlement_ledger%ROWTYPE;
BEGIN
    -- Lock the ledger row
    SELECT * INTO v_ledger FROM public.analysis_entitlement_ledger
        WHERE id = p_ledger_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ledger entry not found: %', p_ledger_id;
    END IF;

    -- State machine
    IF v_ledger.status = 'RESERVED' THEN
        IF p_consumed THEN
            -- RESERVED → CONSUMED
            UPDATE public.analysis_entitlement_ledger
            SET status = 'CONSUMED', finalized_at = now()
            WHERE id = p_ledger_id;

            -- Increment coordination counter (exactly once)
            UPDATE public.user_usage
            SET consumed = consumed + 1, updated_at = now()
            WHERE user_id = v_ledger.user_id;

            -- Audit event (idempotent via uq_billing_event_per_ledger)
            INSERT INTO public.billing_events (
                user_id, subscription_id, ledger_id,
                event_type, details
            ) VALUES (
                v_ledger.user_id,
                v_ledger.subscription_id,
                v_ledger.id,
                'ANALYSIS_CONSUMED',
                jsonb_build_object(
                    'request_id', v_ledger.request_id,
                    'success', p_success
                )
            ) ON CONFLICT (ledger_id, event_type) DO NOTHING;

        ELSE
            -- RESERVED → RELEASED
            UPDATE public.analysis_entitlement_ledger
            SET status = 'RELEASED', finalized_at = now()
            WHERE id = p_ledger_id;

            -- Audit event (idempotent)
            INSERT INTO public.billing_events (
                user_id, subscription_id, ledger_id,
                event_type, details
            ) VALUES (
                v_ledger.user_id,
                v_ledger.subscription_id,
                v_ledger.id,
                'ANALYSIS_RELEASED',
                jsonb_build_object(
                    'request_id', v_ledger.request_id,
                    'success', p_success
                )
            ) ON CONFLICT (ledger_id, event_type) DO NOTHING;
        END IF;

    ELSIF v_ledger.status = 'CONSUMED' THEN
        IF p_consumed THEN
            -- CONSUMED → CONSUMED: idempotent no-op
            RETURN;
        ELSE
            RAISE EXCEPTION
                'Cannot release a CONSUMED entitlement (ledger_id: %)',
                p_ledger_id;
        END IF;

    ELSIF v_ledger.status = 'RELEASED' THEN
        IF NOT p_consumed THEN
            -- RELEASED → RELEASED: idempotent no-op
            RETURN;
        ELSE
            RAISE EXCEPTION
                'Cannot consume a RELEASED entitlement (ledger_id: %)',
                p_ledger_id;
        END IF;
    END IF;
END;
$$;

-- ============================================================
-- 9. SECURITY: restrict RPC execution to service_role
--
-- Prevents browser clients from invoking entitlement RPCs
-- directly. The intended call path is:
--   Browser → server API route → service_role client → RPC
-- ============================================================

REVOKE ALL ON FUNCTION public.start_analysis_session(UUID, UUID, UUID, TEXT)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_analysis_session(UUID, UUID, UUID, TEXT)
    TO service_role;

-- Note: p_model has no default, so the 4-param signature is the
-- only overload. REVOKE/GRANT cover the complete function.

REVOKE ALL ON FUNCTION public.finalize_analysis_entitlement(UUID, BOOLEAN, BOOLEAN)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_analysis_entitlement(UUID, BOOLEAN, BOOLEAN)
    TO service_role;

-- ============================================================
-- END OF MIGRATION
-- ============================================================

-- Phase 1: matter lifecycle, engagement, and governance columns (contract-to-cash).
-- Idempotent; keeps demo-wide open RLS (no auth.uid() policies).

-- Extend matter_status for on-hold lifecycle
ALTER TYPE public.matter_status ADD VALUE IF NOT EXISTS 'on_hold';

DO $$ BEGIN
  CREATE TYPE public.matter_activation_status AS ENUM (
    'draft',
    'pending_activation',
    'active',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.matter_engagement_status AS ENUM (
    'not_started',
    'letter_sent',
    'signed',
    'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS activation_status public.matter_activation_status,
  ADD COLUMN IF NOT EXISTS engagement_status public.matter_engagement_status,
  ADD COLUMN IF NOT EXISTS billing_hold boolean,
  ADD COLUMN IF NOT EXISTS needs_partner_review boolean,
  ADD COLUMN IF NOT EXISTS partner_review_reason text;

-- Backfill existing rows before NOT NULL defaults
UPDATE public.matters
SET activation_status = CASE
  WHEN status::text IN ('closed', 'archived') THEN 'closed'::public.matter_activation_status
  WHEN status::text = 'on_hold' THEN 'pending_activation'::public.matter_activation_status
  ELSE 'active'::public.matter_activation_status
END
WHERE activation_status IS NULL;

UPDATE public.matters
SET engagement_status = CASE
  WHEN status::text IN ('closed', 'archived') THEN 'signed'::public.matter_engagement_status
  ELSE 'signed'::public.matter_engagement_status
END
WHERE engagement_status IS NULL;

UPDATE public.matters
SET billing_hold = COALESCE(billing_hold, false)
WHERE billing_hold IS NULL;

UPDATE public.matters
SET needs_partner_review = COALESCE(needs_partner_review, false)
WHERE needs_partner_review IS NULL;

-- Sync billing_hold from matter_accounting_profiles where matters row is still default false
UPDATE public.matters m
SET billing_hold = true
FROM public.matter_accounting_profiles p
WHERE p.matter_id = m.id
  AND p.billing_hold = true
  AND m.billing_hold = false;

ALTER TABLE public.matters
  ALTER COLUMN activation_status SET DEFAULT 'draft',
  ALTER COLUMN engagement_status SET DEFAULT 'not_started',
  ALTER COLUMN billing_hold SET DEFAULT false,
  ALTER COLUMN needs_partner_review SET DEFAULT false;

ALTER TABLE public.matters
  ALTER COLUMN activation_status SET NOT NULL,
  ALTER COLUMN engagement_status SET NOT NULL,
  ALTER COLUMN billing_hold SET NOT NULL,
  ALTER COLUMN needs_partner_review SET NOT NULL;

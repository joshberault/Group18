-- Phase 4: client field audit log + collections escalation stages (demo open RLS).

-- ---------------------------------------------------------------------------
-- Client audit events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

CREATE INDEX IF NOT EXISTS client_audit_events_client_idx
  ON public.client_audit_events (client_id, changed_at DESC);

ALTER TABLE public.client_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo read client audit" ON public.client_audit_events;
DROP POLICY IF EXISTS "Demo insert client audit" ON public.client_audit_events;

CREATE POLICY "Demo read client audit" ON public.client_audit_events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert client audit" ON public.client_audit_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.client_audit_events TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Collections escalation stages on invoices
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS escalation_stage text NOT NULL DEFAULT 'reminder',
  ADD COLUMN IF NOT EXISTS external_collections_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_collections_approved_by text,
  ADD COLUMN IF NOT EXISTS external_collections_approved_at timestamptz;

-- Payment idempotency + message delete-with-logging controls.
-- Excess over invoice balance must be handled as trust credit in app logic;
-- payments.amount itself cannot exceed remaining invoice capacity (existing trigger).

-- Minimal messages table when not already present (shared portal schema may add more columns later).
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  topic TEXT,
  sender_name TEXT NOT NULL,
  recipient_names TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE TABLE IF NOT EXISTS public.message_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'deleted', 'restored')),
  actor_name TEXT NOT NULL,
  reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.message_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo read message_audit_log" ON public.message_audit_log;
DROP POLICY IF EXISTS "Demo insert message_audit_log" ON public.message_audit_log;
CREATE POLICY "Demo read message_audit_log" ON public.message_audit_log FOR SELECT USING (true);
CREATE POLICY "Demo insert message_audit_log" ON public.message_audit_log FOR INSERT WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Demo read messages" ON public.messages;
DROP POLICY IF EXISTS "Demo insert messages" ON public.messages;
DROP POLICY IF EXISTS "Demo update messages" ON public.messages;
CREATE POLICY "Demo read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Demo insert messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Demo update messages" ON public.messages FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.prevent_message_hard_delete_without_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.message_audit_log mal
    WHERE mal.message_id = OLD.id
      AND mal.action = 'deleted'
  ) THEN
    RAISE EXCEPTION 'Messages cannot be deleted without logging. Record a deletion audit entry first.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_message_hard_delete ON public.messages;
CREATE TRIGGER trg_prevent_message_hard_delete
  BEFORE DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_message_hard_delete_without_log();

-- Idempotent payment processing: same reference_number cannot be posted twice.
CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_number_uidx
  ON public.payments (reference_number)
  WHERE reference_number IS NOT NULL AND btrim(reference_number) <> '';

DROP POLICY IF EXISTS "Demo insert trust_accounts" ON public.trust_accounts;
CREATE POLICY "Demo insert trust_accounts" ON public.trust_accounts FOR INSERT WITH CHECK (true);

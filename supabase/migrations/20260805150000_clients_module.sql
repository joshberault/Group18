-- Clients module (Joseph): extend shared clients stub without dropping columns.
-- Applied remotely via Supabase MCP; kept in repo for teammates.

DO $$ BEGIN
  CREATE TYPE public.client_type AS ENUM ('individual', 'company');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.client_record_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.conflict_check_status AS ENUM ('not_reviewed', 'pending', 'cleared', 'possible_conflict');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_number TEXT,
  ADD COLUMN IF NOT EXISTS client_type public.client_type,
  ADD COLUMN IF NOT EXISTS status public.client_record_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS conflict_check_status public.conflict_check_status NOT NULL DEFAULT 'not_reviewed',
  ADD COLUMN IF NOT EXISTS conflict_check_notes TEXT,
  ADD COLUMN IF NOT EXISTS conflict_checked_by TEXT,
  ADD COLUMN IF NOT EXISTS conflict_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS clients_client_number_key ON public.clients (client_number);
CREATE SEQUENCE IF NOT EXISTS public.clients_number_seq START WITH 1001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_client_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  n BIGINT;
BEGIN
  n := nextval('public.clients_number_seq');
  RETURN 'CL-' || n::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.clients_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_updated_at ON public.clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.clients_set_updated_at();

CREATE OR REPLACE FUNCTION public.clients_sync_legacy_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.client_type IS NULL THEN
    NEW.client_type := CASE WHEN COALESCE(NEW.is_company, FALSE) THEN 'company'::public.client_type ELSE 'individual'::public.client_type END;
  END IF;

  NEW.is_company := (NEW.client_type = 'company');

  IF NEW.client_type = 'company' THEN
    NEW.name := COALESCE(NULLIF(TRIM(NEW.company_name), ''), NEW.name);
  ELSE
    NEW.name := COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', NEW.first_name, NEW.last_name)), ''),
      NEW.name
    );
  END IF;

  NEW.conflict_flag := (NEW.conflict_check_status = 'possible_conflict');

  IF NEW.client_number IS NULL OR TRIM(NEW.client_number) = '' THEN
    NEW.client_number := public.next_client_number();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_sync_legacy ON public.clients;
CREATE TRIGGER clients_sync_legacy
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.clients_sync_legacy_fields();

CREATE TABLE IF NOT EXISTS public.client_schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'follow_up',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_schedule_events_date_idx ON public.client_schedule_events (event_date);
CREATE INDEX IF NOT EXISTS client_schedule_events_client_idx ON public.client_schedule_events (client_id);

ALTER TABLE public.client_schedule_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo read clients" ON public.clients;
DROP POLICY IF EXISTS "Demo insert clients" ON public.clients;
DROP POLICY IF EXISTS "Demo update clients" ON public.clients;
DROP POLICY IF EXISTS "Demo read client schedule" ON public.client_schedule_events;
DROP POLICY IF EXISTS "Demo insert client schedule" ON public.client_schedule_events;
DROP POLICY IF EXISTS "Demo update client schedule" ON public.client_schedule_events;
DROP POLICY IF EXISTS "Demo delete client schedule" ON public.client_schedule_events;

CREATE POLICY "Demo read clients" ON public.clients
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert clients" ON public.clients
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update clients" ON public.clients
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Demo read client schedule" ON public.client_schedule_events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert client schedule" ON public.client_schedule_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update client schedule" ON public.client_schedule_events
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo delete client schedule" ON public.client_schedule_events
  FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE ON public.clients TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_schedule_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.clients_number_seq TO anon, authenticated;

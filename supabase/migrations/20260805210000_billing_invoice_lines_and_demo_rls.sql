-- Shared invoice line items (time / expenses / write-downs) + reminder fields + demo RLS.
-- Matches clients-module demo access so Billing can use the publishable key in class demos.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS last_reminder_sent date,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_source_key_uidx
  ON public.invoices (source_key)
  WHERE source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoice_time_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  time_entry_id uuid REFERENCES public.time_entries(id) ON DELETE SET NULL,
  source_entry_key text,
  work_date date,
  attorney_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  hours numeric(10, 2) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  rate numeric(12, 2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_time_lines_invoice_id_idx
  ON public.invoice_time_lines (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_time_lines_time_entry_id_idx
  ON public.invoice_time_lines (time_entry_id)
  WHERE time_entry_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoice_expense_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  source_expense_id text,
  expense_date date,
  description text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_expense_lines_invoice_id_idx
  ON public.invoice_expense_lines (invoice_id);

CREATE TABLE IF NOT EXISTS public.invoice_write_down_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  source_entry_key text,
  write_down_date date,
  reason text NOT NULL DEFAULT '',
  amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_write_down_lines_invoice_id_idx
  ON public.invoice_write_down_lines (invoice_id);

ALTER TABLE public.invoice_time_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_expense_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_write_down_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Demo insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Demo update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Demo delete invoices" ON public.invoices;
CREATE POLICY "Demo read invoices" ON public.invoices
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert invoices" ON public.invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update invoices" ON public.invoices
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo delete invoices" ON public.invoices
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Demo read payments" ON public.payments;
DROP POLICY IF EXISTS "Demo insert payments" ON public.payments;
DROP POLICY IF EXISTS "Demo update payments" ON public.payments;
DROP POLICY IF EXISTS "Demo delete payments" ON public.payments;
CREATE POLICY "Demo read payments" ON public.payments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert payments" ON public.payments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update payments" ON public.payments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo delete payments" ON public.payments
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Demo all invoice_time_lines" ON public.invoice_time_lines;
DROP POLICY IF EXISTS "Demo all invoice_expense_lines" ON public.invoice_expense_lines;
DROP POLICY IF EXISTS "Demo all invoice_write_down_lines" ON public.invoice_write_down_lines;
CREATE POLICY "Demo all invoice_time_lines" ON public.invoice_time_lines
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo all invoice_expense_lines" ON public.invoice_expense_lines
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo all invoice_write_down_lines" ON public.invoice_write_down_lines
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_time_lines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_expense_lines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_write_down_lines TO anon, authenticated;

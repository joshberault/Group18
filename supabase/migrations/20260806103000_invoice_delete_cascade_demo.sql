-- Hard-delete invoices in demos: cascade payments/write_downs + demo RLS on write_downs.

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_invoice_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE public.write_downs
  DROP CONSTRAINT IF EXISTS write_downs_invoice_id_fkey;

ALTER TABLE public.write_downs
  ADD CONSTRAINT write_downs_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Demo select write_downs" ON public.write_downs;
DROP POLICY IF EXISTS "Demo insert write_downs" ON public.write_downs;
DROP POLICY IF EXISTS "Demo update write_downs" ON public.write_downs;
DROP POLICY IF EXISTS "Demo delete write_downs" ON public.write_downs;
CREATE POLICY "Demo select write_downs" ON public.write_downs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert write_downs" ON public.write_downs
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update write_downs" ON public.write_downs
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo delete write_downs" ON public.write_downs
  FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.write_downs TO anon, authenticated;

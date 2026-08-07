-- Demo RLS for workflow tables (matches clients/invoices demo pattern).
-- Allows class demos and seed scripts using the publishable key.

ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attorney_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo read matters" ON public.matters;
DROP POLICY IF EXISTS "Demo insert matters" ON public.matters;
DROP POLICY IF EXISTS "Demo update matters" ON public.matters;
DROP POLICY IF EXISTS "Demo delete matters" ON public.matters;
CREATE POLICY "Demo read matters" ON public.matters
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert matters" ON public.matters
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update matters" ON public.matters
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Demo delete matters" ON public.matters
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Demo all matter_assignments" ON public.matter_assignments;
CREATE POLICY "Demo all matter_assignments" ON public.matter_assignments
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Demo all time_entries" ON public.time_entries;
CREATE POLICY "Demo all time_entries" ON public.time_entries
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Demo all tasks" ON public.tasks;
CREATE POLICY "Demo all tasks" ON public.tasks
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Demo all deadlines" ON public.deadlines;
CREATE POLICY "Demo all deadlines" ON public.deadlines
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Demo all attorney_notes" ON public.attorney_notes;
CREATE POLICY "Demo all attorney_notes" ON public.attorney_notes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Demo all expense_submissions" ON public.expense_submissions;
CREATE POLICY "Demo all expense_submissions" ON public.expense_submissions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matters TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matter_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deadlines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attorney_notes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_submissions TO anon, authenticated;

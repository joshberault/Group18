-- Allow demo app (anon + authenticated publishable key) to manage matter assignments.
DROP POLICY IF EXISTS "Demo write matter_assignments" ON public.matter_assignments;
CREATE POLICY "Demo write matter_assignments"
  ON public.matter_assignments
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matter_assignments TO anon, authenticated;

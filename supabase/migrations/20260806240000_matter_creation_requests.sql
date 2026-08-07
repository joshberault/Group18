-- Managing Partner matter creation requests pending Firm Administrator approval.

CREATE TABLE IF NOT EXISTS public.matter_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  practice_area_id uuid REFERENCES public.practice_areas(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  billing_type public.billing_type NOT NULL DEFAULT 'hourly',
  hourly_rate numeric(10, 2),
  fixed_fee_amount numeric(12, 2),
  retainer_amount numeric(12, 2),
  expense_terms text,
  proposed_attorney_name text,
  submitted_by_name text NOT NULL,
  submitted_by_role text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matter_creation_requests_status_idx
  ON public.matter_creation_requests (status, created_at DESC);

ALTER TABLE public.matter_creation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo all matter_creation_requests" ON public.matter_creation_requests;
CREATE POLICY "Demo all matter_creation_requests" ON public.matter_creation_requests
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matter_creation_requests TO anon, authenticated;

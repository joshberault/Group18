-- Phase 3: engagement templates, structured terms, amendment versioning (demo open RLS).

CREATE TABLE IF NOT EXISTS public.engagement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_area_id UUID NOT NULL REFERENCES public.practice_areas(id) ON DELETE CASCADE,
  case_type TEXT,
  name TEXT NOT NULL,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('hourly', 'flat', 'contingency', 'retainer', 'hybrid')),
  hourly_rate NUMERIC(10, 2),
  flat_fee_amount NUMERIC(12, 2),
  scope_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  letter_body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_templates_practice_area
  ON public.engagement_templates (practice_area_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.engagement_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  version INT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (matter_id, version)
);

CREATE INDEX IF NOT EXISTS idx_engagement_amendments_matter
  ON public.engagement_amendments (matter_id, version DESC);

-- Seed templates (practice areas from attorney_workflow seed)
INSERT INTO public.engagement_templates (
  practice_area_id,
  case_type,
  name,
  fee_type,
  hourly_rate,
  flat_fee_amount,
  scope_checklist,
  letter_body,
  is_active
)
SELECT
  pa.id,
  seed.case_type,
  seed.name,
  seed.fee_type,
  seed.hourly_rate,
  seed.flat_fee_amount,
  seed.scope_checklist::jsonb,
  seed.letter_body,
  true
FROM (
  VALUES
    (
      'Corporate',
      'corporate_business_advisory',
      'Corporate General Advisory',
      'retainer',
      NULL::numeric,
      25000.00,
      '[{"id":"entity_review","label":"Entity structure review","default":true},{"id":"board_support","label":"Board and governance support","default":true},{"id":"contract_review","label":"Routine contract review","default":true},{"id":"compliance","label":"Regulatory compliance counseling","default":false}]',
      'This engagement letter confirms our representation of {{client_name}} in general corporate and business advisory matters. A retainer of {{flat_fee_amount}} is required before work commences. Scope is limited to matters described in the attached checklist unless otherwise agreed in writing.'
    ),
    (
      'Corporate',
      'mergers_and_acquisitions',
      'M&A Transaction — Flat Fee',
      'flat',
      NULL::numeric,
      45000.00,
      '[{"id":"due_diligence","label":"Legal due diligence","default":true},{"id":"purchase_agreement","label":"Draft/review purchase agreement","default":true},{"id":"closing","label":"Closing coordination","default":true},{"id":"post_closing","label":"Post-closing integration support","default":false}]',
      'We will represent {{client_name}} in the proposed transaction described as {{matter_title}}. This is a flat-fee engagement of {{flat_fee_amount}} covering the scope items checked below. Out-of-pocket expenses and third-party costs are billed separately.'
    ),
    (
      'Litigation',
      'commercial_litigation',
      'Commercial Litigation — Hourly',
      'hourly',
      350.00,
      NULL::numeric,
      '[{"id":"case_assessment","label":"Initial case assessment and strategy","default":true},{"id":"pleadings","label":"Pleadings and motion practice","default":true},{"id":"discovery","label":"Discovery management","default":true},{"id":"trial_prep","label":"Trial preparation and attendance","default":false}]',
      'We will represent {{client_name}} in {{matter_title}} on an hourly basis at {{hourly_rate}}/hour for attorneys and standard paralegal rates. This letter defines the scope of representation; matters outside the checked scope require a separate agreement.'
    ),
    (
      'Litigation',
      'personal_injury_plaintiff',
      'Plaintiff Contingency',
      'contingency',
      NULL::numeric,
      NULL::numeric,
      '[{"id":"investigation","label":"Case investigation and evaluation","default":true},{"id":"demand","label":"Demand and negotiation","default":true},{"id":"litigation","label":"Litigation through trial if necessary","default":true}]',
      'We will represent {{client_name}} on a contingency basis in {{matter_title}}. No fee is owed unless we recover compensation; our fee will be 35% of amounts recovered. Client is responsible for costs and expenses as described in the cost agreement.'
    ),
    (
      'Employment',
      'employment_counseling_employer',
      'Employment Counseling — Retainer',
      'retainer',
      NULL::numeric,
      15000.00,
      '[{"id":"handbook","label":"Employee handbook review","default":true},{"id":"terminations","label":"Termination and discipline guidance","default":true},{"id":"policies","label":"Policy drafting and updates","default":false}]',
      'We will provide employment counseling to {{client_name}} under a monthly retainer arrangement reflected by the retainer amount below. Work proceeds only after the retainer is received. Scope is limited to employer-side counseling unless litigation is separately engaged.'
    ),
    (
      'Real Estate',
      'commercial_real_estate',
      'Commercial Real Estate — Hourly',
      'hourly',
      275.00,
      NULL::numeric,
      '[{"id":"lease_review","label":"Lease review and negotiation","default":true},{"id":"title","label":"Title and survey coordination","default":true},{"id":"closing_docs","label":"Closing document preparation","default":true}]',
      'We will represent {{client_name}} in {{matter_title}} at {{hourly_rate}}/hour. Recording fees, title premiums, and third-party vendor charges are the client''s responsibility unless otherwise noted.'
    ),
    (
      'Real Estate',
      'real_estate_closings',
      'Residential Closing — Flat Fee',
      'flat',
      NULL::numeric,
      1500.00,
      '[{"id":"title_review","label":"Title commitment review","default":true},{"id":"closing_statement","label":"Closing statement preparation","default":true},{"id":"attendance","label":"Closing attendance","default":true}]',
      'We will handle the residential closing for {{client_name}} as described in {{matter_title}} for a flat fee of {{flat_fee_amount}}. Rush closings, title curative work, and lender-required revisions may incur additional fees.'
    ),
    (
      'Employment',
      'employment_litigation_employee',
      'Employment Litigation Defense — Hourly',
      'hourly',
      325.00,
      NULL::numeric,
      '[{"id":"response","label":"Responsive pleadings","default":true},{"id":"discovery","label":"Discovery responses and depositions","default":true},{"id":"mediation","label":"Mediation and settlement negotiations","default":true}]',
      'We will defend {{client_name}} in {{matter_title}} at {{hourly_rate}}/hour. This engagement does not include appellate work or representation in related administrative proceedings unless added by amendment.'
    )
) AS seed(practice_area, case_type, name, fee_type, hourly_rate, flat_fee_amount, scope_checklist, letter_body)
JOIN public.practice_areas pa ON pa.name = seed.practice_area
WHERE NOT EXISTS (
  SELECT 1 FROM public.engagement_templates et WHERE et.name = seed.name
);

-- Demo open RLS (migration_demo pattern)
ALTER TABLE public.engagement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_amendments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo read engagement_templates" ON public.engagement_templates;
DROP POLICY IF EXISTS "Demo insert engagement_templates" ON public.engagement_templates;
DROP POLICY IF EXISTS "Demo update engagement_templates" ON public.engagement_templates;
CREATE POLICY "Demo read engagement_templates" ON public.engagement_templates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert engagement_templates" ON public.engagement_templates
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update engagement_templates" ON public.engagement_templates
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Demo read engagement_amendments" ON public.engagement_amendments;
DROP POLICY IF EXISTS "Demo insert engagement_amendments" ON public.engagement_amendments;
DROP POLICY IF EXISTS "Demo update engagement_amendments" ON public.engagement_amendments;
CREATE POLICY "Demo read engagement_amendments" ON public.engagement_amendments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo insert engagement_amendments" ON public.engagement_amendments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo update engagement_amendments" ON public.engagement_amendments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.engagement_templates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.engagement_amendments TO anon, authenticated;

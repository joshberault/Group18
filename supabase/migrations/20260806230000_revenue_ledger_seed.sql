-- Revenue & General Ledger demo seed: chart of accounts, journal entries,
-- revenue recognition, and month-end close checklist.

-- ---------------------------------------------------------------------------
-- Chart of accounts
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type)
VALUES
  ('1010', 'Cash – Operating', 'Asset'),
  ('1050', 'Cash – Trust (IOLTA)', 'Asset'),
  ('1200', 'Accounts Receivable', 'Asset'),
  ('1350', 'Work in Process', 'Asset'),
  ('2010', 'Accounts Payable', 'Liability'),
  ('2100', 'Client Trust Liability', 'Liability'),
  ('2300', 'Deferred Revenue', 'Liability'),
  ('3000', 'Partner Equity', 'Equity'),
  ('4100', 'Legal Services Revenue', 'Revenue'),
  ('6200', 'Office Supplies', 'Expense'),
  ('6300', 'Professional Services', 'Expense'),
  ('6400', 'Payroll Expense', 'Expense')
ON CONFLICT (account_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Accounting period (August 2026)
-- ---------------------------------------------------------------------------
INSERT INTO public.accounting_periods (id, period_label, start_date, end_date, status)
VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'August 2026',
  '2026-08-01',
  '2026-08-31',
  'Open'
)
ON CONFLICT (period_label) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Journal entries (7 total, all created_by = Automatic)
-- ---------------------------------------------------------------------------
INSERT INTO public.journal_entries (
  id, entry_number, entry_date, description, status,
  total_debit, total_credit, created_by, posted_at, source_type
)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'JE-2026-0842',
    '2026-08-04',
    'August client receipt – Kingsley Orthopedics',
    'Posted',
    22400.00, 22400.00,
    'Automatic',
    '2026-08-04T16:00:00Z',
    'demo_seed'
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'JE-2026-0841',
    '2026-08-03',
    'WIP accrual – Kingsley Physician Agreement flat fee',
    'Posted',
    8400.00, 8400.00,
    'Automatic',
    '2026-08-03T16:00:00Z',
    'demo_seed'
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'JE-2026-0840',
    '2026-08-02',
    'Office supplies expense allocation',
    'Draft',
    1250.00, 1250.00,
    'Automatic',
    NULL,
    'demo_seed'
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'JE-2026-0839',
    '2026-08-01',
    'Trust transfer to operating',
    'Posted',
    2200.00, 2200.00,
    'Automatic',
    '2026-08-01T16:00:00Z',
    'demo_seed'
  ),
  (
    '11111111-1111-4111-8111-111111111105',
    'JE-2026-0838',
    '2026-07-31',
    'July payroll accrual',
    'Posted',
    18600.00, 18600.00,
    'Automatic',
    '2026-07-31T16:00:00Z',
    'demo_seed'
  ),
  (
    '11111111-1111-4111-8111-111111111106',
    'JE-2026-0837',
    '2026-07-30',
    'Professional services – expert witness invoice',
    'Draft',
    4200.00, 4200.00,
    'Automatic',
    NULL,
    'demo_seed'
  ),
  (
    '11111111-1111-4111-8111-111111111107',
    'JE-2026-0836',
    '2026-07-29',
    'Deferred revenue recognition – Santos retainer',
    'Posted',
    3750.00, 3750.00,
    'Automatic',
    '2026-07-29T16:00:00Z',
    'demo_seed'
  )
ON CONFLICT (entry_number) DO UPDATE SET
  entry_date = EXCLUDED.entry_date,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  total_debit = EXCLUDED.total_debit,
  total_credit = EXCLUDED.total_credit,
  created_by = EXCLUDED.created_by,
  posted_at = EXCLUDED.posted_at,
  source_type = EXCLUDED.source_type;

DELETE FROM public.journal_entry_lines
WHERE journal_entry_id IN (
  SELECT id FROM public.journal_entries WHERE source_type = 'demo_seed'
);

INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
VALUES
  -- JE-2026-0842
  ('11111111-1111-4111-8111-111111111101', '1010', 'Cash – Operating', 'Client payment received', 22400.00, 0, 1),
  ('11111111-1111-4111-8111-111111111101', '1200', 'Accounts Receivable', 'Apply to INV-2847', 0, 22400.00, 2),
  -- JE-2026-0841
  ('11111111-1111-4111-8111-111111111102', '1350', 'Work in Process', 'Unbilled WIP accrual', 8400.00, 0, 1),
  ('11111111-1111-4111-8111-111111111102', '4100', 'Legal Services Revenue', 'Revenue recognition', 0, 8400.00, 2),
  -- JE-2026-0840
  ('11111111-1111-4111-8111-111111111103', '6200', 'Office Supplies', 'Q3 supply order', 1250.00, 0, 1),
  ('11111111-1111-4111-8111-111111111103', '2010', 'Accounts Payable', 'Vendor invoice pending', 0, 1250.00, 2),
  -- JE-2026-0839
  ('11111111-1111-4111-8111-111111111104', '1010', 'Cash – Operating', 'Trust fee transfer', 2200.00, 0, 1),
  ('11111111-1111-4111-8111-111111111104', '2100', 'Client Trust Liability', 'Reduce trust liability', 0, 2200.00, 2),
  -- JE-2026-0838
  ('11111111-1111-4111-8111-111111111105', '6400', 'Payroll Expense', 'July payroll accrual', 18600.00, 0, 1),
  ('11111111-1111-4111-8111-111111111105', '2010', 'Accounts Payable', 'Payroll liability', 0, 18600.00, 2),
  -- JE-2026-0837
  ('11111111-1111-4111-8111-111111111106', '6300', 'Professional Services', 'Expert witness fees', 4200.00, 0, 1),
  ('11111111-1111-4111-8111-111111111106', '2010', 'Accounts Payable', 'Vendor invoice pending', 0, 4200.00, 2),
  -- JE-2026-0836
  ('11111111-1111-4111-8111-111111111107', '2300', 'Deferred Revenue', 'Release deferred retainer', 3750.00, 0, 1),
  ('11111111-1111-4111-8111-111111111107', '4100', 'Legal Services Revenue', 'Retainer revenue recognition', 0, 3750.00, 2);

-- ---------------------------------------------------------------------------
-- Revenue recognition (client + matter populated from existing seed data)
-- ---------------------------------------------------------------------------
DELETE FROM public.revenue_recognition_items
WHERE period_label = 'August 2026';

INSERT INTO public.revenue_recognition_items (
  client_id,
  matter_id,
  invoice_number,
  invoice_date,
  total_amount,
  recognized_amount,
  deferred_amount,
  recognition_method,
  status,
  period_label
)
SELECT
  c.id,
  m.id,
  v.invoice_number,
  v.invoice_date::date,
  v.total_amount,
  v.recognized_amount,
  v.deferred_amount,
  v.recognition_method,
  v.status,
  'August 2026'
FROM (
  VALUES
    ('Kingsley Orthopedics', 'Kingsley Physician Agreement', 'INV-2890', '2026-07-15', 45000.00, 29400.00, 15600.00, 'Flat Fee', 'Partial'),
    ('Harrison & Wells LLP', 'Harrison Wells Office Lease', 'INV-2847', '2026-06-20', 48200.00, 48200.00, 0, 'Accrual', 'Recognized'),
    ('Grace Nguyen', 'Nguyen Executive Separation', 'INV-2901', '2026-07-28', 36850.00, 14200.00, 22650.00, 'Accrual', 'Deferred'),
    ('Foxtail Retail Group', 'Foxtail Vendor Contract Review', 'INV-2918', '2026-08-01', 22800.00, 0, 22800.00, 'Milestone', 'Pending'),
    ('Elena Park', 'Park v. Metro Transit — Personal Injury', 'INV-2915', '2026-07-22', 18400.00, 18400.00, 0, 'Cash', 'Recognized')
) AS v(client_name, matter_title, invoice_number, invoice_date, total_amount, recognized_amount, deferred_amount, recognition_method, status)
JOIN public.clients c
  ON c.name = v.client_name OR c.company_name = v.client_name
JOIN public.matters m
  ON m.client_id = c.id AND m.title = v.matter_title;

-- ---------------------------------------------------------------------------
-- Month-end close checklist
-- ---------------------------------------------------------------------------
DELETE FROM public.month_end_close_tasks
WHERE period_id = (
  SELECT id FROM public.accounting_periods WHERE period_label = 'August 2026' LIMIT 1
);

INSERT INTO public.month_end_close_tasks (
  period_id, task, category, assignee, due_date, status, dependencies
)
SELECT
  p.id,
  t.task,
  t.category,
  t.assignee,
  t.due_date::date,
  t.status,
  t.dependencies
FROM public.accounting_periods p
CROSS JOIN (
  VALUES
    ('Reconcile all trust accounts', 'Trust', 'Alex Morgan', '2026-08-05', 'Complete', ARRAY[]::text[]),
    ('Reconcile operating bank accounts', 'Banking', 'Alex Morgan', '2026-08-05', 'In Progress', ARRAY[]::text[]),
    ('Post WIP accrual entries', 'Revenue', 'Alex Morgan', '2026-08-06', 'In Progress', ARRAY['Reconcile operating bank accounts']::text[]),
    ('Review deferred revenue schedule', 'Revenue', 'Alex Morgan', '2026-08-06', 'Not Started', ARRAY['Post WIP accrual entries']::text[]),
    ('Accrue unbilled expenses', 'Expenses', 'Alex Morgan', '2026-08-07', 'Not Started', ARRAY[]::text[]),
    ('Run trial balance', 'GL', 'Alex Morgan', '2026-08-07', 'Blocked', ARRAY['Post WIP accrual entries', 'Review deferred revenue schedule', 'Accrue unbilled expenses']::text[]),
    ('Partner equity allocation', 'GL', 'Robert Morgan', '2026-08-08', 'Not Started', ARRAY['Run trial balance']::text[]),
    ('Generate P&L draft', 'Reporting', 'Alex Morgan', '2026-08-08', 'Not Started', ARRAY['Run trial balance']::text[]),
    ('Generate balance sheet draft', 'Reporting', 'Alex Morgan', '2026-08-08', 'Not Started', ARRAY['Run trial balance']::text[]),
    ('Review AP aging', 'AP', 'Alex Morgan', '2026-08-06', 'Complete', ARRAY[]::text[]),
    ('Lock accounting period', 'Administration', 'Alex Morgan', '2026-08-09', 'Not Started', ARRAY['Partner equity allocation', 'Generate P&L draft', 'Generate balance sheet draft']::text[]),
    ('Archive close documentation', 'Administration', 'Alex Morgan', '2026-08-09', 'Not Started', ARRAY['Lock accounting period']::text[]),
    ('Notify partners of close completion', 'Administration', 'Alex Morgan', '2026-08-10', 'Not Started', ARRAY['Lock accounting period']::text[])
) AS t(task, category, assignee, due_date, status, dependencies)
WHERE p.period_label = 'August 2026';

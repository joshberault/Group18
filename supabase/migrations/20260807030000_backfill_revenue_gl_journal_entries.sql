-- Backfill revenue recognition and GL journal entries (Accounting Manager demo).
-- Kingsley WIP excluded — JE-2026-0841 already accrues that matter.

BEGIN;

UPDATE public.journal_entries
SET status = 'Posted', posted_at = COALESCE(posted_at, NOW())
WHERE entry_number IN ('JE-2026-0837', 'JE-2026-0840')
  AND status = 'Draft';

-- JE-2026-0843: approved unbilled WIP (Lumen, Stone, Jade — 13410.00)
WITH je AS (
  INSERT INTO public.journal_entries (
    id, entry_number, entry_date, description, status,
    total_debit, total_credit, created_by, posted_at, source_type
  ) VALUES (
    'cccc0843-0001-4001-8001-000000000043',
    'JE-2026-0843', '2026-08-06',
    'WIP accrual — approved unbilled time (Lumen, Stone, Jade)',
    'Posted', 13410.00, 13410.00, 'Alex Morgan', NOW(), 'wip_accrual'
  )
  ON CONFLICT (entry_number) DO NOTHING
  RETURNING id
)
INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
SELECT id, '1350', 'Work in Process', 'Unbilled approved billable time', 13410.00, 0, 1 FROM je
UNION ALL
SELECT id, '4100', 'Legal Services Revenue', 'Unbilled approved billable time', 0, 13410.00, 2 FROM je;

-- JE-2026-0844: invoice CF-2026-0111 billing
WITH je AS (
  INSERT INTO public.journal_entries (
    id, entry_number, entry_date, description, status,
    total_debit, total_credit, created_by, posted_at, source_type, source_id
  ) VALUES (
    'cccc0844-0001-4001-8001-000000000044',
    'JE-2026-0844', '2026-08-01',
    'Invoice billing — CF-2026-0111',
    'Posted', 4550.00, 4550.00, 'Alex Morgan', NOW(), 'invoice',
    'ffff0111-0001-4001-8001-000000000011'
  )
  ON CONFLICT (entry_number) DO NOTHING
  RETURNING id
)
INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
SELECT id, '1200', 'Accounts Receivable', 'CF-2026-0111 legal services', 4550.00, 0, 1 FROM je
UNION ALL
SELECT id, '4100', 'Legal Services Revenue', 'CF-2026-0111 legal services', 0, 4550.00, 2 FROM je;

-- JE-2026-0845: invoice CF-2026-0112 billing
WITH je AS (
  INSERT INTO public.journal_entries (
    id, entry_number, entry_date, description, status,
    total_debit, total_credit, created_by, posted_at, source_type, source_id
  ) VALUES (
    'cccc0845-0001-4001-8001-000000000045',
    'JE-2026-0845', '2026-08-02',
    'Invoice billing — CF-2026-0112',
    'Posted', 6200.00, 6200.00, 'Alex Morgan', NOW(), 'invoice',
    'ffff0112-0001-4001-8001-000000000012'
  )
  ON CONFLICT (entry_number) DO NOTHING
  RETURNING id
)
INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
SELECT id, '1200', 'Accounts Receivable', 'CF-2026-0112 legal services', 6200.00, 0, 1 FROM je
UNION ALL
SELECT id, '4100', 'Legal Services Revenue', 'CF-2026-0112 legal services', 0, 6200.00, 2 FROM je;

-- JE-2026-0846: invoice CF-2026-0113 billing
WITH je AS (
  INSERT INTO public.journal_entries (
    id, entry_number, entry_date, description, status,
    total_debit, total_credit, created_by, posted_at, source_type, source_id
  ) VALUES (
    'cccc0846-0001-4001-8001-000000000046',
    'JE-2026-0846', '2026-08-03',
    'Invoice billing — CF-2026-0113',
    'Posted', 5100.00, 5100.00, 'Alex Morgan', NOW(), 'invoice',
    'ffff0113-0001-4001-8001-000000000013'
  )
  ON CONFLICT (entry_number) DO NOTHING
  RETURNING id
)
INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
SELECT id, '1200', 'Accounts Receivable', 'CF-2026-0113 legal services', 5100.00, 0, 1 FROM je
UNION ALL
SELECT id, '4100', 'Legal Services Revenue', 'CF-2026-0113 legal services', 0, 5100.00, 2 FROM je;

-- JE-2026-0847: partial payment CF-2026-0113
WITH je AS (
  INSERT INTO public.journal_entries (
    id, entry_number, entry_date, description, status,
    total_debit, total_credit, created_by, posted_at, source_type, source_id
  ) VALUES (
    'cccc0847-0001-4001-8001-000000000047',
    'JE-2026-0847', '2026-08-04',
    'Client payment — CF-2026-0113 (partial)',
    'Posted', 3000.00, 3000.00, 'Alex Morgan', NOW(), 'payment',
    'dddd0113-0001-4001-8001-000000000013'
  )
  ON CONFLICT (entry_number) DO NOTHING
  RETURNING id
)
INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
SELECT id, '1010', 'Cash – Operating', 'ACH payment CF-2026-0113', 3000.00, 0, 1 FROM je
UNION ALL
SELECT id, '1200', 'Accounts Receivable', 'ACH payment CF-2026-0113', 0, 3000.00, 2 FROM je;

-- JE-2026-0848: recognize deferred revenue INV-2918
WITH je AS (
  INSERT INTO public.journal_entries (
    id, entry_number, entry_date, description, status,
    total_debit, total_credit, created_by, posted_at, source_type, source_id
  ) VALUES (
    'cccc0848-0001-4001-8001-000000000048',
    'JE-2026-0848', '2026-08-05',
    'Revenue recognition — INV-2918',
    'Posted', 22800.00, 22800.00, 'Alex Morgan', NOW(), 'revenue_recognition',
    '28113d45-666f-412b-8437-fc62361c804d'
  )
  ON CONFLICT (entry_number) DO NOTHING
  RETURNING id
)
INSERT INTO public.journal_entry_lines (
  journal_entry_id, account_code, account_name, description, debit, credit, sort_order
)
SELECT id, '2300', 'Deferred Revenue', 'Release deferred revenue INV-2918', 22800.00, 0, 1 FROM je
UNION ALL
SELECT id, '4100', 'Legal Services Revenue', 'Recognize revenue INV-2918', 0, 22800.00, 2 FROM je;

UPDATE public.revenue_recognition_items
SET
  status = 'Recognized',
  recognized_amount = 22800.00,
  deferred_amount = 0
WHERE id = '28113d45-666f-412b-8437-fc62361c804d'
  AND invoice_number = 'INV-2918';

COMMIT;

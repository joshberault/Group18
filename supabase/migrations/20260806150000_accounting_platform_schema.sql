-- CounselFlow accounting platform: shared tables for AM workspace + cross-role integration.
-- Additive only. Demo RLS matches existing billing/clients pattern for class demos.

-- ---------------------------------------------------------------------------
-- Prospective clients (engagements intake — separate from cleared clients)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospective_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  entity_type text NOT NULL DEFAULT 'individual',
  status text NOT NULL DEFAULT 'prospect',
  primary_email text,
  primary_phone text,
  referral_source text,
  conflict_status text NOT NULL DEFAULT 'not_reviewed',
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Client accounting extensions (financial profile — keyed to shared clients)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_accounting_profiles (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  responsible_partner text,
  office text,
  billing_preferences text,
  payment_status text NOT NULL DEFAULT 'Current',
  risk_level text NOT NULL DEFAULT 'Green',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Matter accounting extensions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matter_accounting_profiles (
  matter_id uuid PRIMARY KEY REFERENCES public.matters(id) ON DELETE CASCADE,
  billing_attorney text,
  office text,
  budget numeric(14, 2) NOT NULL DEFAULT 0,
  billed_to_date numeric(14, 2) NOT NULL DEFAULT 0,
  collected_to_date numeric(14, 2) NOT NULL DEFAULT 0,
  margin_percent numeric(6, 2) NOT NULL DEFAULT 0,
  financial_status text NOT NULL DEFAULT 'On Track',
  billing_hold boolean NOT NULL DEFAULT false,
  minimum_retainer numeric(14, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Invoices / payments (create if missing — billing module depends on these)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  billing_type text NOT NULL DEFAULT 'hourly',
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal_time numeric(14, 2) NOT NULL DEFAULT 0,
  subtotal_expenses numeric(14, 2) NOT NULL DEFAULT 0,
  subtotal_fees numeric(14, 2) NOT NULL DEFAULT 0,
  retainer_applied numeric(14, 2) NOT NULL DEFAULT 0,
  tax_amount numeric(14, 2) NOT NULL DEFAULT 0,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  amount_paid numeric(14, 2) NOT NULL DEFAULT 0,
  amount_written_down numeric(14, 2) NOT NULL DEFAULT 0,
  balance_due numeric(14, 2) NOT NULL DEFAULT 0,
  notes text,
  source_key text,
  last_reminder_sent date,
  reminder_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_key ON public.invoices (invoice_number);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'check',
  status text NOT NULL DEFAULT 'completed',
  reference_number text,
  allocated_amount numeric(14, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, invoice_id)
);

CREATE TABLE IF NOT EXISTS public.write_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  requested_by text,
  reviewed_by text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.collection_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note text NOT NULL,
  next_follow_up date,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Trust
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_type text NOT NULL DEFAULT 'IOLTA',
  office text,
  balance numeric(14, 2) NOT NULL DEFAULT 0,
  ledger_balance numeric(14, 2) NOT NULL DEFAULT 0,
  client_balance numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  last_reconciled date,
  reconciliation_status text NOT NULL DEFAULT 'Balanced',
  variance numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trust_client_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES public.trust_accounts(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  balance numeric(14, 2) NOT NULL DEFAULT 0,
  minimum_retainer numeric(14, 2) NOT NULL DEFAULT 0,
  retainer_status text NOT NULL DEFAULT 'Sufficient',
  last_activity date,
  attorney text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trust_account_id, client_id, matter_id)
);

CREATE TABLE IF NOT EXISTS public.trust_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES public.trust_accounts(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL,
  reference_number text,
  description text NOT NULL DEFAULT '',
  amount numeric(14, 2) NOT NULL,
  running_balance numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Posted',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trust_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid REFERENCES public.trust_accounts(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  exception_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(14, 2) NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'Medium',
  days_open integer NOT NULL DEFAULT 0,
  assigned_to text,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trust_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id uuid NOT NULL REFERENCES public.trust_accounts(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  bank_balance numeric(14, 2) NOT NULL DEFAULT 0,
  book_balance numeric(14, 2) NOT NULL DEFAULT 0,
  client_ledger_total numeric(14, 2) NOT NULL DEFAULT 0,
  variance numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending Review',
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- General ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text NOT NULL UNIQUE,
  account_name text NOT NULL,
  account_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL UNIQUE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Draft',
  total_debit numeric(14, 2) NOT NULL DEFAULT 0,
  total_credit numeric(14, 2) NOT NULL DEFAULT 0,
  created_by text,
  posted_at timestamptz,
  source_type text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  account_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  debit numeric(14, 2) NOT NULL DEFAULT 0,
  credit numeric(14, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.revenue_recognition_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number text,
  invoice_date date,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  recognized_amount numeric(14, 2) NOT NULL DEFAULT 0,
  deferred_amount numeric(14, 2) NOT NULL DEFAULT 0,
  recognition_method text NOT NULL DEFAULT 'Accrual',
  status text NOT NULL DEFAULT 'Pending',
  period_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_label text NOT NULL UNIQUE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  closed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.month_end_close_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  task text NOT NULL,
  category text NOT NULL DEFAULT 'Close',
  assignee text,
  due_date date,
  status text NOT NULL DEFAULT 'Not Started',
  dependencies text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Banking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_type text NOT NULL DEFAULT 'Operating',
  office text,
  balance numeric(14, 2) NOT NULL DEFAULT 0,
  available_balance numeric(14, 2) NOT NULL DEFAULT 0,
  last_reconciled date,
  reconciliation_status text NOT NULL DEFAULT 'Not Started',
  unreconciled_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL,
  payee text NOT NULL DEFAULT '',
  reference_number text,
  description text NOT NULL DEFAULT '',
  amount numeric(14, 2) NOT NULL,
  cleared boolean NOT NULL DEFAULT false,
  category text,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  statement_balance numeric(14, 2) NOT NULL DEFAULT 0,
  book_balance numeric(14, 2) NOT NULL DEFAULT 0,
  cleared_deposits numeric(14, 2) NOT NULL DEFAULT 0,
  cleared_withdrawals numeric(14, 2) NOT NULL DEFAULT 0,
  outstanding_checks numeric(14, 2) NOT NULL DEFAULT 0,
  outstanding_deposits numeric(14, 2) NOT NULL DEFAULT 0,
  variance numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Not Started',
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Accounts payable
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  contact_name text,
  email text,
  phone text,
  payment_terms text,
  total_outstanding numeric(14, 2) NOT NULL DEFAULT 0,
  ytd_spend numeric(14, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending Approval',
  approver text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_bills_bill_number_key ON public.vendor_bills (bill_number);

CREATE TABLE IF NOT EXISTS public.ap_payment_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_bill_id uuid NOT NULL REFERENCES public.vendor_bills(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL,
  due_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'ACH',
  requested_by text,
  status text NOT NULL DEFAULT 'Pending',
  priority text NOT NULL DEFAULT 'Normal',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reimbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL,
  submit_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  category text,
  matter_id uuid REFERENCES public.matters(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  receipt_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Submitted',
  approver text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Audit + administration settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  actor_name text NOT NULL,
  actor_role text,
  module text NOT NULL,
  action text NOT NULL,
  record_type text NOT NULL,
  record_id text NOT NULL,
  description text NOT NULL DEFAULT '',
  risk_level text NOT NULL DEFAULT 'Low',
  ip_or_session text,
  review_status text NOT NULL DEFAULT 'Unreviewed',
  flagged boolean NOT NULL DEFAULT false,
  review_note text,
  before_value text,
  after_value text,
  reason text,
  related_record text,
  source_module text
);

CREATE TABLE IF NOT EXISTS public.accounting_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Demo RLS (matches invoices migration pattern)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prospective_clients','client_accounting_profiles','matter_accounting_profiles',
    'payment_allocations','write_off_requests','collection_notes',
    'trust_accounts','trust_client_ledgers','trust_transactions','trust_exceptions','trust_reconciliations',
    'chart_of_accounts','journal_entries','journal_entry_lines','revenue_recognition_items',
    'accounting_periods','month_end_close_tasks',
    'bank_accounts','bank_transactions','bank_reconciliations',
    'vendors','vendor_bills','ap_payment_approvals','reimbursements',
    'audit_events','accounting_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Demo all %1$s" ON public.%1$I', t);
    EXECUTE format(
      'CREATE POLICY "Demo all %1$s" ON public.%1$I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
  END LOOP;
END $$;

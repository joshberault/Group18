-- Billing, Accounting & Analytics — Contract-to-Cash Extension
-- Creates: invoices, payments, expenses, write_downs, trust_accounts
-- Plus: trust_account_balances view and validation triggers

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'sent',
  'partial',
  'paid',
  'overdue',
  'disputed',
  'void',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'completed',
  'partial',
  'disputed',
  'reversed',
  'refunded'
);

CREATE TYPE public.payment_method AS ENUM (
  'check',
  'ach',
  'wire',
  'credit_card',
  'trust_transfer',
  'cash',
  'other'
);

CREATE TYPE public.expense_category AS ENUM (
  'materials',
  'vendor_fees',
  'court_costs',
  'travel',
  'reimbursable',
  'other'
);

CREATE TYPE public.expense_record_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'billed',
  'paid'
);

CREATE TYPE public.write_down_reason AS ENUM (
  'partner_write_off',
  'client_dispute',
  'billing_error',
  'courtesy_adjustment',
  'collections_impairment',
  'other'
);

CREATE TYPE public.trust_transaction_type AS ENUM (
  'deposit',
  'withdrawal',
  'invoice_application',
  'refund',
  'transfer_in',
  'transfer_out',
  'adjustment'
);

-- -----------------------------------------------------------------------------
-- 1. invoices
-- -----------------------------------------------------------------------------

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  matter_id UUID NOT NULL
    REFERENCES public.matters(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL
    REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,

  invoice_number TEXT NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',

  billing_type public.billing_type NOT NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  subtotal_time NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (subtotal_time >= 0),
  subtotal_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (subtotal_expenses >= 0),
  subtotal_fees NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (subtotal_fees >= 0),
  retainer_applied NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (tax_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL,

  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (amount_paid >= 0),
  amount_written_down NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (amount_written_down >= 0),
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,

  notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number),

  CONSTRAINT invoices_total_components_sum_check CHECK (
    total_amount >= 0
    AND total_amount = subtotal_time + subtotal_expenses + subtotal_fees + tax_amount - retainer_applied
  ),

  CONSTRAINT invoices_balance_due_reconciliation_check CHECK (
    balance_due >= 0
    AND balance_due = total_amount - amount_paid - amount_written_down
  ),

  CONSTRAINT invoices_retainer_billing_type_check CHECK (
    retainer_applied >= 0
    AND (retainer_applied = 0 OR billing_type IN ('retainer', 'hourly'))
  )
);

CREATE INDEX invoices_matter_id_idx ON public.invoices (matter_id);
CREATE INDEX invoices_client_id_idx ON public.invoices (client_id);
CREATE INDEX invoices_status_idx ON public.invoices (status);
CREATE INDEX invoices_due_date_idx ON public.invoices (due_date);
CREATE INDEX invoices_invoice_date_idx ON public.invoices (invoice_date);

COMMENT ON TABLE public.invoices IS
  'Billable invoices for matters. Snapshots billing_type and client at issuance for audit.';
COMMENT ON COLUMN public.invoices.client_id IS
  'Denormalized client snapshot — preserved even if matter metadata changes later.';
COMMENT ON COLUMN public.invoices.retainer_applied IS
  'Trust/retainer funds applied against this invoice (reduces amount due).';

-- -----------------------------------------------------------------------------
-- 2. payments
-- -----------------------------------------------------------------------------

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  invoice_id UUID NOT NULL
    REFERENCES public.invoices(id) ON DELETE RESTRICT,
  matter_id UUID NOT NULL
    REFERENCES public.matters(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL
    REFERENCES public.clients(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,

  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount > 0),
  payment_method public.payment_method NOT NULL DEFAULT 'check',
  status public.payment_status NOT NULL DEFAULT 'pending',

  reference_number TEXT,
  notes TEXT,

  trust_account_entry_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX payments_invoice_id_idx ON public.payments (invoice_id);
CREATE INDEX payments_matter_id_idx ON public.payments (matter_id);
CREATE INDEX payments_client_id_idx ON public.payments (client_id);
CREATE INDEX payments_status_idx ON public.payments (status);
CREATE INDEX payments_payment_date_idx ON public.payments (payment_date);

COMMENT ON TABLE public.payments IS
  'Cash receipts applied to invoices. matter_id and client_id denormalized for analytics.';

-- -----------------------------------------------------------------------------
-- 3. expenses
-- -----------------------------------------------------------------------------

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  matter_id UUID NOT NULL
    REFERENCES public.matters(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,

  expense_submission_id UUID
    REFERENCES public.expense_submissions(id) ON DELETE SET NULL,

  invoice_id UUID
    REFERENCES public.invoices(id) ON DELETE SET NULL,

  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount > 0),
  description TEXT NOT NULL,
  category public.expense_category NOT NULL DEFAULT 'other',
  vendor_name TEXT,
  receipt_url TEXT,

  is_billable BOOLEAN NOT NULL DEFAULT TRUE,
  is_reimbursable BOOLEAN NOT NULL DEFAULT FALSE,
  status public.expense_record_status NOT NULL DEFAULT 'pending',

  approved_by UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT expenses_billed_requires_invoice CHECK (
    status != 'billed' OR invoice_id IS NOT NULL
  )
);

CREATE INDEX expenses_matter_id_idx ON public.expenses (matter_id);
CREATE INDEX expenses_profile_id_idx ON public.expenses (profile_id);
CREATE INDEX expenses_invoice_id_idx ON public.expenses (invoice_id);
CREATE INDEX expenses_expense_submission_id_idx ON public.expenses (expense_submission_id);
CREATE INDEX expenses_status_idx ON public.expenses (status);
CREATE INDEX expenses_expense_date_idx ON public.expenses (expense_date);

COMMENT ON TABLE public.expenses IS
  'Posted matter expenses for accounting/billing. Source may be expense_submissions after approval.';
COMMENT ON COLUMN public.expense_submission_id IS
  'Links to attorney-submitted expense when this record was created from a workflow approval.';

-- -----------------------------------------------------------------------------
-- 4. write_downs
-- -----------------------------------------------------------------------------

CREATE TABLE public.write_downs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  invoice_id UUID NOT NULL
    REFERENCES public.invoices(id) ON DELETE RESTRICT,
  matter_id UUID NOT NULL
    REFERENCES public.matters(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL
    REFERENCES public.clients(id) ON DELETE RESTRICT,

  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount > 0),
  reason public.write_down_reason NOT NULL,
  description TEXT NOT NULL,

  status public.approval_status NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  write_down_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT write_downs_approval_metadata_check CHECK (
    status != 'approved'
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE INDEX write_downs_invoice_id_idx ON public.write_downs (invoice_id);
CREATE INDEX write_downs_matter_id_idx ON public.write_downs (matter_id);
CREATE INDEX write_downs_client_id_idx ON public.write_downs (client_id);
CREATE INDEX write_downs_status_idx ON public.write_downs (status);
CREATE INDEX write_downs_write_down_date_idx ON public.write_downs (write_down_date);

COMMENT ON TABLE public.write_downs IS
  'Invoice reductions/write-offs. Requires manager approval before affecting balance_due.';

-- -----------------------------------------------------------------------------
-- 5. trust_accounts
-- -----------------------------------------------------------------------------

CREATE TABLE public.trust_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id UUID NOT NULL
    REFERENCES public.clients(id) ON DELETE RESTRICT,
  matter_id UUID
    REFERENCES public.matters(id) ON DELETE RESTRICT,

  transaction_type public.trust_transaction_type NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount != 0),
  balance_after NUMERIC(12, 2) NOT NULL
    CHECK (balance_after >= 0),

  description TEXT NOT NULL,
  reference_number TEXT,

  reference_type TEXT
    CHECK (reference_type IN ('invoice', 'payment', 'manual', 'transfer', 'other')),
  reference_id UUID,

  recorded_by UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT trust_accounts_debit_sign_check CHECK (
    (transaction_type IN ('withdrawal', 'invoice_application', 'transfer_out') AND amount < 0)
    OR (transaction_type IN ('deposit', 'refund', 'transfer_in', 'adjustment'))
  )
);

CREATE INDEX trust_accounts_client_id_idx ON public.trust_accounts (client_id);
CREATE INDEX trust_accounts_matter_id_idx ON public.trust_accounts (matter_id);
CREATE INDEX trust_accounts_transaction_date_idx ON public.trust_accounts (transaction_date);
CREATE INDEX trust_accounts_reference_idx ON public.trust_accounts (reference_type, reference_id);

CREATE UNIQUE INDEX trust_accounts_client_matter_transaction_idx
  ON public.trust_accounts (client_id, matter_id, id);

COMMENT ON TABLE public.trust_accounts IS
  'Append-only trust/retainer ledger. Current balance = latest balance_after for client_id + matter_id.';
COMMENT ON COLUMN public.trust_accounts.balance_after IS
  'Running balance snapshot after this transaction — supports audit reconstruction.';

ALTER TABLE public.payments
  ADD CONSTRAINT payments_trust_account_entry_id_fkey
  FOREIGN KEY (trust_account_entry_id)
  REFERENCES public.trust_accounts(id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER write_downs_updated_at
  BEFORE UPDATE ON public.write_downs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trust_accounts_updated_at
  BEFORE UPDATE ON public.trust_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- Validation triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_payment_against_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_total NUMERIC(12, 2);
  invoice_written_down NUMERIC(12, 2);
  existing_payments NUMERIC(12, 2);
  new_payment_total NUMERIC(12, 2);
BEGIN
  SELECT total_amount, amount_written_down
  INTO invoice_total, invoice_written_down
  FROM public.invoices
  WHERE id = NEW.invoice_id
  FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0)
  INTO existing_payments
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND status IN ('pending', 'completed', 'partial', 'disputed')
    AND id IS DISTINCT FROM NEW.id;

  new_payment_total := existing_payments + NEW.amount;

  IF new_payment_total + invoice_written_down > invoice_total THEN
    RAISE EXCEPTION
      'Payment total (%) plus write-downs (%) exceeds invoice total (%)',
      new_payment_total, invoice_written_down, invoice_total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payments_validate_amount
  BEFORE INSERT OR UPDATE OF amount, status, invoice_id ON public.payments
  FOR EACH ROW
  WHEN (NEW.status IN ('pending', 'completed', 'partial', 'disputed'))
  EXECUTE FUNCTION public.validate_payment_against_invoice();

CREATE OR REPLACE FUNCTION public.validate_write_down_against_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_total NUMERIC(12, 2);
  invoice_paid NUMERIC(12, 2);
  existing_write_downs NUMERIC(12, 2);
  new_write_down_total NUMERIC(12, 2);
BEGIN
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT total_amount, amount_paid
  INTO invoice_total, invoice_paid
  FROM public.invoices
  WHERE id = NEW.invoice_id
  FOR UPDATE;

  SELECT COALESCE(SUM(amount), 0)
  INTO existing_write_downs
  FROM public.write_downs
  WHERE invoice_id = NEW.invoice_id
    AND status = 'approved'
    AND id IS DISTINCT FROM NEW.id;

  new_write_down_total := existing_write_downs + NEW.amount;

  IF new_write_down_total + invoice_paid > invoice_total THEN
    RAISE EXCEPTION
      'Write-down total (%) plus payments (%) exceeds invoice total (%)',
      new_write_down_total, invoice_paid, invoice_total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER write_downs_validate_amount
  BEFORE INSERT OR UPDATE OF amount, status, invoice_id ON public.write_downs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_write_down_against_invoice();

-- -----------------------------------------------------------------------------
-- Helper view
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.trust_account_balances AS
SELECT DISTINCT ON (client_id, matter_id)
  client_id,
  matter_id,
  balance_after AS current_balance,
  transaction_date AS as_of_date,
  id AS last_entry_id
FROM public.trust_accounts
ORDER BY client_id, matter_id, transaction_date DESC, created_at DESC, id DESC;

COMMENT ON VIEW public.trust_account_balances IS
  'Latest trust balance per client/matter scope. Use for dashboards and retainer reporting.';

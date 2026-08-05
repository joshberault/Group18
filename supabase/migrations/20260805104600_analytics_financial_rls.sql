-- Row Level Security for billing / accounting / analytics tables
-- Restricts financial data to managing_partner, admin, and manager roles.
-- Requires: 20260805104500_analytics_add_managing_partner_role.sql

CREATE OR REPLACE FUNCTION public.can_access_financial_data()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT role IN ('admin', 'manager', 'managing_partner')
      FROM public.profiles
      WHERE id = auth.uid()
    ),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.can_access_financial_data IS
  'Returns true for roles allowed to view and manage financial tables (invoices, payments, expenses, write_downs, trust_accounts).';

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.write_downs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_accounts ENABLE ROW LEVEL SECURITY;

-- invoices
CREATE POLICY "Financial admins full access to invoices"
  ON public.invoices
  FOR ALL
  TO authenticated
  USING (public.can_access_financial_data())
  WITH CHECK (public.can_access_financial_data());

-- payments
CREATE POLICY "Financial admins full access to payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.can_access_financial_data())
  WITH CHECK (public.can_access_financial_data());

-- expenses
CREATE POLICY "Financial admins full access to expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.can_access_financial_data())
  WITH CHECK (public.can_access_financial_data());

-- write_downs
CREATE POLICY "Financial admins full access to write_downs"
  ON public.write_downs
  FOR ALL
  TO authenticated
  USING (public.can_access_financial_data())
  WITH CHECK (public.can_access_financial_data());

-- trust_accounts
CREATE POLICY "Financial admins full access to trust_accounts"
  ON public.trust_accounts
  FOR ALL
  TO authenticated
  USING (public.can_access_financial_data())
  WITH CHECK (public.can_access_financial_data());

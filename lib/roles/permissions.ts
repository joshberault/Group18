/**
 * Reusable permission identifiers for demo frontend authorization.
 * Production security must also be enforced via Supabase Row Level Security (RLS).
 */
export const PERMISSIONS = [
  "view_firm_dashboard",
  "view_assigned_matters",
  "view_own_matters",
  "manage_clients",
  "manage_matters",
  "enter_time",
  "approve_time",
  "manage_tasks",
  "create_invoices",
  "manage_collections",
  "view_accounting",
  "manage_accounting",
  "view_firm_reports",
  "manage_staff",
  "access_client_portal",
  "view_accounting_dashboard",
  "view_trust_balances",
  "manage_trust_activity",
  "view_revenue_recognition",
  "manage_write_downs",
  "manage_write_offs",
  "view_accounts_receivable",
  "reconcile_payments",
  "view_profitability",
  "view_audit_log",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Canonical CounselFlow App Router paths for the Billing module.
 * Use these for all in-module links; never point at the standalone billing app roots.
 */
export const BILLING_ROUTES = {
  dashboard: "/billing",
  invoices: "/invoices",
  generateInvoice: "/invoices/generate",
  receivables: "/receivables",
  revenueByAttorney: "/billing/revenue/attorney",
  revenueByClient: "/billing/revenue/client",
} as const;

export type BillingRoute = (typeof BILLING_ROUTES)[keyof typeof BILLING_ROUTES];

/** Build `/invoices?...` deep links used by dashboard, generate wizard, and AR. */
export function invoicesHref(
  params?: Record<string, string | undefined>,
): string {
  if (!params) return BILLING_ROUTES.invoices;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") q.set(key, value);
  }
  const s = q.toString();
  return s ? `${BILLING_ROUTES.invoices}?${s}` : BILLING_ROUTES.invoices;
}

/**
 * Create Invoice wizard deep link. Prefers firm UUIDs.
 * - `clientId` / `matterId`: Supabase clients.id / matters.id
 * - `attorney`: optional display name for Assigned Attorney when matter has a lead
 */
export function generateInvoiceHref(
  params?: Record<string, string | undefined>,
): string {
  if (!params) return BILLING_ROUTES.generateInvoice;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") q.set(key, value);
  }
  const s = q.toString();
  return s
    ? `${BILLING_ROUTES.generateInvoice}?${s}`
    : BILLING_ROUTES.generateInvoice;
}

/** Build `/receivables?...` deep links (e.g. overdue filter). */
export function receivablesHref(
  params?: Record<string, string | undefined>,
): string {
  if (!params) return BILLING_ROUTES.receivables;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") q.set(key, value);
  }
  const s = q.toString();
  return s ? `${BILLING_ROUTES.receivables}?${s}` : BILLING_ROUTES.receivables;
}

/** Revenue by attorney report (optional attorney name filter). */
export function revenueByAttorneyHref(
  params?: Record<string, string | undefined>,
): string {
  if (!params) return BILLING_ROUTES.revenueByAttorney;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") q.set(key, value);
  }
  const s = q.toString();
  return s
    ? `${BILLING_ROUTES.revenueByAttorney}?${s}`
    : BILLING_ROUTES.revenueByAttorney;
}

/** Revenue by client report (optional client name filter). */
export function revenueByClientHref(
  params?: Record<string, string | undefined>,
): string {
  if (!params) return BILLING_ROUTES.revenueByClient;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") q.set(key, value);
  }
  const s = q.toString();
  return s
    ? `${BILLING_ROUTES.revenueByClient}?${s}`
    : BILLING_ROUTES.revenueByClient;
}

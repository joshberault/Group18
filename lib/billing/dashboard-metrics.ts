import {
  getCollectionsInRange,
} from "@/lib/billing/collections-utils";
import {
  buildRevenueByAttorneyFromInvoices,
  buildRevenueByClientFromInvoices,
} from "@/lib/billing/invoice-revenue-utils";
import type { Invoice } from "@/lib/billing/invoice-types";
import { buildInvoiceStatusSummary } from "@/lib/billing/invoice-status-summary";
import {
  getOutstandingReceivables,
  getReceivablesSummary,
} from "@/lib/billing/receivables-utils";
import type {
  BillingSummary,
  RevenueByAttorney,
  RevenueByClient,
} from "@/lib/billing/types";
import {
  type DateRange,
  isDateInRange,
  normalizeBillingDate,
} from "@/lib/billing/billing-period";

export type DashboardPeriodMetrics = {
  summary: BillingSummary;
  revenueByAttorney: RevenueByAttorney[];
  revenueByClient: RevenueByClient[];
  /** Invoices issued in the selected period */
  invoicesInPeriod: Invoice[];
};

/**
 * Invoices issued (invoiceDate) within the inclusive billing period.
 * Dates are normalized so values like 8/5/2026 still match.
 */
export function filterInvoicesByPeriod(
  invoices: Invoice[],
  range: DateRange,
): Invoice[] {
  return invoices.filter((inv) => {
    const day = normalizeBillingDate(inv.invoiceDate);
    return day ? isDateInRange(day, range) : false;
  });
}

/**
 * Status summary input for period-scoped dashboards.
 * Callers should pass {@link filterInvoicesByPeriod} output (or
 * `metrics.invoicesInPeriod`) so counts stay period-aligned.
 */
export function buildPeriodInvoiceStatusSummary(invoicesInPeriod: Invoice[]) {
  return buildInvoiceStatusSummary(invoicesInPeriod);
}

/**
 * Live Billing dashboard metrics for a period (Supabase-backed invoice list).
 * Every metric is derived ONLY from invoices whose invoiceDate falls in range:
 * - Invoice count / revenue: invoices issued in period
 * - Outstanding A/R + overdue: open balances among those invoices
 * - Collections: paymentHistory (and paid fallbacks) in range on those invoices
 */
export function computeDashboardMetricsForPeriod(
  allInvoices: Invoice[],
  range: DateRange,
  asOf = new Date(),
): DashboardPeriodMetrics {
  const invoicesInPeriod = filterInvoicesByPeriod(allInvoices, range);
  const periodAr = getReceivablesSummary(
    getOutstandingReceivables(invoicesInPeriod, asOf),
  );

  return {
    summary: {
      totalInvoices: invoicesInPeriod.length,
      outstandingReceivable: periodAr.totalOutstanding,
      // Payments in range that belong to invoices issued in the period
      collectionsThisMonth: getCollectionsInRange(invoicesInPeriod, range),
      overdueInvoices: periodAr.overdueCount,
    },
    revenueByAttorney: buildRevenueByAttorneyFromInvoices(invoicesInPeriod),
    revenueByClient: buildRevenueByClientFromInvoices(invoicesInPeriod),
    invoicesInPeriod,
  };
}

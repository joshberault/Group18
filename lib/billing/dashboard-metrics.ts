import {
  getCollectionsInRange,
} from "@/lib/billing/collections-utils";
import {
  buildRevenueByAttorneyFromInvoices,
  buildRevenueByClientFromInvoices,
} from "@/lib/billing/invoice-revenue-utils";
import type { Invoice } from "@/lib/billing/invoice-types";
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
 * Live dashboard metrics for a billing period.
 * - Invoice count / revenue / open AR slices use invoice issue date in range
 * - Collections use payment dates (and fully paid invoices without payment rows by issue date)
 */
export function computeDashboardMetricsForPeriod(
  allInvoices: Invoice[],
  range: DateRange,
  asOf = new Date(),
): DashboardPeriodMetrics {
  const invoicesInPeriod = filterInvoicesByPeriod(allInvoices, range);
  const ar = getReceivablesSummary(
    getOutstandingReceivables(invoicesInPeriod, asOf),
  );

  return {
    summary: {
      totalInvoices: invoicesInPeriod.length,
      outstandingReceivable: ar.totalOutstanding,
      collectionsThisMonth: getCollectionsInRange(allInvoices, range),
      overdueInvoices: ar.overdueCount,
    },
    revenueByAttorney: buildRevenueByAttorneyFromInvoices(invoicesInPeriod),
    revenueByClient: buildRevenueByClientFromInvoices(invoicesInPeriod),
    invoicesInPeriod,
  };
}

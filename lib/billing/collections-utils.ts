import type { DateRange } from "@/lib/billing/billing-period";
import {
  isDateInRange,
  resolvePeriodRange,
} from "@/lib/billing/billing-period";
import type { Invoice } from "@/lib/billing/invoice-types";

/** Fully paid: status Paid, or balance cleared with payments */
export function isFullyPaidInvoice(invoice: Invoice): boolean {
  if (invoice.status === "Paid") return true;
  if (invoice.status === "Cancelled" || invoice.status === "Draft") return false;
  return (
    invoice.remainingBalance <= 0 &&
    invoice.amountPaid > 0 &&
    invoice.amountPaid >= invoice.totalAmount
  );
}

export function getFullyPaidInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter(isFullyPaidInvoice);
}

/**
 * Collections total from fully paid invoices (sum of amounts paid / invoice total).
 * Prefer period-aware {@link getCollectionsInRange} on the dashboard.
 */
export function getFullyPaidCollectionsTotal(invoices: Invoice[]): number {
  return getFullyPaidInvoices(invoices).reduce((sum, inv) => {
    const collected =
      inv.amountPaid > 0 ? inv.amountPaid : inv.totalAmount;
    return sum + collected;
  }, 0);
}

/**
 * Collections attributable to an inclusive date range:
 * payment history lines in range + fully paid invoices with no payment rows
 * whose invoice date falls in range.
 */
export function getCollectionsInRange(
  invoices: Invoice[],
  range: DateRange,
): number {
  let total = 0;

  for (const inv of invoices) {
    const payments = inv.paymentHistory ?? [];
    let paymentSumInRange = 0;
    for (const p of payments) {
      if (isDateInRange(p.date, range)) {
        paymentSumInRange += p.amount;
      }
    }
    if (paymentSumInRange > 0) {
      total += paymentSumInRange;
      continue;
    }

    if (isFullyPaidInvoice(inv) && payments.length === 0) {
      if (isDateInRange(inv.invoiceDate, range)) {
        total += inv.totalAmount;
      }
    }
  }

  return Math.round(total * 100) / 100;
}

/**
 * Collections attributable to the current calendar month.
 */
export function getCollectionsThisMonthTotal(
  invoices: Invoice[],
  asOf = new Date(),
): number {
  return getCollectionsInRange(
    invoices,
    resolvePeriodRange("this_month", asOf),
  );
}

export type MonthlyCollectionPoint = {
  /** Short month label for chart axis, e.g. "Mar" */
  month: string;
  amount: number;
  /** Year-month key YYYY-MM */
  key: string;
};

function monthStartLocal(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

function monthEndLocal(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0);
}

/**
 * Monthly collections series for the Billing Specialist firm dashboard.
 * Uses fully paid invoices only:
 * - payment history amounts bucketed by payment date, or
 * - invoice total bucketed by invoice date when there is no payment history.
 */
export function getMonthlyCollectionsFromPaidInvoices(
  invoices: Invoice[],
  monthCount = 6,
  asOf = new Date(),
): MonthlyCollectionPoint[] {
  const paidInvoices = getFullyPaidInvoices(invoices);
  const points: MonthlyCollectionPoint[] = [];
  const y = asOf.getFullYear();
  const m = asOf.getMonth();

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(y, m - i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const start = toIsoHelper(monthStartLocal(year, monthIndex));
    const end = toIsoHelper(monthEndLocal(year, monthIndex));
    const amount = getCollectionsInRange(paidInvoices, { start, end });
    points.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      month: d.toLocaleString("en-US", { month: "short" }),
      amount,
    });
  }

  return points;
}

function toIsoHelper(date: Date): string {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

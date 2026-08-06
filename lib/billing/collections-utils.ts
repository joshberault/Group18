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
 * Collections attributable to an inclusive date range.
 * Prefers payment rows (from Supabase `payments` via invoice.paymentHistory).
 * Falls back to fully paid invoice totals when status is Paid but no payment rows.
 */
export function getCollectionsInRange(
  invoices: Invoice[],
  range: DateRange,
): number {
  let total = 0;

  for (const inv of invoices) {
    if (inv.status === "Cancelled" || inv.status === "Draft") continue;

    const payments = inv.paymentHistory ?? [];
    let paymentSumInRange = 0;
    for (const p of payments) {
      if (p.date && isDateInRange(p.date, range)) {
        paymentSumInRange += Number(p.amount) || 0;
      }
    }
    if (paymentSumInRange > 0) {
      total += paymentSumInRange;
      continue;
    }

    // Paid invoice with no payment history: attribute amount paid by invoice date
    if (isFullyPaidInvoice(inv) && payments.length === 0) {
      if (isDateInRange(inv.invoiceDate, range)) {
        total +=
          inv.amountPaid > 0 ? inv.amountPaid : Number(inv.totalAmount) || 0;
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
 * Monthly collections series from shared invoice payment history (Supabase).
 * Buckets all payment rows by payment date across the firm catalog.
 */
export function getMonthlyCollectionsFromPaidInvoices(
  invoices: Invoice[],
  monthCount = 6,
  asOf = new Date(),
): MonthlyCollectionPoint[] {
  const points: MonthlyCollectionPoint[] = [];
  const y = asOf.getFullYear();
  const m = asOf.getMonth();

  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const d = new Date(y, m - i, 1);
    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const start = toIsoHelper(monthStartLocal(year, monthIndex));
    const end = toIsoHelper(monthEndLocal(year, monthIndex));
    const amount = getCollectionsInRange(invoices, { start, end });
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

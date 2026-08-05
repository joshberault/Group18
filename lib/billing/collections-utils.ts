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

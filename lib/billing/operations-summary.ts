import type { Invoice, InvoiceStatus } from "@/lib/billing/invoice-types";
import {
  getOutstandingReceivables,
  getReceivablesSummary,
} from "@/lib/billing/receivables-utils";

export type BillingOperationsSummary = {
  draft: number;
  /** No dedicated status in the catalog — always 0 until a status is added. */
  awaitingApproval: number;
  sent: number;
  overdue: number;
  paid: number;
  partiallyPaid: number;
  disputed: number;
  cancelled: number;
  totalInvoices: number;
  /** Sum of remaining balances on open AR (unpaid + partially paid). */
  outstandingReceivable: number;
};

function countByStatus(invoices: Invoice[], status: InvoiceStatus): number {
  return invoices.filter((inv) => inv.status === status).length;
}

/**
 * Live billing operations metrics from the managed invoice catalog
 * (same source as Invoice Management / Accounts Receivable).
 */
export function buildBillingOperationsSummary(
  invoices: Invoice[],
): BillingOperationsSummary {
  const openRows = getOutstandingReceivables(invoices);
  const { totalOutstanding } = getReceivablesSummary(openRows);

  return {
    draft: countByStatus(invoices, "Draft"),
    awaitingApproval: 0,
    sent: countByStatus(invoices, "Sent"),
    overdue: countByStatus(invoices, "Overdue"),
    paid: countByStatus(invoices, "Paid"),
    partiallyPaid: countByStatus(invoices, "Partially Paid"),
    disputed: countByStatus(invoices, "Disputed"),
    cancelled: countByStatus(invoices, "Cancelled"),
    totalInvoices: invoices.length,
    outstandingReceivable: totalOutstanding,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/**
 * Human-readable Billing Operations Summary for the firm Dashboard banner.
 */
export function formatBillingOperationsSummary(
  invoices: Invoice[],
): string {
  const s = buildBillingOperationsSummary(invoices);
  return [
    plural(s.draft, "invoice in draft", "invoices in draft"),
    plural(
      s.awaitingApproval,
      "invoice awaiting approval",
      "invoices awaiting approval",
    ),
    plural(s.sent, "sent invoice", "sent invoices"),
    plural(s.overdue, "overdue invoice", "overdue invoices"),
    plural(s.paid, "paid invoice", "paid invoices"),
    plural(
      s.partiallyPaid,
      "partially paid invoice",
      "partially paid invoices",
    ),
    `and ${formatCurrency(s.outstandingReceivable)} in outstanding receivables`,
  ].join(", ");
}

import type { Invoice, InvoiceStatus } from "@/lib/billing/invoice-types";

export type AgingBucket =
  | "Current"
  | "1–30"
  | "31–60"
  | "61–90"
  | "90+ Days";

export type OutstandingReceivableRow = Invoice & {
  /** Original invoice amount (alias for totalAmount) */
  amountDue: number;
  /** Days since invoice date */
  daysOutstanding: number;
  /** Days past due date (0 if not yet due) */
  daysOverdue: number;
  agingBucket: AgingBucket;
  isOverdue: boolean;
};

export type ReceivablesSummary = {
  totalOutstanding: number;
  overdueCount: number;
  unpaidCount: number;
  partiallyPaidCount: number;
};

/** Statuses that can still carry open AR (unpaid / partially paid). */
const OPEN_STATUSES: InvoiceStatus[] = [
  "Sent",
  "Partially Paid",
  "Overdue",
  "Disputed",
];

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function getDaysOutstanding(
  invoiceDate: string,
  asOf = startOfToday(),
): number {
  return Math.max(0, daysBetween(parseDate(invoiceDate), asOf));
}

export function getDaysOverdue(dueDate: string, asOf = startOfToday()): number {
  return Math.max(0, daysBetween(parseDate(dueDate), asOf));
}

export function getAgingBucket(
  dueDate: string,
  asOf = startOfToday(),
): AgingBucket {
  const daysPastDue = daysBetween(parseDate(dueDate), asOf);
  if (daysPastDue <= 0) return "Current";
  if (daysPastDue <= 30) return "1–30";
  if (daysPastDue <= 60) return "31–60";
  if (daysPastDue <= 90) return "61–90";
  return "90+ Days";
}

/**
 * Open AR lines derived from the shared invoice catalog.
 * Includes unpaid and partially paid invoices with remaining balance > 0.
 */
export function getOutstandingReceivables(
  invoices: Invoice[] = [],
  asOf = startOfToday(),
): OutstandingReceivableRow[] {
  return invoices
    .filter(
      (invoice) =>
        invoice.remainingBalance > 0 &&
        OPEN_STATUSES.includes(invoice.status),
    )
    .map((invoice) => {
      const daysOverdue = getDaysOverdue(invoice.dueDate, asOf);
      return {
        ...invoice,
        amountDue: invoice.totalAmount,
        daysOutstanding: getDaysOutstanding(invoice.invoiceDate, asOf),
        daysOverdue,
        agingBucket: getAgingBucket(invoice.dueDate, asOf),
        isOverdue: invoice.status === "Overdue" || daysOverdue > 0,
      };
    });
}

export function getReceivablesSummary(
  rows: OutstandingReceivableRow[],
): ReceivablesSummary {
  return {
    totalOutstanding: rows.reduce((sum, r) => sum + r.remainingBalance, 0),
    overdueCount: rows.filter((r) => r.isOverdue).length,
    unpaidCount: rows.filter((r) => r.amountPaid <= 0).length,
    partiallyPaidCount: rows.filter(
      (r) => r.amountPaid > 0 && r.remainingBalance > 0,
    ).length,
  };
}

/**
 * True when an invoice is overdue by status or calendar rule:
 * - status is Overdue, or
 * - due date has passed and remaining balance > 0
 */
export function isInvoiceOverdue(
  invoice: Invoice,
  asOf = startOfToday(),
): boolean {
  if (invoice.status === "Overdue") return true;
  const remaining = Number(invoice.remainingBalance) || 0;
  if (remaining <= 0) return false;
  if (invoice.status === "Paid" || invoice.status === "Cancelled") return false;
  return getDaysOverdue(invoice.dueDate, asOf) > 0;
}

/** Overdue invoices from the managed catalog (same source as Invoice Management). */
export function getOverdueInvoices(
  invoices: Invoice[],
  asOf = startOfToday(),
): Invoice[] {
  return invoices.filter((inv) => isInvoiceOverdue(inv, asOf));
}

export type OverdueInvoiceMetrics = {
  count: number;
  /** Sum of remaining balances on overdue invoices. */
  amount: number;
};

export function getOverdueInvoiceMetrics(
  invoices: Invoice[],
  asOf = startOfToday(),
): OverdueInvoiceMetrics {
  const rows = getOverdueInvoices(invoices, asOf);
  const amount = rows.reduce(
    (sum, inv) => sum + (Number(inv.remainingBalance) || 0),
    0,
  );
  return {
    count: rows.length,
    amount: Math.round(amount * 100) / 100,
  };
}

export const AGING_BUCKETS: AgingBucket[] = [
  "Current",
  "1–30",
  "31–60",
  "61–90",
  "90+ Days",
];

/**
 * Invoice Status Summary for the firm dashboard.
 * Counts and amounts from the managed invoice catalog (same as Invoice Management).
 */

import type { Invoice, InvoiceStatus } from "@/lib/billing/invoice-types";
import { invoicesHref } from "@/lib/billing/routes";

/** Rows shown in Invoice Status Summary (includes statuses not yet on catalog). */
export type InvoiceStatusSummaryKey =
  | "Draft"
  | "Awaiting Approval"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Written Off"
  | "Cancelled";

export type InvoiceStatusSummaryRow = {
  key: InvoiceStatusSummaryKey;
  /** Display label (Canceled vs Cancelled handled here if needed). */
  label: string;
  count: number;
  amount: number;
  /**
   * Catalog status to filter on Invoice Management, or null when the
   * status is not stored on invoices (Awaiting Approval / Written Off).
   */
  catalogStatus: InvoiceStatus | null;
  /** Query value for /invoices?status= */
  statusParam: string;
  href: string;
};

const SUMMARY_ROWS: {
  key: InvoiceStatusSummaryKey;
  label: string;
  catalogStatus: InvoiceStatus | null;
  statusParam: string;
}[] = [
  {
    key: "Draft",
    label: "Draft",
    catalogStatus: "Draft",
    statusParam: "Draft",
  },
  {
    key: "Awaiting Approval",
    label: "Awaiting Approval",
    catalogStatus: null,
    statusParam: "Awaiting Approval",
  },
  {
    key: "Sent",
    label: "Sent",
    catalogStatus: "Sent",
    statusParam: "Sent",
  },
  {
    key: "Partially Paid",
    label: "Partially Paid",
    catalogStatus: "Partially Paid",
    statusParam: "Partially Paid",
  },
  {
    key: "Paid",
    label: "Paid",
    catalogStatus: "Paid",
    statusParam: "Paid",
  },
  {
    key: "Overdue",
    label: "Overdue",
    catalogStatus: "Overdue",
    statusParam: "Overdue",
  },
  {
    key: "Written Off",
    label: "Written Off",
    catalogStatus: null,
    statusParam: "Written Off",
  },
  {
    key: "Cancelled",
    label: "Canceled",
    catalogStatus: "Cancelled",
    statusParam: "Cancelled",
  },
];

/**
 * Amount for status bucket:
 * - Paid / Cancelled → totalAmount (full invoice value)
 * - Others → remainingBalance (open AR / liability), fall back to totalAmount
 */
export function amountForStatusInvoice(
  invoice: Invoice,
  status: InvoiceStatus,
): number {
  if (status === "Paid" || status === "Cancelled") {
    return Number(invoice.totalAmount) || 0;
  }
  const remaining = Number(invoice.remainingBalance);
  if (Number.isFinite(remaining)) return remaining;
  return Number(invoice.totalAmount) || 0;
}

/** Parse `/invoices?status=` into a catalog InvoiceStatus when recognized. */
export function parseInvoiceStatusParam(
  raw: string | null | undefined,
): InvoiceStatus | "none" | null {
  if (raw == null || raw.trim() === "") return null;
  const normalized = raw.trim().toLowerCase().replace(/[_-]+/g, " ");

  if (
    normalized === "awaiting approval" ||
    normalized === "written off" ||
    normalized === "none"
  ) {
    // Pseudo-status: force empty list (no matching invoices in catalog)
    return "none";
  }

  const map: Record<string, InvoiceStatus> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    "partially paid": "Partially Paid",
    partial: "Partially Paid",
    overdue: "Overdue",
    disputed: "Disputed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
  };

  return map[normalized] ?? null;
}

export function buildInvoiceStatusSummary(
  invoices: Invoice[],
): InvoiceStatusSummaryRow[] {
  return SUMMARY_ROWS.map((row) => {
    if (row.catalogStatus == null) {
      return {
        key: row.key,
        label: row.label,
        count: 0,
        amount: 0,
        catalogStatus: null,
        statusParam: row.statusParam,
        href: invoicesHref({ status: row.statusParam }),
      };
    }

    const matches = invoices.filter((inv) => inv.status === row.catalogStatus);
    const amount = matches.reduce(
      (sum, inv) => sum + amountForStatusInvoice(inv, row.catalogStatus!),
      0,
    );

    return {
      key: row.key,
      label: row.label,
      count: matches.length,
      amount: Math.round(amount * 100) / 100,
      catalogStatus: row.catalogStatus,
      statusParam: row.statusParam,
      href: invoicesHref({ status: row.statusParam }),
    };
  });
}

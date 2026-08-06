/**
 * Live billing notifications derived from the shared Supabase invoice catalog.
 * Used on Billing dashboard (Client Related Matters) so actions open real invoices/AR.
 */

import type { ClientMatterNotification } from "@/lib/client-related-matters/notifications-store";
import {
  getOutstandingReceivables,
  isInvoiceOverdue,
} from "@/lib/billing/receivables-utils";
import { invoicesHref, receivablesHref } from "@/lib/billing/routes";
import type { Invoice } from "@/lib/billing/invoice-types";

function currency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Build actionable notifications from firm invoices currently in the catalog.
 * Deep-links go to Invoice Management (with highlight) or AR (overdue view).
 */
export function buildBillingNotificationsFromCatalog(
  invoices: Invoice[],
  asOf = new Date(),
): ClientMatterNotification[] {
  const out: ClientMatterNotification[] = [];
  const open = getOutstandingReceivables(invoices, asOf);

  for (const inv of open) {
    if (isInvoiceOverdue(inv, asOf)) {
      out.push({
        id: `live-overdue-${inv.invoiceNumber}`,
        title: "Invoice past due",
        message: `${inv.invoiceNumber} for ${inv.client} — ${inv.legalMatter} is past due with ${currency(inv.remainingBalance)} remaining.`,
        createdAt: inv.dueDate
          ? `${inv.dueDate}T12:00:00.000Z`
          : new Date().toISOString(),
        type: "invoice_past_due",
        matterReference: "",
        clientName: inv.client,
        invoiceNumber: inv.invoiceNumber,
        actionLabel: "View receivables",
        actionHref: receivablesHref({
          view: "overdue",
          highlight: inv.invoiceNumber,
        }),
      });
      continue;
    }

    if (inv.status === "Partially Paid") {
      out.push({
        id: `live-partial-${inv.invoiceNumber}`,
        title: "Partial payment remaining",
        message: `${inv.invoiceNumber} for ${inv.client} still has ${currency(inv.remainingBalance)} open.`,
        createdAt: inv.invoiceDate
          ? `${inv.invoiceDate}T12:00:00.000Z`
          : new Date().toISOString(),
        type: "payment_received",
        matterReference: "",
        clientName: inv.client,
        invoiceNumber: inv.invoiceNumber,
        actionLabel: "View invoice",
        actionHref: invoicesHref({ highlight: inv.invoiceNumber }),
      });
      continue;
    }

    out.push({
      id: `live-open-${inv.invoiceNumber}`,
      title: inv.status === "Draft" ? "Draft invoice ready" : "Open receivable",
      message: `${inv.invoiceNumber} for ${inv.client} — ${inv.legalMatter} (${currency(inv.remainingBalance)} open, ${inv.status}).`,
      createdAt: inv.invoiceDate
        ? `${inv.invoiceDate}T12:00:00.000Z`
        : new Date().toISOString(),
      type: inv.status === "Draft" ? "invoice_added" : "invoice_past_due",
      matterReference: "",
      clientName: inv.client,
      invoiceNumber: inv.invoiceNumber,
      actionLabel: inv.status === "Draft" ? "View invoice" : "View receivables",
      actionHref:
        inv.status === "Draft"
          ? invoicesHref({ highlight: inv.invoiceNumber, status: "Draft" })
          : receivablesHref({ highlight: inv.invoiceNumber }),
    });
  }

  return out
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);
}

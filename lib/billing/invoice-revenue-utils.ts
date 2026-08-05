import type { Invoice } from "@/lib/billing/invoice-types";
import type {
  RevenueByAttorney,
  RevenueByClient,
} from "@/lib/billing/types";

/** Invoices that count toward revenue (excludes drafts and cancelled). */
function isRevenueInvoice(invoice: Invoice): boolean {
  return invoice.status !== "Draft" && invoice.status !== "Cancelled";
}

function slugId(prefix: string, name: string): string {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * Billed revenue by responsible attorney from actual invoices.
 * Revenue = sum of invoice totalAmount; invoiceCount = number of invoices.
 */
export function buildRevenueByAttorneyFromInvoices(
  invoices: Invoice[],
): RevenueByAttorney[] {
  const map = new Map<
    string,
    { attorneyName: string; revenue: number; invoiceCount: number }
  >();

  for (const inv of invoices) {
    if (!isRevenueInvoice(inv)) continue;
    const name = inv.attorney?.trim() || "Unassigned";
    const entry = map.get(name) ?? {
      attorneyName: name,
      revenue: 0,
      invoiceCount: 0,
    };
    entry.revenue += inv.totalAmount;
    entry.invoiceCount += 1;
    map.set(name, entry);
  }

  return Array.from(map.values())
    .map((row) => ({
      attorneyId: slugId("atty", row.attorneyName),
      attorneyName: row.attorneyName,
      revenue: Math.round(row.revenue * 100) / 100,
      invoiceCount: row.invoiceCount,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Billed revenue and open AR by client from actual invoices.
 * Revenue = sum of totalAmount; openBalance = sum of remainingBalance.
 */
export function buildRevenueByClientFromInvoices(
  invoices: Invoice[],
): RevenueByClient[] {
  const map = new Map<
    string,
    { clientName: string; revenue: number; openBalance: number }
  >();

  for (const inv of invoices) {
    if (!isRevenueInvoice(inv)) continue;
    const name = inv.client?.trim() || "Unknown client";
    const entry = map.get(name) ?? {
      clientName: name,
      revenue: 0,
      openBalance: 0,
    };
    entry.revenue += inv.totalAmount;
    entry.openBalance += Math.max(0, inv.remainingBalance);
    map.set(name, entry);
  }

  return Array.from(map.values())
    .map((row) => ({
      clientId: slugId("client", row.clientName),
      clientName: row.clientName,
      revenue: Math.round(row.revenue * 100) / 100,
      openBalance: Math.round(row.openBalance * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

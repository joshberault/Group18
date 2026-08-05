import { getAllManagedInvoices } from "@/lib/billing/invoice-management-store";
import { amClients, amMatters } from "@/lib/mock-data/accounting-manager/entities";

export type GlobalSearchResultType = "client" | "matter" | "invoice" | "receivable";

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  label: string;
  reference: string;
  href: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function searchGlobalRecords(query: string, limit = 12): GlobalSearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  const results: GlobalSearchResult[] = [];

  for (const client of amClients) {
    const haystack = [
      client.name,
      client.clientNumber,
      client.primaryContact,
      client.responsiblePartner,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) continue;
    results.push({
      id: `client-${client.id}`,
      type: "client",
      label: client.name,
      reference: client.clientNumber,
      href: `/clients?client=${encodeURIComponent(client.name)}`,
    });
  }

  for (const matter of amMatters) {
    const haystack = [
      matter.matterName,
      matter.matterNumber,
      matter.client,
      matter.attorney,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) continue;
    results.push({
      id: `matter-${matter.id}`,
      type: "matter",
      label: matter.matterName,
      reference: matter.matterNumber,
      href: `/matters?matter=${encodeURIComponent(matter.matterNumber)}`,
    });
  }

  for (const invoice of getAllManagedInvoices()) {
    const haystack = [
      invoice.invoiceNumber,
      invoice.client,
      invoice.legalMatter,
      invoice.status,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) continue;
    const isReceivable =
      invoice.status === "Sent" ||
      invoice.status === "Overdue" ||
      invoice.status === "Partially Paid" ||
      invoice.status === "Disputed";
    results.push({
      id: `invoice-${invoice.invoiceNumber}`,
      type: isReceivable ? "receivable" : "invoice",
      label: invoice.invoiceNumber,
      reference: `${invoice.client} · ${invoice.legalMatter}`,
      href: isReceivable
        ? `/receivables?client=${encodeURIComponent(invoice.client)}`
        : `/invoices?highlight=${encodeURIComponent(invoice.invoiceNumber)}`,
    });
  }

  return results.slice(0, limit);
}

import { getAllManagedInvoices } from "@/lib/billing/invoice-management-store";
import { amClients, amMatters } from "@/lib/mock-data/accounting-manager/entities";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";
import { DEMO_MATTERS, DEMO_PROFILE } from "@/lib/attorney/demo-data";
import type { UserRole } from "@/lib/types";

export type GlobalSearchResultType =
  | "client"
  | "matter"
  | "invoice"
  | "receivable"
  | "document"
  | "task";

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

const ROLE_ALLOWED_TYPES: Record<UserRole, GlobalSearchResultType[]> = {
  managing_partner: ["client", "matter", "invoice", "receivable"],
  attorney: ["matter", "document", "task"],
  paralegal: ["matter", "document", "task"],
  billing_specialist: ["client", "matter", "invoice", "receivable"],
  accounting_manager: ["client", "matter", "invoice", "receivable"],
  firm_administrator: ["client", "matter", "invoice"],
  client: ["matter", "invoice", "document"],
};

export function searchGlobalRecords(
  query: string,
  role: UserRole,
  limit = 12,
): GlobalSearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  const allowed = new Set(ROLE_ALLOWED_TYPES[role]);
  const results: GlobalSearchResult[] = [];

  if (allowed.has("client")) {
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
  }

  if (allowed.has("matter")) {
    const matterSources =
      role === "attorney"
        ? DEMO_MATTERS.map((m, index) => ({
            id: m.id,
            matterName: m.title,
            matterNumber: `M-2024-${String(index + 1).padStart(4, "0")}`,
            client: m.client?.company_name ?? m.client?.name ?? "Client",
            attorney: DEMO_PROFILE.full_name,
          }))
        : role === "paralegal"
          ? PARALEGAL_ASSIGNED_MATTERS.map((m) => ({
              id: m.id,
              matterName: m.title,
              matterNumber: m.matterNumber,
              client: m.clientName,
              attorney: m.attorneyName,
            }))
          : role === "client"
            ? amMatters.slice(0, 2).map((m) => ({
                id: m.id,
                matterName: m.matterName,
                matterNumber: m.matterNumber,
                client: m.client,
                attorney: m.attorney,
              }))
            : amMatters.map((m) => ({
                id: m.id,
                matterName: m.matterName,
                matterNumber: m.matterNumber,
                client: m.client,
                attorney: m.attorney,
              }));

    for (const matter of matterSources) {
      const haystack = [
        matter.matterName,
        matter.matterNumber,
        matter.client,
        matter.attorney,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) continue;
      const href =
        role === "client"
          ? `/client-portal/case-status?matter=${encodeURIComponent(matter.matterNumber)}`
          : `/matters?matter=${encodeURIComponent(matter.matterNumber)}`;
      results.push({
        id: `matter-${matter.id}`,
        type: "matter",
        label: matter.matterName,
        reference: matter.matterNumber,
        href,
      });
    }
  }

  if (allowed.has("invoice") || allowed.has("receivable")) {
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
      const type = isReceivable ? "receivable" : "invoice";
      if (!allowed.has(type)) continue;
      const href =
        role === "client"
          ? `/client-portal/pay-balance?invoice=${encodeURIComponent(invoice.invoiceNumber)}`
          : isReceivable
            ? `/receivables?client=${encodeURIComponent(invoice.client)}`
            : `/invoices?highlight=${encodeURIComponent(invoice.invoiceNumber)}`;
      results.push({
        id: `invoice-${invoice.invoiceNumber}`,
        type,
        label: invoice.invoiceNumber,
        reference: `${invoice.client} · ${invoice.legalMatter}`,
        href,
      });
    }
  }

  if (allowed.has("task") && (role === "attorney" || role === "paralegal")) {
    const tasks = [
      { id: "t1", label: "File motion for summary judgment", matter: "M-2024-0142" },
      { id: "t2", label: "Review discovery responses", matter: "M-2024-0088" },
      { id: "t3", label: "Prepare witness outline", matter: "M-2024-0210" },
    ];
    for (const task of tasks) {
      if (!`${task.label} ${task.matter}`.toLowerCase().includes(q)) continue;
      results.push({
        id: `task-${task.id}`,
        type: "task",
        label: task.label,
        reference: task.matter,
        href: "/attorney/tasks",
      });
    }
  }

  if (allowed.has("document") && (role === "attorney" || role === "paralegal" || role === "client")) {
    const docs = [
      { id: "d1", label: "Engagement Letter", matter: "M-2024-0142" },
      { id: "d2", label: "Deposition Transcript", matter: "M-2024-0088" },
    ];
    for (const doc of docs) {
      if (!`${doc.label} ${doc.matter}`.toLowerCase().includes(q)) continue;
      const href =
        role === "client"
          ? "/client-portal/upload-documents"
          : `/matters?matter=${encodeURIComponent(doc.matter)}`;
      results.push({
        id: `doc-${doc.id}`,
        type: "document",
        label: doc.label,
        reference: doc.matter,
        href,
      });
    }
  }

  return results.slice(0, limit);
}

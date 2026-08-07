import { createClientSafe } from "@/lib/supabase/client";
import { getAllManagedInvoices } from "@/lib/billing/invoice-management-store";
import type { GlobalSearchResult, GlobalSearchResultType } from "@/lib/demo/global-search";
import type { UserRole } from "@/lib/types";

const ROLE_ALLOWED_TYPES: Record<UserRole, GlobalSearchResultType[]> = {
  managing_partner: ["client", "matter", "invoice", "receivable"],
  attorney: ["matter", "document", "task"],
  paralegal: ["matter", "document", "task"],
  billing_specialist: ["client", "matter", "invoice", "receivable"],
  accounting_manager: ["client", "matter", "invoice", "receivable"],
  firm_administrator: ["client", "matter", "invoice"],
  client: ["matter", "invoice", "document"],
  prospective_client: [],
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function searchGlobalRecordsFromSupabase(
  query: string,
  role: UserRole,
  limit = 12,
): Promise<GlobalSearchResult[]> {
  const q = normalize(query);
  if (!q) return [];

  const allowed = new Set(ROLE_ALLOWED_TYPES[role]);
  const results: GlobalSearchResult[] = [];
  const supabase = createClientSafe();

  if (allowed.has("client") && supabase) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, client_number")
      .ilike("name", `%${query.trim()}%`)
      .limit(20);
    for (const client of data ?? []) {
      results.push({
        id: `client-${client.id}`,
        type: "client",
        label: client.name as string,
        reference: (client.client_number as string) ?? "",
        href: `/clients/${client.id}`,
      });
    }
  }

  if (allowed.has("matter") && supabase) {
    const { data } = await supabase
      .from("matters")
      .select("id, title, clients(name)")
      .ilike("title", `%${query.trim()}%`)
      .limit(20);
    for (const matter of data ?? []) {
      const clientJoin = matter.clients as { name?: string } | null;
      results.push({
        id: `matter-${matter.id}`,
        type: "matter",
        label: matter.title as string,
        reference: clientJoin?.name ?? "",
        href: `/matters?matter=${matter.id}`,
      });
    }
  }

  if (allowed.has("invoice")) {
    for (const invoice of getAllManagedInvoices()) {
      const haystack = [
        invoice.invoiceNumber,
        invoice.clientInfo?.name,
        invoice.legalMatter,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) continue;
      results.push({
        id: `invoice-${invoice.id}`,
        type: "invoice",
        label: invoice.invoiceNumber,
        reference: invoice.clientInfo?.name ?? "",
        href: `/invoices?invoice=${invoice.id}`,
      });
    }
  }

  if (allowed.has("receivable") && supabase) {
    const { data } = await supabase
      .from("invoices")
      .select("id, invoice_number, balance_due, clients(name)")
      .gt("balance_due", 0)
      .limit(20);
    for (const inv of data ?? []) {
      const clientJoin = inv.clients as { name?: string } | null;
      const haystack = `${inv.invoice_number} ${clientJoin?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) continue;
      results.push({
        id: `ar-${inv.id}`,
        type: "receivable",
        label: inv.invoice_number as string,
        reference: clientJoin?.name ?? "",
        href: "/receivables",
      });
    }
  }

  if (allowed.has("task") && supabase) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, matters(title)")
      .ilike("title", `%${query.trim()}%`)
      .limit(10);
    for (const task of data ?? []) {
      const matterJoin = task.matters as { title?: string } | null;
      results.push({
        id: `task-${task.id}`,
        type: "task",
        label: task.title as string,
        reference: matterJoin?.title ?? "",
        href: "/attorney/tasks",
      });
    }
  }

  if (allowed.has("document") && supabase) {
    const { data } = await supabase
      .from("portal_documents")
      .select("id, title, file_name, matter_id")
      .ilike("title", `%${query.trim()}%`)
      .limit(10);
    for (const doc of data ?? []) {
      const matterId = (doc as { matter_id?: string | null }).matter_id;
      results.push({
        id: `doc-${doc.id}`,
        type: "document",
        label: doc.title as string,
        reference: (doc.file_name as string) ?? "",
        href: matterId
          ? `/matters/${matterId}?tab=documents`
          : "/matters",
      });
    }
  }

  return results.slice(0, limit);
}

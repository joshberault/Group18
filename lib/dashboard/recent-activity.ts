/**
 * Recent activity feed derived from existing CounselFlow records
 * (no separate activity log table).
 */

import { createClientSafe } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/billing/invoice-types";
import { invoicesHref } from "@/lib/billing/routes";

export type ActivityItem = {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  /** ISO for sorting */
  at: string;
  href: string | null;
};

function formatRelative(iso: string, now = new Date()): string {
  const t = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`).getTime();
  if (Number.isNaN(t)) return iso;
  const diffMs = now.getTime() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(t));
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function invoiceAt(inv: Invoice): string {
  // Prefer sortable date; use invoiceDate as activity time proxy
  return inv.invoiceDate
    ? `${inv.invoiceDate}T12:00:00`
    : new Date(0).toISOString();
}

/**
 * Build activity from managed invoices + payments (client-side catalog).
 */
export function activityFromInvoices(invoices: Invoice[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const inv of invoices) {
    if (inv.status === "Cancelled") {
      items.push({
        id: `inv-cancelled-${inv.invoiceNumber}`,
        action: "Invoice Cancelled",
        detail: `${inv.invoiceNumber} · ${inv.client} — ${money(inv.totalAmount)}`,
        at: invoiceAt(inv),
        timestamp: "",
        href: invoicesHref({ highlight: inv.invoiceNumber }),
      });
    } else if (inv.status === "Draft") {
      items.push({
        id: `inv-draft-${inv.invoiceNumber}`,
        action: "Invoice Created",
        detail: `Draft ${inv.invoiceNumber} for ${inv.client} — ${money(inv.totalAmount)}`,
        at: invoiceAt(inv),
        timestamp: "",
        href: invoicesHref({ highlight: inv.invoiceNumber }),
      });
    } else if (inv.status === "Sent" || inv.status === "Overdue") {
      items.push({
        id: `inv-sent-${inv.invoiceNumber}`,
        action: "Invoice Sent",
        detail: `${inv.invoiceNumber} to ${inv.client} — ${money(inv.totalAmount)} · ${inv.legalMatter}`,
        at: invoiceAt(inv),
        timestamp: "",
        href: invoicesHref({ highlight: inv.invoiceNumber }),
      });
    } else if (inv.status === "Paid") {
      items.push({
        id: `inv-paid-${inv.invoiceNumber}`,
        action: "Invoice Paid",
        detail: `${inv.invoiceNumber} · ${inv.client} — ${money(inv.totalAmount)}`,
        at: invoiceAt(inv),
        timestamp: "",
        href: invoicesHref({ highlight: inv.invoiceNumber, status: "Paid" }),
      });
    } else if (inv.status === "Partially Paid") {
      items.push({
        id: `inv-partial-${inv.invoiceNumber}`,
        action: "Payment Recorded",
        detail: `${inv.invoiceNumber} partially paid — ${money(inv.amountPaid)} of ${money(inv.totalAmount)}`,
        at: invoiceAt(inv),
        timestamp: "",
        href: invoicesHref({ highlight: inv.invoiceNumber }),
      });
    }

    for (const pay of inv.paymentHistory ?? []) {
      items.push({
        id: `pay-${inv.invoiceNumber}-${pay.id}`,
        action: "Payment Received",
        detail: `${money(pay.amount)} ${pay.method || "payment"} on ${inv.invoiceNumber} · ${inv.client}`,
        at: pay.date ? `${pay.date}T12:00:00` : invoiceAt(inv),
        timestamp: "",
        href: invoicesHref({ highlight: inv.invoiceNumber }),
      });
    }
  }

  return items;
}

/**
 * Append Supabase-backed events: clients, matters, time entries.
 */
export async function fetchModuleActivityEvents(): Promise<ActivityItem[]> {
  const supabase = createClientSafe();
  if (!supabase) return [];

  const items: ActivityItem[] = [];

  try {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, first_name, last_name, company_name, created_at")
      .order("created_at", { ascending: false })
      .limit(8);

    for (const c of clients ?? []) {
      const name =
        String((c as { name?: string }).name || "").trim() ||
        [ (c as { first_name?: string }).first_name, (c as { last_name?: string }).last_name ]
          .filter(Boolean)
          .join(" ") ||
        String((c as { company_name?: string }).company_name || "New client");
      const at = String((c as { created_at?: string }).created_at || "");
      if (!at) continue;
      items.push({
        id: `client-${String((c as { id: string }).id)}`,
        action: "Client Created",
        detail: name,
        at,
        timestamp: "",
        href: `/clients/${String((c as { id: string }).id)}`,
      });
    }

    const { data: matters } = await supabase
      .from("matters")
      .select("id, title, client_id, created_at, status")
      .order("created_at", { ascending: false })
      .limit(8);

    for (const m of matters ?? []) {
      const at = String((m as { created_at?: string }).created_at || "");
      if (!at) continue;
      const id = String((m as { id: string }).id);
      const clientId = (m as { client_id?: string | null }).client_id;
      items.push({
        id: `matter-${id}`,
        action: "Matter Created",
        detail: String((m as { title?: string }).title || "Matter"),
        at,
        timestamp: "",
        href: clientId ? `/clients/${clientId}` : "/matters",
      });
    }

    const { data: times } = await supabase
      .from("time_entries")
      .select(
        "id, hours, status, is_billable, created_at, updated_at, matter:matters(title)",
      )
      .order("updated_at", { ascending: false })
      .limit(12);

    for (const t of times ?? []) {
      const status = String((t as { status?: string }).status || "").toLowerCase();
      const matter = (t as { matter?: { title?: string } | { title?: string }[] })
        .matter;
      const matterTitle = Array.isArray(matter)
        ? matter[0]?.title
        : matter?.title;
      const hours = Number((t as { hours?: number }).hours) || 0;
      const updated = String(
        (t as { updated_at?: string }).updated_at ||
          (t as { created_at?: string }).created_at ||
          "",
      );
      if (!updated) continue;
      const id = String((t as { id: string }).id);

      if (status === "approved") {
        items.push({
          id: `time-approved-${id}`,
          action: "Time Approved",
          detail: `${hours}h approved${matterTitle ? ` on ${matterTitle}` : ""}`,
          at: updated,
          timestamp: "",
          href: "/attorney/time",
        });
      } else if (status === "pending") {
        items.push({
          id: `time-submitted-${id}`,
          action: "Time Submitted",
          detail: `${hours}h pending approval${matterTitle ? ` on ${matterTitle}` : ""}`,
          at: String((t as { created_at?: string }).created_at || updated),
          timestamp: "",
          href: "/attorney/time",
        });
      }
    }
  } catch {
    /* partial feed is OK */
  }

  return items;
}

/** Merge invoice + module events, newest first, limited. */
export async function buildRecentActivity(
  invoices: Invoice[],
  limit = 12,
): Promise<ActivityItem[]> {
  const merged = [
    ...activityFromInvoices(invoices),
    ...(await fetchModuleActivityEvents()),
  ];

  const now = new Date();
  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return merged.slice(0, limit).map((item) => ({
    ...item,
    timestamp: formatRelative(item.at, now),
  }));
}

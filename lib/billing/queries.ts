import { createClientSafe } from "@/lib/supabase/client";
import type { BillingDashboardData } from "@/lib/billing/types";

/**
 * Fallback when Supabase is unavailable. Live UI recomputes most KPIs
 * from the shared invoice catalog after refresh.
 */
const PLACEHOLDER_DATA: BillingDashboardData = {
  source: "placeholder",
  summary: {
    totalInvoices: 0,
    outstandingReceivable: 0,
    collectionsThisMonth: 0,
    overdueInvoices: 0,
  },
  revenueByAttorney: [],
  revenueByClient: [],
};

type InvoiceDbRow = {
  id: string;
  client_id: string;
  total_amount: number | string | null;
  amount_paid: number | string | null;
  amount_written_down: number | string | null;
  balance_due: number | string | null;
  status: string | null;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
};

type PaymentDbRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseAttorneyFromNotes(notes: string | null): string {
  if (!notes) return "Unassigned";
  try {
    const parsed = JSON.parse(notes) as { attorney?: string };
    return parsed.attorney?.trim() || "Unassigned";
  } catch {
    return "Unassigned";
  }
}

function startOfMonthIsoDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

/**
 * Loads billing metrics from firm invoices + payments (shared Supabase tables).
 */
export async function fetchBillingDashboard(): Promise<BillingDashboardData> {
  const supabase = createClientSafe();

  if (!supabase) {
    return PLACEHOLDER_DATA;
  }

  try {
    const [
      invoicesResult,
      paymentsResult,
      clientsResult,
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, client_id, total_amount, amount_paid, amount_written_down, balance_due, status, invoice_date, due_date, notes",
        ),
      supabase
        .from("payments")
        .select("id, amount, payment_date")
        .eq("status", "completed")
        .gte("payment_date", startOfMonthIsoDate()),
      supabase.from("clients").select("id, name"),
    ]);

    if (invoicesResult.error || paymentsResult.error || clientsResult.error) {
      return PLACEHOLDER_DATA;
    }

    const invoices = (invoicesResult.data ?? []) as InvoiceDbRow[];
    const payments = (paymentsResult.data ?? []) as PaymentDbRow[];
    const clients = (clientsResult.data ?? []) as ClientRow[];

    if (invoices.length === 0) {
      return { ...PLACEHOLDER_DATA, source: "supabase" };
    }

    const clientNameById = new Map(
      clients.map((c) => [c.id, String(c.name ?? "Unknown client")]),
    );

    const outstanding = invoices.reduce(
      (sum, inv) => sum + Math.max(0, num(inv.balance_due)),
      0,
    );

    const overdue = invoices.filter((inv) => {
      const status = (inv.status || "").toLowerCase();
      if (status === "overdue") return true;
      if (["cancelled", "void", "paid", "draft"].includes(status)) return false;
      const remaining = num(inv.balance_due);
      if (remaining <= 0) return false;
      if (!inv.due_date) return false;
      const due = new Date(`${inv.due_date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return due.getTime() < today.getTime();
    }).length;

    const revenueByAttorneyMap = new Map<
      string,
      { revenue: number; invoiceCount: number; name: string }
    >();
    const revenueByClientMap = new Map<
      string,
      { revenue: number; openBalance: number; name: string }
    >();

    for (const inv of invoices) {
      const net =
        num(inv.total_amount) - num(inv.amount_written_down);
      const attorneyName = parseAttorneyFromNotes(inv.notes);
      const attorneyId = attorneyName.toLowerCase().replace(/\s+/g, "-");
      const clientId = String(inv.client_id ?? "unknown");

      const attorneyEntry = revenueByAttorneyMap.get(attorneyId) ?? {
        revenue: 0,
        invoiceCount: 0,
        name: attorneyName,
      };
      attorneyEntry.revenue += net;
      attorneyEntry.invoiceCount += 1;
      revenueByAttorneyMap.set(attorneyId, attorneyEntry);

      const clientEntry = revenueByClientMap.get(clientId) ?? {
        revenue: 0,
        openBalance: 0,
        name: clientNameById.get(clientId) ?? "Unknown client",
      };
      clientEntry.revenue += net;
      clientEntry.openBalance += Math.max(0, num(inv.balance_due));
      revenueByClientMap.set(clientId, clientEntry);
    }

    return {
      source: "supabase",
      summary: {
        totalInvoices: invoices.length,
        outstandingReceivable: outstanding,
        collectionsThisMonth: payments.reduce(
          (sum, p) => sum + num(p.amount),
          0,
        ),
        overdueInvoices: overdue,
      },
      revenueByAttorney: Array.from(revenueByAttorneyMap.entries())
        .map(([attorneyId, value]) => ({
          attorneyId,
          attorneyName: value.name,
          revenue: value.revenue,
          invoiceCount: value.invoiceCount,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      revenueByClient: Array.from(revenueByClientMap.entries())
        .map(([clientId, value]) => ({
          clientId,
          clientName: value.name,
          revenue: value.revenue,
          openBalance: value.openBalance,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  } catch {
    return PLACEHOLDER_DATA;
  }
}

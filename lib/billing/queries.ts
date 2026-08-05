import { createClientSafe } from "@/lib/supabase/client";
import { INVOICE_SEED } from "@/lib/billing/invoice-seed";
import type { BillingDashboardData } from "@/lib/billing/types";

/**
 * Placeholder datasets used when Supabase tables are not yet wired.
 * totalInvoices starts from seed invoice catalog length; the dashboard
 * client layer recomputes live metrics for the selected billing period.
 */
const PLACEHOLDER_DATA: BillingDashboardData = {
  source: "placeholder",
  summary: {
    totalInvoices: INVOICE_SEED.length,
    outstandingReceivable: 0,
    collectionsThisMonth: 0,
    overdueInvoices: 0,
  },
  revenueByAttorney: [],
  revenueByClient: [],
};

type BillingInvoiceRow = {
  id: string;
  amount: number | null;
  status: string | null;
  attorney_id: string | null;
  client_id: string | null;
};

type BillingPaymentRow = {
  id: string;
  amount: number | null;
  paid_at: string | null;
};

type BillingNameRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
};

/**
 * Loads billing metrics for the dashboard.
 * Attempts Supabase first; falls back to placeholder data if tables
 * are missing or the client is not configured.
 */
export async function fetchBillingDashboard(): Promise<BillingDashboardData> {
  const supabase = createClientSafe();

  if (!supabase) {
    return PLACEHOLDER_DATA;
  }

  try {
    // Placeholder Supabase queries — wire to real schema when ready.
    // Expected shape (example):
    // invoices: id, amount, status ('paid' | 'open' | 'overdue'), issued_at, attorney_id, client_id
    // payments: id, invoice_id, amount, paid_at
    const [
      invoicesResult,
      paymentsResult,
      attorneysResult,
      clientsResult,
    ] = await Promise.all([
      supabase.from("invoices").select("id, amount, status, attorney_id, client_id"),
      supabase
        .from("payments")
        .select("id, amount, paid_at")
        .gte("paid_at", startOfMonthIso()),
      supabase.from("attorneys").select("id, full_name"),
      supabase.from("clients").select("id, name"),
    ]);

    if (
      invoicesResult.error ||
      paymentsResult.error ||
      attorneysResult.error ||
      clientsResult.error
    ) {
      return PLACEHOLDER_DATA;
    }

    const invoices = (invoicesResult.data ?? []) as BillingInvoiceRow[];
    const payments = (paymentsResult.data ?? []) as BillingPaymentRow[];
    const attorneys = (attorneysResult.data ?? []) as BillingNameRow[];
    const clients = (clientsResult.data ?? []) as BillingNameRow[];

    if (invoices.length === 0) {
      return PLACEHOLDER_DATA;
    }

    const outstanding = invoices
      .filter((inv) => inv.status === "open" || inv.status === "overdue")
      .reduce((sum, inv) => sum + Number(inv.amount ?? 0), 0);

    const overdue = invoices.filter((inv) => inv.status === "overdue").length;

    const attorneyNameById = new Map(
      attorneys.map((a) => [a.id, String(a.full_name ?? "Unassigned")]),
    );
    const clientNameById = new Map(
      clients.map((c) => [c.id, String(c.name ?? "Unknown client")]),
    );

    const revenueByAttorneyMap = new Map<
      string,
      { revenue: number; invoiceCount: number; name: string }
    >();
    const revenueByClientMap = new Map<
      string,
      { revenue: number; openBalance: number; name: string }
    >();

    for (const inv of invoices) {
      const amount = Number(inv.amount ?? 0);
      const attorneyId = String(inv.attorney_id ?? "unknown");
      const clientId = String(inv.client_id ?? "unknown");

      const attorneyEntry = revenueByAttorneyMap.get(attorneyId) ?? {
        revenue: 0,
        invoiceCount: 0,
        name: attorneyNameById.get(attorneyId) ?? "Unassigned",
      };
      attorneyEntry.revenue += amount;
      attorneyEntry.invoiceCount += 1;
      revenueByAttorneyMap.set(attorneyId, attorneyEntry);

      const clientEntry = revenueByClientMap.get(clientId) ?? {
        revenue: 0,
        openBalance: 0,
        name: clientNameById.get(clientId) ?? "Unknown client",
      };
      clientEntry.revenue += amount;
      if (inv.status === "open" || inv.status === "overdue") {
        clientEntry.openBalance += amount;
      }
      revenueByClientMap.set(clientId, clientEntry);
    }

    return {
      source: "supabase",
      summary: {
        totalInvoices: invoices.length,
        outstandingReceivable: outstanding,
        collectionsThisMonth: payments.reduce(
          (sum, p) => sum + Number(p.amount ?? 0),
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

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Matter profitability from Billing catalog revenue + Time & Expenses cost signals.
 * No duplicate invoice or time stores.
 */

import { createClientSafe } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/billing/invoice-types";

export type MatterProfitabilityRow = {
  matterId: string | null;
  matterName: string;
  clientId: string | null;
  revenue: number;
  /** Billable effort cost ≈ approved billable hours × matter hourly rate */
  billableCost: number;
  profit: number;
  margin: number;
  href: string;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Revenue = sum of invoice totalAmount by legalMatter (excl. Cancelled).
 * Cost = approved billable time × matter.hourly_rate (+ approved expenses optional).
 */
export async function buildMatterProfitability(
  invoices: Invoice[],
  limit = 8,
): Promise<{ rows: MatterProfitabilityRow[]; error: string | null }> {
  const revenueByMatter = new Map<string, number>();

  for (const inv of invoices) {
    if (inv.status === "Cancelled") continue;
    const key = inv.legalMatter?.trim() || "Unassigned matter";
    const prev = revenueByMatter.get(key) ?? 0;
    revenueByMatter.set(key, prev + (Number(inv.totalAmount) || 0));
  }

  const costByMatter = new Map<string, number>();
  const metaByMatter = new Map<
    string,
    { id: string; clientId: string | null }
  >();

  const supabase = createClientSafe();
  if (supabase) {
    try {
      const { data: matters, error: matterError } = await supabase
        .from("matters")
        .select("id, title, client_id, hourly_rate");

      if (!matterError && matters) {
        for (const m of matters) {
          const title = String((m as { title?: string }).title || "").trim();
          if (!title) continue;
          metaByMatter.set(normalizeName(title), {
            id: String((m as { id: string }).id),
            clientId:
              (m as { client_id?: string | null }).client_id != null
                ? String((m as { client_id: string }).client_id)
                : null,
          });
        }

        const rateById = new Map<string, number>();
        const titleById = new Map<string, string>();
        for (const m of matters) {
          const id = String((m as { id: string }).id);
          rateById.set(
            id,
            Number((m as { hourly_rate?: number | null }).hourly_rate) || 0,
          );
          titleById.set(
            id,
            String((m as { title?: string }).title || "Untitled matter"),
          );
        }

        const { data: times } = await supabase
          .from("time_entries")
          .select("matter_id, hours, status, is_billable")
          .eq("status", "approved")
          .eq("is_billable", true);

        for (const t of times ?? []) {
          const matterId = String((t as { matter_id?: string }).matter_id || "");
          const title = titleById.get(matterId);
          if (!title) continue;
          const hours = Number((t as { hours?: number }).hours) || 0;
          const rate = rateById.get(matterId) ?? 0;
          const cost = hours * rate;
          const prev = costByMatter.get(title) ?? 0;
          costByMatter.set(title, prev + cost);
        }

        const { data: expenses } = await supabase
          .from("expense_submissions")
          .select("matter_id, amount, status")
          .eq("status", "approved");

        for (const e of expenses ?? []) {
          const matterId = String((e as { matter_id?: string }).matter_id || "");
          const title = titleById.get(matterId);
          if (!title) continue;
          const amount = Number((e as { amount?: number }).amount) || 0;
          const prev = costByMatter.get(title) ?? 0;
          costByMatter.set(title, prev + amount);
        }
      }
    } catch {
      /* revenue-only fallback below */
    }
  }

  const names = new Set<string>([
    ...revenueByMatter.keys(),
    ...costByMatter.keys(),
  ]);

  const rows: MatterProfitabilityRow[] = [];
  for (const matterName of names) {
    const revenue = Math.round((revenueByMatter.get(matterName) ?? 0) * 100) / 100;
    const billableCost =
      Math.round((costByMatter.get(matterName) ?? 0) * 100) / 100;
    const profit = Math.round((revenue - billableCost) * 100) / 100;
    const margin =
      revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
    const meta = metaByMatter.get(normalizeName(matterName));
    rows.push({
      matterId: meta?.id ?? null,
      matterName,
      clientId: meta?.clientId ?? null,
      revenue,
      billableCost,
      profit,
      margin,
      href: meta?.clientId
        ? `/clients/${meta.clientId}`
        : meta?.id
          ? "/matters"
          : "/matters",
    });
  }

  rows.sort((a, b) => b.revenue - a.revenue);

  return {
    rows: rows.slice(0, limit),
    error: null,
  };
}

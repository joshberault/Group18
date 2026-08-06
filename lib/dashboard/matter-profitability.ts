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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Revenue = sum of invoice totalAmount grouped by matter_id when present
 * (else legalMatter title snapshot). Excludes Cancelled.
 * Cost = approved billable time × matter.hourly_rate (+ approved expenses).
 */
export async function buildMatterProfitability(
  invoices: Invoice[],
  limit = 8,
): Promise<{ rows: MatterProfitabilityRow[]; error: string | null }> {
  type Agg = {
    matterId: string | null;
    matterName: string;
    clientId: string | null;
    revenue: number;
  };

  /** Key: matter UUID when known, else `title:<normalized>`. */
  const revenueGroups = new Map<string, Agg>();

  for (const inv of invoices) {
    if (inv.status === "Cancelled") continue;
    const matterId = inv.matterId && isUuid(inv.matterId) ? inv.matterId : null;
    const name =
      inv.legalMatter?.trim() ||
      (matterId ? "Untitled matter" : "Unassigned matter");
    const key = matterId ?? `title:${normalizeName(name)}`;
    const prev = revenueGroups.get(key);
    if (prev) {
      prev.revenue += Number(inv.totalAmount) || 0;
      if (!prev.matterName && name) prev.matterName = name;
      if (!prev.clientId && inv.clientId) prev.clientId = inv.clientId;
      if (!prev.matterId && matterId) prev.matterId = matterId;
    } else {
      revenueGroups.set(key, {
        matterId,
        matterName: name,
        clientId: inv.clientId && isUuid(inv.clientId) ? inv.clientId : null,
        revenue: Number(inv.totalAmount) || 0,
      });
    }
  }

  const costByMatterId = new Map<string, number>();
  const titleById = new Map<string, string>();
  const clientById = new Map<string, string | null>();
  const rateById = new Map<string, number>();

  const supabase = createClientSafe();
  if (supabase) {
    try {
      const { data: matters, error: matterError } = await supabase
        .from("matters")
        .select("id, title, client_id, hourly_rate");

      if (!matterError && matters) {
        for (const m of matters) {
          const id = String((m as { id: string }).id);
          const title =
            String((m as { title?: string }).title || "").trim() ||
            "Untitled matter";
          titleById.set(id, title);
          rateById.set(
            id,
            Number((m as { hourly_rate?: number | null }).hourly_rate) || 0,
          );
          clientById.set(
            id,
            (m as { client_id?: string | null }).client_id != null
              ? String((m as { client_id: string }).client_id)
              : null,
          );
        }

        // Prefer live titles from matters for invoice groups keyed by uuid
        for (const [key, agg] of revenueGroups) {
          if (agg.matterId && titleById.has(agg.matterId)) {
            agg.matterName = titleById.get(agg.matterId)!;
            if (!agg.clientId) {
              agg.clientId = clientById.get(agg.matterId) ?? null;
            }
            // keep group as-is under uuid key
            void key;
          }
        }

        const { data: times } = await supabase
          .from("time_entries")
          .select("matter_id, hours, status, is_billable")
          .eq("status", "approved")
          .eq("is_billable", true);

        for (const t of times ?? []) {
          const matterId = String((t as { matter_id?: string }).matter_id || "");
          if (!matterId || !titleById.has(matterId)) continue;
          const hours = Number((t as { hours?: number }).hours) || 0;
          const rate = rateById.get(matterId) ?? 0;
          const prev = costByMatterId.get(matterId) ?? 0;
          costByMatterId.set(matterId, prev + hours * rate);
        }

        const { data: expenses } = await supabase
          .from("expense_submissions")
          .select("matter_id, amount, status")
          .eq("status", "approved");

        for (const e of expenses ?? []) {
          const matterId = String((e as { matter_id?: string }).matter_id || "");
          if (!matterId || !titleById.has(matterId)) continue;
          const amount = Number((e as { amount?: number }).amount) || 0;
          const prev = costByMatterId.get(matterId) ?? 0;
          costByMatterId.set(matterId, prev + amount);
        }
      }
    } catch {
      /* revenue-only fallback below */
    }
  }

  // Fold cost-only matters into the result set
  for (const [matterId, cost] of costByMatterId) {
    if (cost <= 0) continue;
    if (revenueGroups.has(matterId)) continue;
    // Match legacy invoices that only had a title snapshot
    const title = titleById.get(matterId) || "Untitled matter";
    const titleKey = `title:${normalizeName(title)}`;
    if (revenueGroups.has(titleKey)) {
      const agg = revenueGroups.get(titleKey)!;
      agg.matterId = matterId;
      agg.matterName = title;
      if (!agg.clientId) agg.clientId = clientById.get(matterId) ?? null;
      // Move under uuid key when possible
      revenueGroups.delete(titleKey);
      revenueGroups.set(matterId, agg);
      continue;
    }
    revenueGroups.set(matterId, {
      matterId,
      matterName: title,
      clientId: clientById.get(matterId) ?? null,
      revenue: 0,
    });
  }

  const rows: MatterProfitabilityRow[] = [];
  for (const agg of revenueGroups.values()) {
    const costKey = agg.matterId;
    const billableCost =
      Math.round(
        ((costKey ? costByMatterId.get(costKey) : undefined) ?? 0) * 100,
      ) / 100;
    const revenue = Math.round(agg.revenue * 100) / 100;
    const profit = Math.round((revenue - billableCost) * 100) / 100;
    const margin =
      revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
    rows.push({
      matterId: agg.matterId,
      matterName: agg.matterName,
      clientId: agg.clientId,
      revenue,
      billableCost,
      profit,
      margin,
      href: agg.clientId
        ? `/clients/${agg.clientId}`
        : agg.matterId
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

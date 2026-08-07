import { createClientSafe } from "@/lib/supabase/client";
import type { Invoice } from "@/lib/billing/invoice-types";
import {
  getOutstandingReceivables,
  getReceivablesSummary,
} from "@/lib/billing/receivables-utils";
import {
  getCollectionsThisMonthTotal,
  getFullyPaidInvoices,
} from "@/lib/billing/collections-utils";
import { fetchFirmApprovedUnbilledHours } from "@/lib/billing/matter-wip";

export type TrustFundsDisplay =
  | { kind: "amount"; value: number }
  | { kind: "unavailable"; message: string };

/**
 * Count of active (open) matters from CounselFlow matters table.
 * Returns null when Supabase is unavailable or the query fails.
 */
export async function fetchActiveOpenMattersCount(): Promise<number | null> {
  const supabase = createClientSafe();
  if (!supabase) return null;

  try {
    const { count, error } = await supabase
      .from("matters")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");

    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/**
 * Approved billable hours not already on a managed invoice.
 */
export async function resolveUnbilledApprovedHours(): Promise<{
  hours: number;
  source: "time_entries" | "empty";
}> {
  const live = await fetchFirmApprovedUnbilledHours();
  if (live != null) {
    return {
      hours: live,
      source: live > 0 ? "time_entries" : "empty",
    };
  }
  return { hours: 0, source: "empty" };
}

/** Outstanding AR from shared managed invoice catalog (same as AR module). */
export function getOutstandingArTotal(invoices: Invoice[]): number {
  const rows = getOutstandingReceivables(invoices);
  return getReceivablesSummary(rows).totalOutstanding;
}

/** Collections this month from fully paid invoices in the catalog. */
export function getMonthlyCollectionsPaidTotal(invoices: Invoice[]): number {
  return getCollectionsThisMonthTotal(getFullyPaidInvoices(invoices));
}

/** Sum of client trust ledger balances from Supabase. */
export async function fetchTrustFundsHeldTotal(): Promise<TrustFundsDisplay> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { kind: "unavailable", message: "No trust data available" };
  }

  try {
    const { data, error } = await supabase
      .from("trust_client_ledgers")
      .select("balance");

    if (error) {
      return { kind: "unavailable", message: "No trust data available" };
    }

    const total = (data ?? []).reduce(
      (sum, row) => sum + Number((row as { balance?: number }).balance ?? 0),
      0,
    );

    if (total <= 0 && (data ?? []).length === 0) {
      const { data: accounts } = await supabase
        .from("trust_accounts")
        .select("balance");
      const accountTotal = (accounts ?? []).reduce(
        (sum, row) => sum + Number((row as { balance?: number }).balance ?? 0),
        0,
      );
      if (accountTotal > 0) {
        return { kind: "amount", value: accountTotal };
      }
    }

    return { kind: "amount", value: total };
  } catch {
    return { kind: "unavailable", message: "No trust data available" };
  }
}

/** @deprecated Prefer fetchTrustFundsHeldTotal for live dashboards. */
export function getTrustFundsHeldDisplay(): TrustFundsDisplay {
  return {
    kind: "unavailable",
    message: "No trust data available",
  };
}

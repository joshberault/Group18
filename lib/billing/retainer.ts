/**
 * Matter retainers from CounselFlow matters table.
 * No separate trust ledger — use matters.retainer_balance.
 */

import { createClientSafe } from "@/lib/supabase/client";

export type ClientRetainerSummary = {
  /** Sum of retainer_balance across the client's matters */
  totalBalance: number;
  matterCount: number;
  message: string | null;
};

export type MatterRetainerSummary = {
  matterId: string;
  balance: number;
  amount: number | null;
  message: string | null;
};

/**
 * Total retainer balance available for a firm client (sum of matter balances).
 * Alias: sum of retainer_balance across the client's matters.
 */
export async function fetchClientRetainerBalance(
  firmClientId: string,
): Promise<ClientRetainerSummary> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      totalBalance: 0,
      matterCount: 0,
      message:
        "Supabase is not configured. Trust/retainer balances cannot be loaded.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("matters")
      .select("id, retainer_balance")
      .eq("client_id", firmClientId);

    if (error) {
      return {
        totalBalance: 0,
        matterCount: 0,
        message: `Could not load retainers: ${error.message}`,
      };
    }

    const rows = data ?? [];
    const totalBalance = rows.reduce(
      (sum, row) => sum + (Number(row.retainer_balance) || 0),
      0,
    );

    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      matterCount: rows.length,
      message:
        rows.length === 0
          ? "This client has no matters with retainer balances yet."
          : null,
    };
  } catch (err) {
    return {
      totalBalance: 0,
      matterCount: 0,
      message:
        err instanceof Error
          ? err.message
          : "Could not load client retainers.",
    };
  }
}

/** Optional alias — same as fetchClientRetainerBalance. */
export const sumClientRetainerBalances = fetchClientRetainerBalance;

/**
 * Retainer balance for a single matter (authoritative for applying to an invoice).
 */
export async function fetchMatterRetainerBalance(
  matterId: string,
): Promise<MatterRetainerSummary> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      matterId,
      balance: 0,
      amount: null,
      message: "Supabase is not configured.",
    };
  }

  try {
    const { data, error } = await supabase
      .from("matters")
      .select("id, retainer_balance, retainer_amount")
      .eq("id", matterId)
      .maybeSingle();

    if (error) {
      return {
        matterId,
        balance: 0,
        amount: null,
        message: error.message,
      };
    }

    const balance = Number(data?.retainer_balance) || 0;
    const amount =
      data?.retainer_amount != null ? Number(data.retainer_amount) : null;

    return {
      matterId,
      balance: Math.round(balance * 100) / 100,
      amount: amount != null && Number.isFinite(amount) ? amount : null,
      message: null,
    };
  } catch (err) {
    return {
      matterId,
      balance: 0,
      amount: null,
      message:
        err instanceof Error ? err.message : "Could not load matter retainer.",
    };
  }
}

/**
 * Reduce matter retainer_balance after applying funds to an invoice.
 * Returns the new remaining balance when update succeeds.
 */
export async function applyRetainerToMatter(
  matterId: string,
  applyAmount: number,
): Promise<{
  ok: boolean;
  remainingBalance: number;
  error?: string;
}> {
  const amount = Math.round(Math.max(0, applyAmount) * 100) / 100;
  if (amount <= 0) {
    const current = await fetchMatterRetainerBalance(matterId);
    return { ok: true, remainingBalance: current.balance };
  }

  const supabase = createClientSafe();
  if (!supabase) {
    return {
      ok: false,
      remainingBalance: 0,
      error: "Supabase is not configured; retainer could not be updated.",
    };
  }

  try {
    const current = await fetchMatterRetainerBalance(matterId);
    if (current.message && current.balance === 0) {
      return {
        ok: false,
        remainingBalance: 0,
        error: current.message,
      };
    }

    if (amount > current.balance + 0.001) {
      return {
        ok: false,
        remainingBalance: current.balance,
        error: `Cannot apply ${amount}: only ${current.balance} available on this matter.`,
      };
    }

    const remaining =
      Math.round(Math.max(0, current.balance - amount) * 100) / 100;

    const { error } = await supabase
      .from("matters")
      .update({ retainer_balance: remaining })
      .eq("id", matterId);

    if (error) {
      return {
        ok: false,
        remainingBalance: current.balance,
        error: error.message,
      };
    }

    return { ok: true, remainingBalance: remaining };
  } catch (err) {
    return {
      ok: false,
      remainingBalance: 0,
      error:
        err instanceof Error ? err.message : "Failed to update matter retainer.",
    };
  }
}

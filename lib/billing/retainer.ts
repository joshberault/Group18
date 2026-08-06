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

export type ClientRetainerUsage = {
  /** True when the client has at least one matter with an initial retainer amount. */
  hasRetainer: boolean;
  clientId: string | null;
  initialAmount: number;
  remainingBalance: number;
  amountUsed: number;
  /** 0–100 */
  percentUsed: number;
  message: string | null;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

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
      totalBalance: roundMoney(totalBalance),
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
 * Initial / remaining / used retainer totals for Account Summary.
 * Only matters with a positive retainer_amount count as having a retainer.
 * Does not invent or seed demo balances.
 */
export async function fetchClientRetainerUsage(input: {
  clientNumber?: string | null;
  clientName?: string | null;
}): Promise<ClientRetainerUsage> {
  const empty: ClientRetainerUsage = {
    hasRetainer: false,
    clientId: null,
    initialAmount: 0,
    remainingBalance: 0,
    amountUsed: 0,
    percentUsed: 0,
    message: null,
  };

  const supabase = createClientSafe();
  if (!supabase) {
    return {
      ...empty,
      message:
        "Supabase is not configured. Retainer balances cannot be loaded.",
    };
  }

  const clientNumber = input.clientNumber?.trim() ?? "";
  const clientName = input.clientName?.trim() ?? "";

  try {
    let clientId: string | null = null;

    if (clientNumber) {
      const { data, error } = await supabase
        .from("clients")
        .select("id")
        .eq("client_number", clientNumber)
        .maybeSingle();
      if (error) {
        return { ...empty, message: error.message };
      }
      clientId = (data?.id as string | undefined) ?? null;
    }

    if (!clientId && clientName) {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .ilike("name", clientName)
        .limit(1)
        .maybeSingle();
      if (error) {
        return { ...empty, message: error.message };
      }
      clientId = (data?.id as string | undefined) ?? null;
    }

    if (!clientId) {
      return empty;
    }

    const { data: matters, error: mattersError } = await supabase
      .from("matters")
      .select("id, title, retainer_amount, retainer_balance, billing_type")
      .eq("client_id", clientId);

    if (mattersError) {
      return { ...empty, clientId, message: mattersError.message };
    }

    const retainerMatters = (matters ?? []).filter((row) => {
      const initial = Number(row.retainer_amount);
      return Number.isFinite(initial) && initial > 0;
    });

    if (retainerMatters.length === 0) {
      return { ...empty, clientId };
    }

    const initialAmount = roundMoney(
      retainerMatters.reduce(
        (sum, row) => sum + (Number(row.retainer_amount) || 0),
        0,
      ),
    );
    const remainingBalance = roundMoney(
      retainerMatters.reduce((sum, row) => {
        const balance = Number(row.retainer_balance);
        return sum + (Number.isFinite(balance) ? Math.max(0, balance) : 0);
      }, 0),
    );
    const amountUsed = roundMoney(
      Math.max(0, initialAmount - remainingBalance),
    );
    const percentUsed =
      initialAmount > 0
        ? Math.min(100, Math.round((amountUsed / initialAmount) * 1000) / 10)
        : 0;

    return {
      hasRetainer: true,
      clientId,
      initialAmount,
      remainingBalance,
      amountUsed,
      percentUsed,
      message: null,
    };
  } catch (err) {
    return {
      ...empty,
      message:
        err instanceof Error
          ? err.message
          : "Could not load retainer usage.",
    };
  }
}

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
      balance: roundMoney(balance),
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
  const amount = roundMoney(Math.max(0, applyAmount));
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

    const remaining = roundMoney(Math.max(0, current.balance - amount));

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

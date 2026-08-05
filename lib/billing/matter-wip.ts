/**
 * Time & Expenses WIP for Generate Invoice.
 * Reuses Supabase time_entries / expense_submissions (attorney Time & Expenses module).
 * “Billed” is derived from Invoice Management catalog entry IDs (no billed column on tables).
 */

import { createClientSafe } from "@/lib/supabase/client";
import type {
  GenerateMatter,
  TimeApprovalStatus,
  UnbilledExpense,
  UnbilledTimeEntry,
} from "@/lib/billing/generate-invoice-types";
import {
  getInvoicedExpenseIds,
  getInvoicedTimeEntryIds,
} from "@/lib/billing/invoice-management-store";

type ProfileJoin = {
  full_name?: string | null;
  role?: string | null;
} | null;

function mapApprovalStatus(value: string | null | undefined): TimeApprovalStatus {
  const t = (value ?? "").toLowerCase();
  if (t === "approved") return "Approved";
  if (t === "rejected") return "Rejected";
  return "Pending";
}

function mapRole(role: string | null | undefined): "Attorney" | "Staff" {
  const t = (role ?? "").toLowerCase();
  if (
    t === "attorney" ||
    t === "admin" ||
    t === "manager" ||
    t === "firm_administrator"
  ) {
    return "Attorney";
  }
  return "Staff";
}

export type MatterWipResult = {
  matter: GenerateMatter;
  message: string | null;
  source: "counselflow" | "empty" | "error";
};

/**
 * Load approved billable time + approved expenses for a CounselFlow matter
 * and attach them to the Generate Invoice matter shape.
 */
export async function hydrateMatterWithModuleWip(
  base: GenerateMatter,
): Promise<MatterWipResult> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      matter: {
        ...base,
        timeEntries: [],
        expenses: [],
      },
      source: "error",
      message:
        "Supabase is not configured. Open Time & Expenses after configuring CounselFlow to load billable hours.",
    };
  }

  const billedTime = getInvoicedTimeEntryIds();
  const billedExpenses = getInvoicedExpenseIds();

  try {
    const { data: matterRow, error: matterError } = await supabase
      .from("matters")
      .select(
        "id, title, status, hourly_rate, retainer_balance, billing_type",
      )
      .eq("id", base.id)
      .maybeSingle();

    if (matterError) {
      return {
        matter: { ...base, timeEntries: [], expenses: [] },
        source: "error",
        message: `Could not load matter details: ${matterError.message}`,
      };
    }

    const hourlyRate = Number(matterRow?.hourly_rate) || 0;

    const { data: timeRows, error: timeError } = await supabase
      .from("time_entries")
      .select(
        "id, entry_date, hours, description, is_billable, status, profile_id",
      )
      .eq("matter_id", base.id)
      .eq("is_billable", true)
      .order("entry_date", { ascending: false });

    if (timeError) {
      return {
        matter: { ...base, timeEntries: [], expenses: [] },
        source: "error",
        message: `Could not load time entries: ${timeError.message}`,
      };
    }

    const profileIds = [
      ...new Set(
        (timeRows ?? [])
          .map((row) => String((row as { profile_id?: string }).profile_id || ""))
          .filter(Boolean),
      ),
    ];

    const profileById = new Map<string, ProfileJoin>();
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", profileIds);
      for (const p of profiles ?? []) {
        profileById.set(String((p as { id: string }).id), {
          full_name: (p as { full_name?: string | null }).full_name,
          role: (p as { role?: string | null }).role,
        });
      }
    }

    const { data: expenseRows, error: expenseError } = await supabase
      .from("expense_submissions")
      .select("id, expense_date, amount, description, status")
      .eq("matter_id", base.id)
      .order("expense_date", { ascending: false });

    if (expenseError) {
      // Expenses are optional for invoice min requirement — continue with time only
      console.warn("expense_submissions:", expenseError.message);
    }

    const timeEntries: UnbilledTimeEntry[] = (timeRows ?? []).map((row) => {
      const profileId = String(
        (row as { profile_id?: string }).profile_id || "",
      );
      const profile = profileById.get(profileId) ?? null;
      const approvalStatus = mapApprovalStatus(
        (row as { status?: string }).status,
      );
      const id = String((row as { id: string }).id);
      return {
        id,
        date: String((row as { entry_date: string }).entry_date),
        person: profile?.full_name?.trim() || "Counsel",
        role: mapRole(profile?.role),
        description: String(
          (row as { description?: string }).description || "",
        ),
        hours: Number((row as { hours: number }).hours) || 0,
        rate: hourlyRate,
        approvalStatus,
        billed: billedTime.has(id),
      };
    });

    const expenses: UnbilledExpense[] = (expenseRows ?? []).map((row) => {
      const id = String((row as { id: string }).id);
      const status = String((row as { status?: string }).status || "").toLowerCase();
      return {
        id,
        date: String((row as { expense_date: string }).expense_date),
        category: "Matter expense",
        description: String(
          (row as { description?: string }).description || "",
        ),
        amount: Number((row as { amount: number }).amount) || 0,
        approved: status === "approved",
        billed: billedExpenses.has(id),
      };
    });

    const approvedUnbilled = timeEntries.filter(
      (t) => t.approvalStatus === "Approved" && !t.billed,
    );

    let message: string | null = null;
    if (timeEntries.length === 0) {
      message =
        "No billable time entries on this matter in Time & Expenses. Log and approve time for this matter first.";
    } else if (approvedUnbilled.length === 0) {
      message =
        "No approved, unbilled time remains for this matter. Pending/rejected lines are shown for context; finalize only after approval, or pick another matter.";
    } else if (hourlyRate <= 0) {
      message =
        "Approved time loaded, but this matter has no hourly rate set. Fees may show as $0 until a rate is maintained on the matter.";
    }

    return {
      matter: {
        ...base,
        matterName: matterRow?.title?.trim() || base.matterName,
        status:
          String(matterRow?.status || "").toLowerCase() === "closed" ||
          String(matterRow?.status || "").toLowerCase() === "archived"
            ? "Closed"
            : "Open",
        timeEntries,
        expenses,
        writeDowns: [],
        courtesyDiscountApproved: 0,
      },
      source: "counselflow",
      message,
    };
  } catch (err) {
    return {
      matter: { ...base, timeEntries: [], expenses: [] },
      source: "error",
      message:
        err instanceof Error
          ? err.message
          : "Unexpected error loading Time & Expenses for this matter.",
    };
  }
}

/**
 * Firm-wide approved billable hours not yet on a non-cancelled invoice.
 */
export async function fetchFirmApprovedUnbilledHours(): Promise<number | null> {
  const supabase = createClientSafe();
  if (!supabase) return null;

  try {
    const billed = getInvoicedTimeEntryIds();
    const { data, error } = await supabase
      .from("time_entries")
      .select("id, hours")
      .eq("status", "approved")
      .eq("is_billable", true);

    if (error || !data) return null;
    const total = data.reduce((sum, row) => {
      const id = String(row.id);
      if (billed.has(id)) return sum;
      return sum + (Number(row.hours) || 0);
    }, 0);
    return Math.round(total * 10) / 10;
  } catch {
    return null;
  }
}

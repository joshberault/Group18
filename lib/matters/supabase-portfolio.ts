import { createClientSafe } from "@/lib/supabase/client";
import type { ConflictCheckStatus } from "@/lib/clients/types";
import type {
  EngagementFeeType,
  FirmPortfolioMatter,
  MatterLifecycleStatus,
} from "@/lib/matters/firm-portfolio";

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapBillingType(billing: string | null | undefined): EngagementFeeType {
  switch ((billing ?? "").toLowerCase()) {
    case "fixed_fee":
    case "flat":
    case "flat_fee":
      return "flat";
    case "contingency":
      return "contingency";
    case "retainer":
      return "retainer";
    case "hybrid":
      return "hybrid";
    default:
      return "hourly";
  }
}

function mapStatus(status: string): MatterLifecycleStatus {
  if (status === "closed") return "closed";
  if (status === "archived") return "archived";
  return "open";
}

function mapConflict(flag: boolean, status: string | null): ConflictCheckStatus {
  if (flag) return "possible_conflict";
  if (status === "pending") return "pending";
  if (status === "cleared") return "cleared";
  return "not_reviewed";
}

export async function fetchFirmPortfolioMatters(): Promise<{
  data: FirmPortfolioMatter[];
  attorneys: string[];
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      data: [],
      attorneys: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    };
  }

  const [mattersRes, clientsRes, profilesRes, practiceRes, accountingRes] =
    await Promise.all([
      supabase
        .from("matters")
        .select(
          "id, client_id, title, description, status, billing_type, hourly_rate, fixed_fee_amount, created_at, practice_area_id",
        )
        .order("title"),
      supabase.from("clients").select("id, name, company_name, conflict_flag, conflict_check_status"),
      supabase.from("profiles").select("full_name, role").order("full_name"),
      supabase.from("practice_areas").select("id, name"),
      supabase.from("matter_accounting_profiles").select("*"),
    ]);

  if (mattersRes.error) {
    return { data: [], attorneys: [], error: mattersRes.error.message };
  }

  const clientMap = new Map(
    (clientsRes.data ?? []).map((c) => [c.id as string, c]),
  );
  const practiceMap = new Map(
    (practiceRes.data ?? []).map((p) => [p.id as string, p.name as string]),
  );
  const accountingMap = new Map(
    (accountingRes.data ?? []).map((p) => [p.matter_id as string, p]),
  );

  const attorneys = (profilesRes.data ?? [])
    .filter((p) => p.role === "attorney" || p.role === "manager")
    .map((p) => p.full_name as string);

  const rows: FirmPortfolioMatter[] = (mattersRes.data ?? []).map((m, index) => {
    const client = clientMap.get(m.client_id as string);
    const profile = accountingMap.get(m.id as string);
    const conflict = mapConflict(
      Boolean(client?.conflict_flag),
      (client?.conflict_check_status as string) ?? null,
    );
    const billingHold = Boolean(profile?.billing_hold);
    return {
      id: m.id as string,
      matterNumber: `M-${String(index + 1).padStart(4, "0")}`,
      title: m.title as string,
      clientId: m.client_id as string,
      clientName:
        (client?.company_name as string) ??
        (client?.name as string) ??
        "Unknown client",
      practiceArea:
        practiceMap.get(m.practice_area_id as string) ?? "General",
      responsibleAttorney: (profile?.billing_attorney as string) ?? null,
      originatingAttorney: (profile?.billing_attorney as string) ?? null,
      status: mapStatus(m.status as string),
      feeType: mapBillingType(m.billing_type as string),
      hourlyRate: m.hourly_rate != null ? asNumber(m.hourly_rate) : null,
      flatFeeAmount:
        m.fixed_fee_amount != null ? asNumber(m.fixed_fee_amount) : null,
      budgetCap: profile?.budget != null ? asNumber(profile.budget) : null,
      billingHold,
      conflictStatus: conflict,
      needsPartnerReview:
        billingHold ||
        !profile?.billing_attorney ||
        conflict !== "cleared",
      partnerReviewReason: billingHold
        ? "Billing hold in effect"
        : !profile?.billing_attorney
          ? "No responsible attorney assigned"
          : conflict !== "cleared"
            ? "Conflict clearance required"
            : null,
      openDate: (m.created_at as string)?.slice(0, 10) ?? "",
      engagementScope: (m.description as string) ?? (m.title as string),
    };
  });

  return { data: rows, attorneys, error: null };
}

export async function persistFirmPortfolioPatch(
  matterId: string,
  patch: Partial<{
    status: MatterLifecycleStatus;
    feeType: EngagementFeeType;
    hourlyRate: number | null;
    flatFeeAmount: number | null;
    budgetCap: number | null;
    billingHold: boolean;
    responsibleAttorney: string | null;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClientSafe();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  if (patch.status) {
    const dbStatus =
      patch.status === "closed"
        ? "closed"
        : patch.status === "archived"
          ? "archived"
          : "open";
    const { error } = await supabase
      .from("matters")
      .update({ status: dbStatus })
      .eq("id", matterId);
    if (error) return { ok: false, error: error.message };
  }

  const matterUpdates: Record<string, unknown> = {};
  if (patch.feeType) {
    matterUpdates.billing_type =
      patch.feeType === "flat"
        ? "fixed_fee"
        : patch.feeType === "contingency"
          ? "contingency"
          : patch.feeType === "retainer"
            ? "retainer"
            : "hourly";
  }
  if (patch.hourlyRate !== undefined) matterUpdates.hourly_rate = patch.hourlyRate;
  if (patch.flatFeeAmount !== undefined) {
    matterUpdates.fixed_fee_amount = patch.flatFeeAmount;
  }
  if (Object.keys(matterUpdates).length > 0) {
    const { error } = await supabase
      .from("matters")
      .update(matterUpdates)
      .eq("id", matterId);
    if (error) return { ok: false, error: error.message };
  }

  const profileUpdates: Record<string, unknown> = { matter_id: matterId };
  if (patch.budgetCap !== undefined) profileUpdates.budget = patch.budgetCap ?? 0;
  if (patch.billingHold !== undefined) profileUpdates.billing_hold = patch.billingHold;
  if (patch.responsibleAttorney !== undefined) {
    profileUpdates.billing_attorney = patch.responsibleAttorney;
  }
  if (Object.keys(profileUpdates).length > 1) {
    const { error } = await supabase
      .from("matter_accounting_profiles")
      .upsert(profileUpdates, { onConflict: "matter_id" });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

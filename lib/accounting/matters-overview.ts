import type { AmMatterEntity } from "@/lib/mock-data/accounting-manager/entities";
import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";

export async function fetchAccountingMatters(): Promise<
  QueryResult<AmMatterEntity[]>
> {
  const supabase = getAccountingSupabase();
  if (!supabase) {
    return { data: [], error: accountingUnavailableMessage(), empty: true };
  }

  const [mattersRes, clientsRes, profilesRes, trustRes, timeRes] =
    await Promise.all([
      supabase
        .from("matters")
        .select(
          "id, client_id, title, status, billing_type, hourly_rate, fixed_fee_amount, retainer_balance, practice_area_id",
        )
        .order("title"),
      supabase.from("clients").select("id, name"),
      supabase.from("matter_accounting_profiles").select("*"),
      supabase.from("trust_client_ledgers").select("matter_id, balance"),
      supabase
        .from("time_entries")
        .select("matter_id, hours, billable, approval_status, billed")
        .eq("approval_status", "approved")
        .eq("billed", false),
    ]);

  if (mattersRes.error) {
    return { data: [], error: mattersRes.error.message, empty: true };
  }

  const clientNames = new Map(
    ((clientsRes.data ?? []) as { id: string; name: string }[]).map((c) => [
      c.id,
      c.name,
    ]),
  );
  const profiles = new Map(
    (profilesRes.data ?? []).map((p) => [(p as { matter_id: string }).matter_id, p]),
  );
  const trustByMatter = new Map<string, number>();
  for (const t of trustRes.data ?? []) {
    if (t.matter_id) {
      trustByMatter.set(
        t.matter_id as string,
        asNumber(t.balance),
      );
    }
  }
  const wipByMatter = new Map<string, number>();
  for (const te of timeRes.data ?? []) {
    if (!te.billable) continue;
    const mid = te.matter_id as string;
    wipByMatter.set(
      mid,
      (wipByMatter.get(mid) ?? 0) + asNumber(te.hours) * 350,
    );
  }

  const rows: AmMatterEntity[] = (mattersRes.data ?? []).map((m, index) => {
    const profile = profiles.get(m.id as string) as
      | {
          billing_attorney?: string;
          budget?: number;
          billed_to_date?: number;
          collected_to_date?: number;
          margin_percent?: number;
          financial_status?: string;
          billing_hold?: boolean;
          minimum_retainer?: number;
        }
      | undefined;
    const billingMethod =
      m.billing_type === "fixed_fee"
        ? "Flat Fee"
        : m.billing_type === "retainer"
          ? "Hourly"
          : m.billing_type === "contingency"
            ? "Contingency"
            : "Hourly";
    return {
      id: m.id as string,
      matterNumber: `M-2024-${String(index + 1).padStart(4, "0")}`,
      matterName: m.title as string,
      clientId: m.client_id as string,
      client: clientNames.get(m.client_id as string) ?? "Client",
      attorney: profile?.billing_attorney ?? "Unassigned",
      practiceArea: "General",
      matterStatus:
        m.status === "closed"
          ? "Closed"
          : m.status === "archived"
            ? "Pending Close"
            : "Open",
      billingMethod: billingMethod as AmMatterEntity["billingMethod"],
      budget: asNumber(profile?.budget ?? m.fixed_fee_amount ?? 0),
      unbilledWip: wipByMatter.get(m.id as string) ?? 0,
      unbilledExpenses: 0,
      billedToDate: asNumber(profile?.billed_to_date ?? 0),
      collectedToDate: asNumber(profile?.collected_to_date ?? 0),
      trustBalance: trustByMatter.get(m.id as string) ?? asNumber(m.retainer_balance),
      marginPercent: asNumber(profile?.margin_percent ?? 0),
      financialStatus:
        (profile?.financial_status as AmMatterEntity["financialStatus"]) ??
        "On Track",
      billingHold: profile?.billing_hold ?? false,
      minimumRetainer: asNumber(profile?.minimum_retainer ?? m.retainer_balance),
    };
  });

  return { data: rows, error: null, empty: rows.length === 0 };
}

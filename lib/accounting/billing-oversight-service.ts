import type {
  BillingBottleneck,
  BillingHealthKpi,
  BillingMonthlyProgress,
  BillingQueueRecord,
} from "@/lib/mock-data/billing-oversight";
import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";

export async function fetchBillingOversightWorkspace(): Promise<
  QueryResult<{
    healthKpis: BillingHealthKpi[];
    monthlyProgress: BillingMonthlyProgress;
    bottlenecks: BillingBottleneck[];
    queueRecords: BillingQueueRecord[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = {
    healthKpis: [],
    monthlyProgress: {
      label: "August 2026",
      completed: 0,
      total: 0,
      percent: 0,
      billedAmount: 0,
      unbilledWip: 0,
    },
    bottlenecks: [],
    queueRecords: [],
  };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [mattersRes, clientsRes, profilesRes, invoicesRes, timeRes] =
    await Promise.all([
      supabase.from("matters").select("id, title, client_id, status, billing_type"),
      supabase.from("clients").select("id, name"),
      supabase.from("matter_accounting_profiles").select("matter_id, billing_attorney, billing_hold"),
      supabase
        .from("invoices")
        .select("id, matter_id, status, total_amount, updated_at")
        .in("status", ["draft", "sent"]),
      supabase
        .from("time_entries")
        .select("matter_id, hours, billable, approval_status, billed")
        .eq("approval_status", "approved")
        .eq("billed", false),
    ]);

  if (mattersRes.error) {
    return { data: empty, error: mattersRes.error.message, empty: true };
  }

  const clientNames = new Map(
    (clientsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const profiles = new Map(
    (profilesRes.data ?? []).map((p) => [p.matter_id as string, p]),
  );
  const wipByMatter = new Map<string, number>();
  for (const te of timeRes.data ?? []) {
    if (!te.billable) continue;
    const mid = te.matter_id as string;
    wipByMatter.set(mid, (wipByMatter.get(mid) ?? 0) + asNumber(te.hours) * 350);
  }
  const draftByMatter = new Map<string, number>();
  for (const inv of invoicesRes.data ?? []) {
    if (inv.status === "draft") {
      const mid = inv.matter_id as string;
      draftByMatter.set(mid, (draftByMatter.get(mid) ?? 0) + asNumber(inv.total_amount));
    }
  }

  const queueRecords: BillingQueueRecord[] = (mattersRes.data ?? [])
    .filter((m) => m.status === "open")
    .map((m, index) => {
      const profile = profiles.get(m.id as string);
      const wip = wipByMatter.get(m.id as string) ?? 0;
      const draft = draftByMatter.get(m.id as string) ?? 0;
      const onHold = Boolean(profile?.billing_hold);
      return {
        id: m.id as string,
        matter: m.title as string,
        client: clientNames.get(m.client_id as string) ?? "",
        attorney: (profile?.billing_attorney as string) ?? "Unassigned",
        billingCycle: "Monthly",
        unbilledWip: wip,
        draftAmount: draft,
        status: onHold
          ? "Returned for Correction"
          : draft > 0
            ? "Draft"
            : wip > 5000
              ? "Awaiting Attorney Review"
              : "Approved",
        daysWaiting: 0,
        lastUpdated: "",
        isException: onHold || wip > 10000,
        detail: {
          matterNumber: `M-2024-${String(index + 1).padStart(4, "0")}`,
          notes: onHold ? "Billing hold active" : "",
          lastAction: draft > 0 ? "Draft invoice in progress" : "WIP accumulating",
        },
      };
    });

  const unbilledWip = queueRecords.reduce((s, r) => s + r.unbilledWip, 0);
  const draftTotal = queueRecords.reduce((s, r) => s + r.draftAmount, 0);

  const healthKpis: BillingHealthKpi[] = [
    {
      id: "wip",
      title: "Unbilled WIP",
      value: `$${unbilledWip.toLocaleString()}`,
      supportingText: `${queueRecords.length} active matters`,
      warning: unbilledWip > 50000,
    },
    {
      id: "drafts",
      title: "Draft Prebills",
      value: `$${draftTotal.toLocaleString()}`,
      supportingText: "Awaiting review or send",
      warning: draftTotal > 0,
    },
  ];

  const bottlenecks: BillingBottleneck[] = [
    {
      id: "review",
      status: "Awaiting Attorney Review",
      count: queueRecords.filter((r) => r.status === "Awaiting Attorney Review").length,
      amount: queueRecords
        .filter((r) => r.status === "Awaiting Attorney Review")
        .reduce((s, r) => s + r.unbilledWip, 0),
      warning: true,
      queueStatusFilter: "Awaiting Attorney Review",
    },
    {
      id: "draft",
      status: "Draft",
      count: queueRecords.filter((r) => r.status === "Draft").length,
      amount: draftTotal,
      queueStatusFilter: "Draft",
    },
  ];

  return {
    data: {
      healthKpis,
      monthlyProgress: {
        label: "August 2026",
        completed: queueRecords.filter((r) => r.status === "Approved").length,
        total: queueRecords.length || 1,
        percent: Math.round(
          (queueRecords.filter((r) => r.status === "Approved").length /
            (queueRecords.length || 1)) *
            100,
        ),
        billedAmount: draftTotal,
        unbilledWip,
      },
      bottlenecks,
      queueRecords,
    },
    error: null,
    empty: queueRecords.length === 0,
  };
}

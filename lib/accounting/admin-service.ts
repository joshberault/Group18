import type {
  AccountingPeriod,
  ApprovalRule,
  BillingPaymentSettings,
  ChartOfAccount,
  IntegrationConfig,
  OfficeEntity,
} from "@/lib/mock-data/accounting-manager/administration";
import {
  accountingUnavailableMessage,
  getAccountingSupabase,
  type QueryResult,
} from "./db";

const DEFAULT_BILLING: BillingPaymentSettings = {
  defaultPaymentTerms: "Net 30",
  lateFeeEnabled: true,
  lateFeePercent: 1.5,
  lateFeeGraceDays: 10,
  billingCycleDefault: "Monthly",
  invoiceNumberFormat: "INV-{YYYY}-{SEQ}",
  acceptedPaymentMethods: ["Check", "ACH", "Wire", "Credit Card"],
  writeOffReasonCodes: ["Uncollectible", "Client Dispute", "Billing Error"],
  creditMemoReasonCodes: ["Overpayment", "Billing Adjustment"],
};

export async function fetchAdministrationWorkspace(): Promise<
  QueryResult<{
    periods: AccountingPeriod[];
    chartOfAccounts: ChartOfAccount[];
    approvalRules: ApprovalRule[];
    billingSettings: BillingPaymentSettings;
    offices: OfficeEntity[];
    integrations: IntegrationConfig[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = {
    periods: [],
    chartOfAccounts: [],
    approvalRules: [],
    billingSettings: DEFAULT_BILLING,
    offices: [],
    integrations: [],
  };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [periodsRes, coaRes, settingsRes, closeTasksRes] = await Promise.all([
    supabase.from("accounting_periods").select("*").order("start_date", { ascending: false }),
    supabase.from("chart_of_accounts").select("*").order("account_code"),
    supabase.from("accounting_settings").select("*"),
    supabase.from("month_end_close_tasks").select("period_id, status"),
  ]);

  if (periodsRes.error) {
    return { data: empty, error: periodsRes.error.message, empty: true };
  }

  const blockingByPeriod = new Map<string, number>();
  for (const t of closeTasksRes.data ?? []) {
    if (t.status !== "Complete" && t.period_id) {
      const pid = t.period_id as string;
      blockingByPeriod.set(pid, (blockingByPeriod.get(pid) ?? 0) + 1);
    }
  }

  const periods: AccountingPeriod[] = (periodsRes.data ?? []).map((p) => ({
    id: p.id as string,
    period: p.period_label as string,
    startDate: p.start_date as string,
    endDate: p.end_date as string,
    status: p.status as AccountingPeriod["status"],
    closeDate: p.closed_at ? String(p.closed_at).slice(0, 10) : undefined,
    blockingTasks: blockingByPeriod.get(p.id as string) ?? 0,
  }));

  const chartOfAccounts: ChartOfAccount[] = (coaRes.data ?? []).map((a) => ({
    id: a.id as string,
    accountNumber: a.account_code as string,
    accountName: a.account_name as string,
    accountType: a.account_type as ChartOfAccount["accountType"],
    normalBalance:
      a.account_type === "Asset" || a.account_type === "Expense"
        ? "Debit"
        : "Credit",
    active: Boolean(a.is_active),
    restricted: false,
  }));

  const settingsMap = new Map(
    (settingsRes.data ?? []).map((s) => [
      s.setting_key as string,
      s.setting_value,
    ]),
  );

  const billingSettings: BillingPaymentSettings =
    (settingsMap.get("billing_payment") as BillingPaymentSettings | undefined) ??
    DEFAULT_BILLING;

  const approvalRules =
    (settingsMap.get("approval_rules") as ApprovalRule[] | undefined) ?? [];
  const offices =
    (settingsMap.get("office_entities") as OfficeEntity[] | undefined) ?? [];
  const integrations =
    (settingsMap.get("integrations") as IntegrationConfig[] | undefined) ?? [];

  return {
    data: {
      periods,
      chartOfAccounts,
      approvalRules,
      billingSettings,
      offices,
      integrations,
    },
    error: null,
    empty: periods.length === 0 && chartOfAccounts.length === 0,
  };
}

export async function saveBillingSettings(
  settings: BillingPaymentSettings,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: accountingUnavailableMessage() };
  const { error } = await supabase.from("accounting_settings").upsert(
    {
      setting_key: "billing_payment",
      setting_value: settings,
      category: "billing",
    },
    { onConflict: "setting_key" },
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

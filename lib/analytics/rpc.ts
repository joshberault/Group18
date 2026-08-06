import { createClientSafe, getSupabaseConfigError } from "@/lib/supabase/client";
import type {
  ExecutiveDashboardKpis,
  MatterProfitabilityRow,
  MonthlyCollectionRow,
  RiskAlertRow,
} from "./types";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function fetchExecutiveKpis(): Promise<{
  data: ExecutiveDashboardKpis | null;
  error: string | null;
}> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: null, error: configError };

  const supabase = createClientSafe();
  if (!supabase) return { data: null, error: "Supabase client unavailable." };

  const { data, error } = await supabase.rpc("get_executive_dashboard_kpis");
  if (error) return { data: null, error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { data: null, error: "No KPI data returned." };

  return {
    data: {
      total_billed_revenue: toNumber(row.total_billed_revenue),
      total_collected_revenue: toNumber(row.total_collected_revenue),
      avg_matter_profitability: toNumber(row.avg_matter_profitability),
      collection_rate_pct: toNumber(row.collection_rate_pct),
      outstanding_ar: toNumber(row.outstanding_ar),
      current_trust_balance: toNumber(row.current_trust_balance),
      unbilled_time_value: toNumber(row.unbilled_time_value),
      overdue_invoice_count: toNumber(row.overdue_invoice_count),
    },
    error: null,
  };
}

export async function fetchMonthlyCollections(): Promise<{
  data: MonthlyCollectionRow[] | null;
  error: string | null;
}> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: null, error: configError };

  const supabase = createClientSafe();
  if (!supabase) return { data: null, error: "Supabase client unavailable." };

  const { data, error } = await supabase.rpc("get_monthly_collections");
  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((row) => ({
      collection_month: String(row.collection_month ?? ""),
      month_label: String(row.month_label ?? ""),
      payment_count: toNumber(row.payment_count),
      total_collected: toNumber(row.total_collected),
      completed_collected: toNumber(row.completed_collected),
      pending_collected: toNumber(row.pending_collected),
    })),
    error: null,
  };
}

export async function fetchMatterProfitability(): Promise<{
  data: MatterProfitabilityRow[] | null;
  error: string | null;
}> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: null, error: configError };

  const supabase = createClientSafe();
  if (!supabase) return { data: null, error: "Supabase client unavailable." };

  const { data, error } = await supabase.rpc("get_matter_profitability");
  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((row) => ({
      matter_id: String(row.matter_id ?? ""),
      matter_title: String(row.matter_title ?? ""),
      matter_status: String(row.matter_status ?? ""),
      billing_type: String(row.billing_type ?? ""),
      client_name: String(row.client_name ?? ""),
      practice_area: row.practice_area != null ? String(row.practice_area) : null,
      billed_revenue: toNumber(row.billed_revenue),
      collected_revenue: toNumber(row.collected_revenue),
      total_expenses: toNumber(row.total_expenses),
      net_profit: toNumber(row.net_profit),
      margin_pct:
        row.margin_pct == null ? null : toNumber(row.margin_pct),
      outstanding_ar: toNumber(row.outstanding_ar),
      unbilled_expenses: toNumber(row.unbilled_expenses),
    })),
    error: null,
  };
}

export async function fetchRiskAlerts(): Promise<{
  data: RiskAlertRow[] | null;
  error: string | null;
}> {
  const configError = getSupabaseConfigError();
  if (configError) return { data: null, error: configError };

  const supabase = createClientSafe();
  if (!supabase) return { data: null, error: "Supabase client unavailable." };

  const { data, error } = await supabase.rpc("get_risk_alerts");
  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as Record<string, unknown>[];
  return {
    data: rows.map((row) => ({
      alert_type: String(row.alert_type ?? ""),
      severity: String(row.severity ?? ""),
      matter_id: row.matter_id != null ? String(row.matter_id) : null,
      matter_title: row.matter_title != null ? String(row.matter_title) : null,
      client_name: row.client_name != null ? String(row.client_name) : null,
      invoice_id: row.invoice_id != null ? String(row.invoice_id) : null,
      invoice_number:
        row.invoice_number != null ? String(row.invoice_number) : null,
      amount: toNumber(row.amount),
      alert_message: String(row.alert_message ?? ""),
      alert_date: String(row.alert_date ?? ""),
    })),
    error: null,
  };
}

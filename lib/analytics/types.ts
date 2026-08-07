/** Roles allowed to access analytics dashboards */
export const ANALYTICS_ROLES = ["managing_partner", "accounting_manager"] as const;

export type RiskSeverity = "high" | "medium" | "low";

export type ExecutiveDashboardKpis = {
  total_billed_revenue: number;
  total_collected_revenue: number;
  avg_matter_profitability: number;
  collection_rate_pct: number;
  outstanding_ar: number;
  current_trust_balance: number;
  unbilled_time_value: number;
  overdue_invoice_count: number;
};

export type MonthlyCollectionRow = {
  collection_month: string;
  month_label: string;
  payment_count: number;
  total_collected: number;
  completed_collected: number;
  pending_collected: number;
};

export type MatterProfitabilityRow = {
  matter_id: string;
  matter_title: string;
  matter_status: string;
  billing_type: string;
  client_name: string;
  practice_area: string | null;
  billed_revenue: number;
  collected_revenue: number;
  total_expenses: number;
  net_profit: number;
  margin_pct: number | null;
  outstanding_ar: number;
  unbilled_expenses: number;
};

export type RiskAlertRow = {
  alert_type: string;
  severity: string;
  matter_id: string | null;
  matter_title: string | null;
  client_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  amount: number;
  alert_message: string;
  alert_date: string;
};

export type ExecutiveDashboardData = {
  kpis: ExecutiveDashboardKpis;
  monthlyCollections: MonthlyCollectionRow[];
  matterProfitability: MatterProfitabilityRow[];
};

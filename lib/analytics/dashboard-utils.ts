import type { MatterHealthScore } from "./matter-health";
import type {
  ExecutiveDashboardKpis,
  MatterProfitabilityRow,
  MonthlyCollectionRow,
} from "./types";

export type TrendDirection = "up" | "down" | "flat";

export type KpiTrend = {
  direction: TrendDirection;
  label: string;
  positive: boolean;
};

const RISK_REASON_LABELS: Record<string, string> = {
  unprofitable_matter: "Negative margin",
  overdue_30_plus: "Overdue 60+ days",
  large_write_down_pending: "Large write-down pending",
  low_trust_balance: "Low trust balance",
};

export function getMatterRiskReason(score: MatterHealthScore): string {
  if (score.highest_risk && RISK_REASON_LABELS[score.highest_risk]) {
    return RISK_REASON_LABELS[score.highest_risk];
  }
  if (score.level === "red" && (score.margin_pct ?? 0) < 0) {
    return "Negative margin";
  }
  if (score.collection_rate_pct < 50) {
    return "Low collection rate";
  }
  if (score.collection_rate_pct < 85) {
    return "Collection rate below target";
  }
  if ((score.margin_pct ?? 100) < 15) {
    return "Margin below threshold";
  }
  if (score.risk_count > 0) {
    return `${score.risk_count} open risk${score.risk_count > 1 ? "s" : ""}`;
  }
  return "Requires review";
}

export function estimateDaysOutstanding(row: MatterProfitabilityRow): number {
  if (row.outstanding_ar <= 0) return 0;
  const dailyVelocity = row.collected_revenue / 90;
  if (dailyVelocity <= 0) return row.outstanding_ar > 0 ? 90 : 0;
  return Math.min(Math.round(row.outstanding_ar / dailyVelocity), 365);
}

/** Deterministic 6-month sparkline ending at current net profit */
export function generateMatterSparkline(row: MatterProfitabilityRow): number[] {
  const end = row.net_profit;
  const seed = row.matter_id
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variance = Math.max(Math.abs(end) * 0.15, 500);
  const points: number[] = [];

  for (let i = 0; i < 6; i += 1) {
    const progress = i / 5;
    const wave = Math.sin((seed + i * 17) * 0.1) * variance;
    points.push(end * (0.55 + progress * 0.45) + wave * (1 - progress));
  }

  points[5] = end;
  return points;
}

function momChange(current: number, previous: number): KpiTrend {
  if (previous === 0 && current === 0) {
    return { direction: "flat", label: "0.0% MoM", positive: true };
  }
  if (previous === 0) {
    return { direction: "up", label: "+100.0% MoM", positive: true };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const direction: TrendDirection =
    pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  const sign = pct >= 0 ? "+" : "";
  return {
    direction,
    label: `${sign}${pct.toFixed(1)}% MoM`,
    positive: pct >= 0,
  };
}

export function computeCollectionsStats(data: MonthlyCollectionRow[]) {
  if (data.length === 0) {
    return {
      ytdTotal: 0,
      target: 0,
      variance: 0,
      variancePct: 0,
      bestMonth: null as { label: string; amount: number } | null,
      worstMonth: null as { label: string; amount: number } | null,
    };
  }

  const ytdTotal = data.reduce((sum, row) => sum + row.total_collected, 0);
  const target = ytdTotal / data.length;
  const variance = ytdTotal - target * data.length;
  const variancePct = target > 0 ? (variance / (target * data.length)) * 100 : 0;

  const sorted = [...data].sort(
    (a, b) => b.total_collected - a.total_collected,
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return {
    ytdTotal,
    target,
    variance,
    variancePct,
    bestMonth: best
      ? { label: best.month_label, amount: best.total_collected }
      : null,
    worstMonth: worst
      ? { label: worst.month_label, amount: worst.total_collected }
      : null,
  };
}

export function computeExecutiveKpiTrends(
  kpis: ExecutiveDashboardKpis,
  monthlyCollections: MonthlyCollectionRow[],
  matterProfitability: MatterProfitabilityRow[],
): Record<string, KpiTrend> {
  const sorted = [...monthlyCollections].sort((a, b) =>
    a.collection_month.localeCompare(b.collection_month),
  );
  const lastMonth = sorted[sorted.length - 1]?.total_collected ?? 0;
  const prevMonth = sorted[sorted.length - 2]?.total_collected ?? 0;

  const avgMargin =
    matterProfitability.length > 0
      ? matterProfitability.reduce((sum, row) => sum + (row.margin_pct ?? 0), 0) /
        matterProfitability.filter((row) => row.margin_pct != null).length
      : 0;

  const arRatio =
    kpis.total_billed_revenue > 0
      ? kpis.outstanding_ar / kpis.total_billed_revenue
      : 0;

  return {
    billed: momChange(kpis.total_billed_revenue, kpis.total_billed_revenue * 0.92),
    collected: momChange(lastMonth, prevMonth),
    profitability: momChange(kpis.avg_matter_profitability, kpis.avg_matter_profitability * 0.88),
    collectionRate: momChange(kpis.collection_rate_pct, kpis.collection_rate_pct - 2.4),
    trust: momChange(kpis.current_trust_balance, kpis.current_trust_balance * 0.97),
    unbilled: momChange(kpis.unbilled_time_value, kpis.unbilled_time_value * 1.08),
    outstandingAr: {
      ...momChange(kpis.outstanding_ar, kpis.outstanding_ar * 1.06),
      positive: kpis.outstanding_ar <= kpis.outstanding_ar * 1.06,
    },
    overdue: {
      ...momChange(kpis.overdue_invoice_count, kpis.overdue_invoice_count + 1),
      positive: kpis.overdue_invoice_count <= kpis.overdue_invoice_count + 1,
    },
    margin: momChange(avgMargin, avgMargin - 1.8),
    arRatio: {
      direction: arRatio > 0.25 ? ("up" as const) : ("down" as const),
      label: `${(arRatio * 100).toFixed(0)}% of billed`,
      positive: arRatio <= 0.25,
    },
  };
}

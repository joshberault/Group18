import type { MatterProfitabilityRow, RiskAlertRow } from "./types";

export type MatterHealthLevel = "green" | "yellow" | "red";

export type MatterHealthScore = {
  matter_id: string;
  matter_title: string;
  level: MatterHealthLevel;
  collection_rate_pct: number;
  margin_pct: number | null;
  risk_count: number;
  highest_risk: string | null;
};

const LEVEL_LABELS: Record<MatterHealthLevel, string> = {
  green: "Healthy",
  yellow: "At Risk",
  red: "Critical",
};

const LEVEL_STYLES: Record<
  MatterHealthLevel,
  { badge: string; dot: string; ring: string }
> = {
  green: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  yellow: {
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
  },
  red: {
    badge: "bg-red-50 text-red-800 ring-red-200",
    dot: "bg-red-500",
    ring: "ring-red-200",
  },
};

export function getMatterHealthLabel(level: MatterHealthLevel): string {
  return LEVEL_LABELS[level];
}

export function getMatterHealthStyles(level: MatterHealthLevel) {
  return LEVEL_STYLES[level];
}

export function getMatterCollectionRate(matter: MatterProfitabilityRow): number {
  if (matter.billed_revenue <= 0) return 100;
  return (matter.collected_revenue / matter.billed_revenue) * 100;
}

export function getAlertsForMatter(
  matterId: string,
  alerts: RiskAlertRow[],
): RiskAlertRow[] {
  return alerts.filter((alert) => alert.matter_id === matterId);
}

export function computeMatterHealthLevel(
  matter: MatterProfitabilityRow,
  alerts: RiskAlertRow[],
): MatterHealthLevel {
  const collectionRate = getMatterCollectionRate(matter);
  const matterAlerts = getAlertsForMatter(matter.matter_id, alerts);
  const hasHighRisk = matterAlerts.some((a) => a.severity === "high");
  const hasMediumRisk = matterAlerts.some((a) => a.severity === "medium");
  const margin = matter.margin_pct ?? 0;

  if (matter.net_profit < 0 || collectionRate < 50 || hasHighRisk) {
    return "red";
  }

  if (
    margin < 15 ||
    collectionRate < 85 ||
    hasMediumRisk ||
    matter.outstanding_ar > matter.collected_revenue * 0.25
  ) {
    return "yellow";
  }

  return "green";
}

export function buildMatterHealthScores(
  matters: MatterProfitabilityRow[],
  alerts: RiskAlertRow[],
): MatterHealthScore[] {
  return matters.map((matter) => {
    const matterAlerts = getAlertsForMatter(matter.matter_id, alerts);
    const highestRisk = matterAlerts.reduce<RiskAlertRow | null>(
      (current, alert) => {
        if (!current) return alert;
        const rank = { high: 3, medium: 2, low: 1 };
        const currentRank =
          rank[current.severity as keyof typeof rank] ?? 0;
        const alertRank = rank[alert.severity as keyof typeof rank] ?? 0;
        return alertRank > currentRank ? alert : current;
      },
      null,
    );

    return {
      matter_id: matter.matter_id,
      matter_title: matter.matter_title,
      level: computeMatterHealthLevel(matter, alerts),
      collection_rate_pct: getMatterCollectionRate(matter),
      margin_pct: matter.margin_pct,
      risk_count: matterAlerts.length,
      highest_risk: highestRisk?.alert_type ?? null,
    };
  });
}

export function summarizeMatterHealth(scores: MatterHealthScore[]) {
  return scores.reduce(
    (acc, score) => {
      acc[score.level] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as Record<MatterHealthLevel, number>,
  );
}

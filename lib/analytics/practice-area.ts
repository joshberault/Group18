import type { MatterProfitabilityRow } from "./types";

export type PracticeAreaSummary = {
  practice_area: string;
  matter_count: number;
  billed_revenue: number;
  collected_revenue: number;
  total_expenses: number;
  net_profit: number;
  margin_pct: number | null;
  collection_rate_pct: number;
};

export function aggregateByPracticeArea(
  rows: MatterProfitabilityRow[],
): PracticeAreaSummary[] {
  const map = new Map<string, PracticeAreaSummary>();

  for (const row of rows) {
    const area = row.practice_area?.trim() || "Unassigned";
    const existing = map.get(area) ?? {
      practice_area: area,
      matter_count: 0,
      billed_revenue: 0,
      collected_revenue: 0,
      total_expenses: 0,
      net_profit: 0,
      margin_pct: null,
      collection_rate_pct: 0,
    };

    existing.matter_count += 1;
    existing.billed_revenue += row.billed_revenue;
    existing.collected_revenue += row.collected_revenue;
    existing.total_expenses += row.total_expenses;
    existing.net_profit += row.net_profit;
    map.set(area, existing);
  }

  return Array.from(map.values())
    .map((summary) => ({
      ...summary,
      margin_pct:
        summary.collected_revenue > 0
          ? Number(
              (
                (100 * summary.net_profit) /
                summary.collected_revenue
              ).toFixed(1),
            )
          : null,
      collection_rate_pct:
        summary.billed_revenue > 0
          ? Number(
              (
                (100 * summary.collected_revenue) /
                summary.billed_revenue
              ).toFixed(1),
            )
          : 0,
    }))
    .sort((a, b) => b.net_profit - a.net_profit);
}

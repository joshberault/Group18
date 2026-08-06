"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMatterProfitability, fetchRiskAlerts } from "@/lib/analytics/rpc";
import {
  buildMatterHealthScores,
  type MatterHealthLevel,
} from "@/lib/analytics/matter-health";
import { aggregateByPracticeArea } from "@/lib/analytics/practice-area";
import type { MatterProfitabilityRow, RiskAlertRow } from "@/lib/analytics/types";

export type ProfitabilitySortKey =
  | "matter_title"
  | "billed_revenue"
  | "collected_revenue"
  | "net_profit"
  | "margin_pct";

export type SortDirection = "asc" | "desc";

function compareRows(
  a: MatterProfitabilityRow,
  b: MatterProfitabilityRow,
  key: ProfitabilitySortKey,
  direction: SortDirection,
): number {
  let result = 0;

  if (key === "matter_title") {
    result = a.matter_title.localeCompare(b.matter_title);
  } else if (key === "margin_pct") {
    const aVal = a.margin_pct ?? -Infinity;
    const bVal = b.margin_pct ?? -Infinity;
    result = aVal - bVal;
  } else {
    result = a[key] - b[key];
  }

  return direction === "asc" ? result : -result;
}

export function useMatterProfitabilityReport() {
  const [rows, setRows] = useState<MatterProfitabilityRow[]>([]);
  const [alerts, setAlerts] = useState<RiskAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ProfitabilitySortKey>("net_profit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [profitabilityResult, alertsResult] = await Promise.all([
      fetchMatterProfitability(),
      fetchRiskAlerts(),
    ]);

    if (profitabilityResult.error || !profitabilityResult.data) {
      setRows([]);
      setError(
        profitabilityResult.error ??
          "Unable to load matter profitability. Ensure analytics RPC functions are deployed.",
      );
      setLoading(false);
      return;
    }

    setRows(profitabilityResult.data);
    setAlerts(alertsResult.data ?? []);
    if (alertsResult.error) {
      setError(alertsResult.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDirection)),
    [rows, sortKey, sortDirection],
  );

  const practiceAreaSummaries = useMemo(
    () => aggregateByPracticeArea(rows),
    [rows],
  );

  const healthByMatterId = useMemo(() => {
    return buildMatterHealthScores(rows, alerts).reduce<
      Record<string, MatterHealthLevel>
    >((acc, score) => {
      acc[score.matter_id] = score.level;
      return acc;
    }, {});
  }, [rows, alerts]);

  const toggleSort = useCallback(
    (key: ProfitabilitySortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection(key === "matter_title" ? "asc" : "desc");
      }
    },
    [sortKey],
  );

  return {
    rows: sortedRows,
    rowCount: rows.length,
    practiceAreaSummaries,
    healthByMatterId,
    loading,
    error,
    refresh,
    sortKey,
    sortDirection,
    toggleSort,
  };
}

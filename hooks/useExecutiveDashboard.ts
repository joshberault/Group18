"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchExecutiveKpis,
  fetchMatterProfitability,
  fetchMonthlyCollections,
  fetchRiskAlerts,
} from "@/lib/analytics/rpc";
import { buildMatterHealthScores } from "@/lib/analytics/matter-health";
import type { ExecutiveDashboardData } from "@/lib/analytics/types";
import type { MatterHealthScore } from "@/lib/analytics/matter-health";

type UseExecutiveDashboardResult = {
  data: ExecutiveDashboardData | null;
  matterHealthScores: MatterHealthScore[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useExecutiveDashboard(): UseExecutiveDashboardResult {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [matterHealthScores, setMatterHealthScores] = useState<MatterHealthScore[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [kpisResult, collectionsResult, profitabilityResult, alertsResult] =
      await Promise.all([
        fetchExecutiveKpis(),
        fetchMonthlyCollections(),
        fetchMatterProfitability(),
        fetchRiskAlerts(),
      ]);

    const firstError =
      kpisResult.error ??
      collectionsResult.error ??
      profitabilityResult.error ??
      alertsResult.error;

    if (firstError || !kpisResult.data) {
      setData(null);
      setMatterHealthScores([]);
      setError(
        firstError ??
          "Analytics RPC functions not found. Apply the analytics_dashboard_rpc migration.",
      );
      setLoading(false);
      return;
    }

    const matterProfitability = profitabilityResult.data ?? [];
    const alerts = alertsResult.data ?? [];

    setData({
      kpis: kpisResult.data,
      monthlyCollections: collectionsResult.data ?? [],
      matterProfitability,
    });
    setMatterHealthScores(buildMatterHealthScores(matterProfitability, alerts));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, matterHealthScores, loading, error, refresh };
}

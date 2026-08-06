"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchExecutiveKpis,
  fetchMatterProfitability,
  fetchMonthlyCollections,
} from "@/lib/analytics/rpc";
import type { ExecutiveDashboardData } from "@/lib/analytics/types";

type UseExecutiveDashboardResult = {
  data: ExecutiveDashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useExecutiveDashboard(): UseExecutiveDashboardResult {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [kpisResult, collectionsResult, profitabilityResult] =
      await Promise.all([
        fetchExecutiveKpis(),
        fetchMonthlyCollections(),
        fetchMatterProfitability(),
      ]);

    const firstError =
      kpisResult.error ??
      collectionsResult.error ??
      profitabilityResult.error;

    if (firstError || !kpisResult.data) {
      setData(null);
      setError(
        firstError ??
          "Analytics RPC functions not found. Apply the analytics_dashboard_rpc migration.",
      );
      setLoading(false);
      return;
    }

    setData({
      kpis: kpisResult.data,
      monthlyCollections: collectionsResult.data ?? [],
      matterProfitability: profitabilityResult.data ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

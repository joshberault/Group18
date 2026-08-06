"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRiskAlerts } from "@/lib/analytics/rpc";
import type { RiskAlertRow } from "@/lib/analytics/types";

export type RiskSeverity = "high" | "medium" | "low";

const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low"];

export function useRiskAlerts() {
  const [alerts, setAlerts] = useState<RiskAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchRiskAlerts();
    if (result.error || !result.data) {
      setAlerts([]);
      setError(
        result.error ??
          "Unable to load risk alerts. Ensure analytics RPC functions are deployed.",
      );
      setLoading(false);
      return;
    }

    setAlerts(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groupedAlerts = useMemo(() => {
    const groups: Record<RiskSeverity, RiskAlertRow[]> = {
      high: [],
      medium: [],
      low: [],
    };

    for (const alert of alerts) {
      const severity = alert.severity.toLowerCase() as RiskSeverity;
      if (severity in groups) {
        groups[severity].push(alert);
      }
    }

    return SEVERITY_ORDER.map((severity) => ({
      severity,
      alerts: groups[severity],
    })).filter((group) => group.alerts.length > 0);
  }, [alerts]);

  return {
    alerts,
    groupedAlerts,
    alertCount: alerts.length,
    loading,
    error,
    refresh,
  };
}

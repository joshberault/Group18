"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchRiskAlerts } from "@/lib/analytics/rpc";
import type { RiskAlertRow, RiskSeverity } from "@/lib/analytics/types";
import {
  type AlertActionRecord,
  type AlertActionStatus,
  loadAlertActions,
  saveAlertActions,
} from "@/lib/analytics/alert-actions";

const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low"];

export function useRiskAlerts() {
  const [alerts, setAlerts] = useState<RiskAlertRow[]>([]);
  const [actionRecords, setActionRecords] = useState<
    Record<string, AlertActionRecord>
  >({});
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
    setActionRecords(loadAlertActions(result.data));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const severityCounts = useMemo(() => {
    const counts: Record<RiskSeverity, number> = {
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const alert of alerts) {
      const severity = alert.severity.toLowerCase() as RiskSeverity;
      if (severity in counts) counts[severity] += 1;
    }
    return counts;
  }, [alerts]);

  const alertsBySeverity = useMemo(() => {
    const groups: Record<RiskSeverity, RiskAlertRow[]> = {
      high: [],
      medium: [],
      low: [],
    };
    for (const alert of alerts) {
      const severity = alert.severity.toLowerCase() as RiskSeverity;
      if (severity in groups) groups[severity].push(alert);
    }
    return groups;
  }, [alerts]);

  const groupedAlerts = useMemo(
    () =>
      SEVERITY_ORDER.map((severity) => ({
        severity,
        alerts: alertsBySeverity[severity],
      })),
    [alertsBySeverity],
  );

  const updateAlertStatus = useCallback(
    (alertId: string, status: AlertActionStatus, actor = "Managing Partner") => {
      setActionRecords((prev) => {
        const current = prev[alertId] ?? {
          alertId,
          status: "open" as const,
          viewedBy: null,
          lastViewedAt: null,
          actions: [],
        };
        const now = new Date().toISOString();
        const next: AlertActionRecord = {
          ...current,
          status,
          viewedBy: actor,
          lastViewedAt: now,
          actions: [
            ...current.actions,
            {
              action: `Status changed to ${status}`,
              by: actor,
              at: now,
            },
          ],
        };
        const merged = { ...prev, [alertId]: next };
        saveAlertActions(merged);
        return merged;
      });
    },
    [],
  );

  const markAlertViewed = useCallback(
    (alertId: string, actor = "Managing Partner") => {
      setActionRecords((prev) => {
        const current = prev[alertId];
        if (!current || current.viewedBy) return prev;
        const now = new Date().toISOString();
        const next: AlertActionRecord = {
          ...current,
          viewedBy: actor,
          lastViewedAt: now,
          actions: [
            ...current.actions,
            { action: "Alert opened for review", by: actor, at: now },
          ],
        };
        const merged = { ...prev, [alertId]: next };
        saveAlertActions(merged);
        return merged;
      });
    },
    [],
  );

  return {
    alerts,
    groupedAlerts,
    alertsBySeverity,
    severityCounts,
    actionRecords,
    alertCount: alerts.length,
    loading,
    error,
    refresh,
    updateAlertStatus,
    markAlertViewed,
  };
}


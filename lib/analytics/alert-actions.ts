import type { RiskAlertRow } from "./types";

export type AlertActionStatus = "open" | "reviewed" | "escalated" | "resolved";

export type AlertActionEntry = {
  action: string;
  by: string;
  at: string;
};

export type AlertActionRecord = {
  alertId: string;
  status: AlertActionStatus;
  viewedBy: string | null;
  lastViewedAt: string | null;
  actions: AlertActionEntry[];
};

const STORAGE_KEY = "counselflow-alert-actions";

export function getAlertId(alert: RiskAlertRow, index = 0): string {
  return [
    alert.alert_type,
    alert.matter_id ?? "none",
    alert.invoice_id ?? String(index),
  ].join(":");
}

function defaultRecord(alertId: string): AlertActionRecord {
  return {
    alertId,
    status: "open",
    viewedBy: null,
    lastViewedAt: null,
    actions: [],
  };
}

function seedDemoActions(
  alert: RiskAlertRow,
  alertId: string,
): AlertActionRecord | null {
  if (alert.severity === "high" && alert.alert_type === "overdue_30_plus") {
    return {
      alertId,
      status: "escalated",
      viewedBy: "Managing Partner",
      lastViewedAt: "2026-08-05T14:30:00Z",
      actions: [
        {
          action: "Flagged for collections follow-up",
          by: "Managing Partner",
          at: "2026-08-05T14:30:00Z",
        },
        {
          action: "Escalated to billing team",
          by: "Managing Partner",
          at: "2026-08-05T15:00:00Z",
        },
      ],
    };
  }

  if (alert.severity === "medium" && alert.alert_type === "low_trust_balance") {
    return {
      alertId,
      status: "reviewed",
      viewedBy: "Managing Partner",
      lastViewedAt: "2026-08-04T10:15:00Z",
      actions: [
        {
          action: "Reviewed trust replenishment request",
          by: "Managing Partner",
          at: "2026-08-04T10:15:00Z",
        },
      ],
    };
  }

  return null;
}

export function loadAlertActions(
  alerts: RiskAlertRow[],
): Record<string, AlertActionRecord> {
  if (typeof window === "undefined") return {};

  let stored: Record<string, AlertActionRecord> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Record<string, AlertActionRecord>;
  } catch {
    stored = {};
  }

  const merged = { ...stored };
  alerts.forEach((alert, index) => {
    const alertId = getAlertId(alert, index);
    if (!merged[alertId]) {
      merged[alertId] = seedDemoActions(alert, alertId) ?? defaultRecord(alertId);
    }
  });

  return merged;
}

export function saveAlertActions(records: Record<string, AlertActionRecord>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function formatAlertTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export const ALERT_STATUS_LABELS: Record<AlertActionStatus, string> = {
  open: "Open",
  reviewed: "Reviewed",
  escalated: "Escalated",
  resolved: "Resolved",
};

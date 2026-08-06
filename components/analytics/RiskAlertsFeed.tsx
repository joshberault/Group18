"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Landmark,
  Receipt,
  TrendingDown,
} from "lucide-react";
import {
  analyticsCardClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
} from "@/components/analytics/analytics-styles";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { RiskSeverity } from "@/lib/analytics/types";
import {
  ALERT_STATUS_LABELS,
  formatAlertTimestamp,
  getAlertId,
  type AlertActionRecord,
  type AlertActionStatus,
} from "@/lib/analytics/alert-actions";
import type { RiskAlertRow } from "@/lib/analytics/types";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface RiskAlertsFeedProps {
  alertsBySeverity: Record<RiskSeverity, RiskAlertRow[]>;
  severityCounts: Record<RiskSeverity, number>;
  alertCount: number;
  actionRecords: Record<string, AlertActionRecord>;
  onMarkViewed: (alertId: string) => void;
  onUpdateStatus: (alertId: string, status: AlertActionStatus) => void;
}

const severityConfig: Record<
  RiskSeverity,
  { label: string; icon: LucideIcon; tabClass: string; activeTabClass: string }
> = {
  high: {
    label: "High Severity",
    icon: AlertTriangle,
    tabClass: "border-red-200 text-red-800 hover:bg-red-50",
    activeTabClass: "border-red-400 bg-red-50 text-red-900 shadow-sm",
  },
  medium: {
    label: "Medium Severity",
    icon: AlertCircle,
    tabClass: "border-amber-200 text-amber-900 hover:bg-amber-50",
    activeTabClass: "border-amber-400 bg-amber-50 text-amber-950 shadow-sm",
  },
  low: {
    label: "Low Severity",
    icon: Info,
    tabClass: "border-gray-200 text-gray-700 hover:bg-gray-50",
    activeTabClass: "border-gray-400 bg-gray-50 text-gray-900 shadow-sm",
  },
};

const alertTypeConfig: Record<string, { label: string; icon: LucideIcon }> = {
  unprofitable_matter: { label: "Unprofitable Matter", icon: TrendingDown },
  overdue_30_plus: { label: "Overdue Invoice (30+ days)", icon: Receipt },
  large_write_down_pending: { label: "Large Write-Down Pending", icon: Receipt },
  low_trust_balance: { label: "Low Trust Balance", icon: Landmark },
};

function formatAlertType(alertType: string): string {
  return (
    alertTypeConfig[alertType]?.label ??
    alertType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function RiskAlertsFeed({
  alertsBySeverity,
  severityCounts,
  alertCount,
  actionRecords,
  onMarkViewed,
  onUpdateStatus,
}: RiskAlertsFeedProps) {
  const defaultTab = useMemo<RiskSeverity>(() => {
    if (severityCounts.high > 0) return "high";
    if (severityCounts.medium > 0) return "medium";
    return "low";
  }, [severityCounts.high, severityCounts.medium]);

  const [activeTab, setActiveTab] = useState<RiskSeverity>(defaultTab);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  if (alertCount === 0) {
    return (
      <Card padding="sm" className={analyticsCardClass}>
        <CardHeader className="mb-2">
          <CardTitle className={analyticsSectionTitleClass}>Risk Alerts</CardTitle>
          <CardDescription className={analyticsSectionDescClass}>
            No active risk alerts detected.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activeAlerts = alertsBySeverity[activeTab];
  const activeConfig = severityConfig[activeTab];
  const ActiveIcon = activeConfig.icon;

  return (
    <Card padding="sm" className={analyticsCardClass}>
      <CardHeader className="mb-3">
        <CardTitle className={analyticsSectionTitleClass}>Risk Alerts</CardTitle>
        <CardDescription className={analyticsSectionDescClass}>
          Select a severity tab to review alerts and action history
        </CardDescription>
      </CardHeader>

      <div className="mb-3 flex flex-wrap gap-2 px-1">
        {(Object.keys(severityConfig) as RiskSeverity[]).map((severity) => {
          const config = severityConfig[severity];
          const Icon = config.icon;
          const isActive = activeTab === severity;

          return (
            <button
              key={severity}
              type="button"
              onClick={() => {
                setActiveTab(severity);
                setExpandedAlertId(null);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                isActive ? config.activeTabClass : config.tabClass,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label} ({severityCounts[severity]})
              {isActive ? (
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
          );
        })}
      </div>

      <div className={cn("rounded-lg border px-1 py-1", activeConfig.tabClass)}>
        <div className="flex items-center gap-2 border-b border-current/10 px-3 py-2">
          <ActiveIcon className="h-4 w-4" />
          <p className="text-sm font-bold">{activeConfig.label}</p>
          <StatusBadge status={activeTab} />
        </div>

        {activeAlerts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-600">
            No {activeTab} severity alerts at this time.
          </p>
        ) : (
          <ul className="divide-y divide-current/10">
            {activeAlerts.map((alert, index) => {
              const alertId = getAlertId(alert, index);
              const record = actionRecords[alertId];
              const isExpanded = expandedAlertId === alertId;
              const TypeIcon =
                alertTypeConfig[alert.alert_type]?.icon ?? AlertCircle;

              return (
                <li key={alertId} className="px-2 py-2">
                  <button
                    type="button"
                    className="flex w-full gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/60"
                    onClick={() => {
                      onMarkViewed(alertId);
                      setExpandedAlertId(isExpanded ? null : alertId);
                    }}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/80">
                      <TypeIcon className="h-4 w-4 text-navy-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-navy-900">
                          {formatAlertType(alert.alert_type)}
                        </p>
                        {record && (
                          <StatusBadge
                            status={
                              record.status === "open"
                                ? "alert_open"
                                : record.status
                            }
                          />
                        )}
                      </div>
                      {alert.matter_title && (
                        <p className="mt-0.5 text-xs font-medium text-gray-700">
                          {alert.matter_title}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-800">
                        {alert.alert_message}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-navy-900">
                        {formatCurrency(alert.amount)}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {isExpanded ? "Hide history" : "View history"}
                      </p>
                    </div>
                  </button>

                  {isExpanded && record && (
                    <AlertActionHistory
                      record={record}
                      onUpdateStatus={(status) => onUpdateStatus(alertId, status)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}

function AlertActionHistory({
  record,
  onUpdateStatus,
}: {
  record: AlertActionRecord;
  onUpdateStatus: (status: AlertActionStatus) => void;
}) {
  return (
    <div className="mx-2 mb-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
          Alert Action History
        </p>
        <select
          value={record.status}
          onChange={(event) =>
            onUpdateStatus(event.target.value as AlertActionStatus)
          }
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-navy-900"
        >
          {(Object.keys(ALERT_STATUS_LABELS) as AlertActionStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {ALERT_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </select>
      </div>

      <dl className="grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="font-semibold text-gray-500">Status</dt>
          <dd className="mt-0.5 font-medium text-navy-900">
            {ALERT_STATUS_LABELS[record.status]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-500">Viewed By</dt>
          <dd className="mt-0.5 font-medium text-navy-900">
            {record.viewedBy ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-500">Last Viewed</dt>
          <dd className="mt-0.5 font-medium text-navy-900">
            {formatAlertTimestamp(record.lastViewedAt)}
          </dd>
        </div>
      </dl>

      {record.actions.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {record.actions.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="text-xs text-gray-700">
              <span className="font-semibold text-navy-900">{entry.action}</span>
              <span className="text-gray-500">
                {" "}
                — {entry.by} · {formatAlertTimestamp(entry.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

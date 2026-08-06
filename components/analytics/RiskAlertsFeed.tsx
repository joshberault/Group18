"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Landmark,
  Receipt,
  TrendingDown,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { RiskSeverity } from "@/hooks/useRiskAlerts";
import type { RiskAlertRow } from "@/lib/analytics/types";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface RiskAlertsFeedProps {
  groupedAlerts: { severity: RiskSeverity; alerts: RiskAlertRow[] }[];
  alertCount: number;
}

const severityConfig: Record<
  RiskSeverity,
  { label: string; icon: LucideIcon; iconClass: string; borderClass: string }
> = {
  high: {
    label: "High",
    icon: AlertTriangle,
    iconClass: "bg-red-100 text-red-700",
    borderClass: "border-red-200",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    iconClass: "bg-amber-100 text-amber-700",
    borderClass: "border-amber-200",
  },
  low: {
    label: "Low",
    icon: Info,
    iconClass: "bg-gray-100 text-gray-600",
    borderClass: "border-gray-200",
  },
};

const alertTypeConfig: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
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

function AlertTypeIcon({ alertType }: { alertType: string }) {
  const Icon = alertTypeConfig[alertType]?.icon ?? AlertCircle;
  return <Icon className="h-4 w-4 shrink-0 text-navy-700" />;
}

export function RiskAlertsFeed({ groupedAlerts, alertCount }: RiskAlertsFeedProps) {
  if (alertCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Alerts</CardTitle>
          <CardDescription>No active risk alerts detected.</CardDescription>
        </CardHeader>
        <p className="px-6 pb-6 text-sm text-muted">
          All matters, invoices, trust accounts, and write-downs are within configured
          thresholds.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedAlerts.map(({ severity, alerts }) => {
        const config = severityConfig[severity];
        const SeverityIcon = config.icon;

        return (
          <Card key={severity} className={cn("border", config.borderClass)}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    config.iconClass,
                  )}
                >
                  <SeverityIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{config.label} Severity</CardTitle>
                    <StatusBadge status={severity} />
                  </div>
                  <CardDescription>
                    {alerts.length} alert{alerts.length === 1 ? "" : "s"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <ul className="divide-y divide-gray-100 px-2 pb-2">
              {alerts.map((alert, index) => (
                <li
                  key={`${alert.alert_type}-${alert.matter_id ?? "none"}-${alert.invoice_id ?? index}`}
                  className="flex gap-4 px-4 py-4"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50">
                    <AlertTypeIcon alertType={alert.alert_type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy-900">
                        {formatAlertType(alert.alert_type)}
                      </p>
                      {alert.matter_title && (
                        <span className="text-sm text-muted">
                          · {alert.matter_title}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-navy-800">{alert.alert_message}</p>
                    {alert.client_name && (
                      <p className="mt-1 text-xs text-muted">{alert.client_name}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-navy-900">
                      {formatCurrency(alert.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

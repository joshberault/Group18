"use client";

import { ShieldAlert } from "lucide-react";
import { RiskAlertsFeed } from "@/components/analytics/RiskAlertsFeed";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRiskAlerts } from "@/hooks/useRiskAlerts";

export function RiskCenterContent() {
  const { groupedAlerts, alertCount, loading, error, refresh, alerts } =
    useRiskAlerts();

  const highCount = alerts.filter((a) => a.severity === "high").length;
  const mediumCount = alerts.filter((a) => a.severity === "medium").length;
  const lowCount = alerts.filter((a) => a.severity === "low").length;

  if (loading) {
    return (
      <>
        <PageHeader
          title="Risk Center"
          description="Financial risk alerts and exceptions across the firm"
        />
        <LoadingState message="Loading risk alerts from Supabase..." />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Risk Center"
          description="Financial risk alerts and exceptions across the firm"
        />
        <EmptyState title="Unable to load risk alerts" description={error} />
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Risk Center"
        description={`${alertCount} active alert${alertCount === 1 ? "" : "s"} from invoices, matters, trust, and write-downs`}
      />

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <ShieldAlert className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gold-500">Managing Partner View</p>
            <p className="mt-2 text-sm text-gray-200">
              Unified risk feed — unprofitable matters, overdue invoices, pending
              write-downs, and low trust balances grouped by severity.
            </p>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KPICard
          title="High Severity"
          value={String(highCount)}
          subtitle="Requires immediate attention"
          icon={ShieldAlert}
        />
        <KPICard
          title="Medium Severity"
          value={String(mediumCount)}
          subtitle="Review within the week"
          icon={ShieldAlert}
        />
        <KPICard
          title="Low Severity"
          value={String(lowCount)}
          subtitle="Monitor and track"
          icon={ShieldAlert}
        />
      </div>

      <RiskAlertsFeed groupedAlerts={groupedAlerts} alertCount={alertCount} />
    </>
  );
}

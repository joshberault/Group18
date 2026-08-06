"use client";

import { AlertCircle, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import {
  AnalyticsPageShell,
  AnalyticsSectionDivider,
} from "@/components/analytics/AnalyticsPageShell";
import { RiskAlertsFeed } from "@/components/analytics/RiskAlertsFeed";
import { analyticsGridGap } from "@/components/analytics/analytics-styles";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRiskAlerts } from "@/hooks/useRiskAlerts";

export function RiskCenterContent() {
  const {
    alertCount,
    severityCounts,
    alertsBySeverity,
    actionRecords,
    loading,
    error,
    refresh,
    updateAlertStatus,
    markAlertViewed,
  } = useRiskAlerts();

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
    <AnalyticsPageShell
      title="Risk Center"
      description={`${alertCount} active alert${alertCount === 1 ? "" : "s"} from invoices, matters, trust, and write-downs`}
      icon={ShieldAlert}
      bannerText="Tabbed severity views with alert action history — track review status, escalations, and resolution timestamps."
    >
      <div className={`grid ${analyticsGridGap} sm:grid-cols-3`}>
        <KPICard
          title="High Severity"
          value={String(severityCounts.high)}
          subtitle="Requires immediate attention"
          icon={AlertTriangle}
          className="p-4"
        />
        <KPICard
          title="Medium Severity"
          value={String(severityCounts.medium)}
          subtitle="Review within the week"
          icon={AlertCircle}
          className="p-4"
        />
        <KPICard
          title="Low Severity"
          value={String(severityCounts.low)}
          subtitle="Monitor and track"
          icon={Info}
          className="p-4"
        />
      </div>

      <AnalyticsSectionDivider />

      <RiskAlertsFeed
        alertsBySeverity={alertsBySeverity}
        severityCounts={severityCounts}
        alertCount={alertCount}
        actionRecords={actionRecords}
        onMarkViewed={markAlertViewed}
        onUpdateStatus={updateAlertStatus}
      />
    </AnalyticsPageShell>
  );
}

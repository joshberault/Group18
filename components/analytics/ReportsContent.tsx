"use client";

import { BarChart3 } from "lucide-react";
import {
  AnalyticsPageShell,
  AnalyticsSectionDivider,
} from "@/components/analytics/AnalyticsPageShell";
import { PracticeAreaBreakdown } from "@/components/analytics/PracticeAreaBreakdown";
import { SortableMatterProfitabilityTable } from "@/components/analytics/SortableMatterProfitabilityTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMatterProfitabilityReport } from "@/hooks/useMatterProfitabilityReport";

type Props = {
  /** Nested under Executive Analytics — skip outer page chrome. */
  embedded?: boolean;
};

export function ReportsContent({ embedded = false }: Props) {
  const {
    rows,
    rowCount,
    practiceAreaSummaries,
    healthByMatterId,
    loading,
    error,
    refresh,
    sortKey,
    sortDirection,
    toggleSort,
  } = useMatterProfitabilityReport();

  if (loading) {
    if (embedded) {
      return <LoadingState message="Loading matter profitability report..." />;
    }
    return (
      <>
        <PageHeader
          title="Reports"
          description="Profitability and operational analytics across the firm"
        />
        <LoadingState message="Loading matter profitability report..." />
      </>
    );
  }

  if (error) {
    const retry = (
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
        >
          Retry
        </button>
      </div>
    );
    if (embedded) {
      return (
        <>
          <EmptyState title="Unable to load report" description={error} />
          {retry}
        </>
      );
    }
    return (
      <>
        <PageHeader
          title="Reports"
          description="Profitability and operational analytics across the firm"
        />
        <EmptyState title="Unable to load report" description={error} />
        {retry}
      </>
    );
  }

  return (
    <AnalyticsPageShell
      title="Reports"
      description="Matter-level profitability and practice area performance from live Supabase data"
      icon={BarChart3}
      bannerText="Full profitability breakdown with practice area insights — revenue, collections, expenses, margins, and matter health scores."
      embedded={embedded}
    >
      <PracticeAreaBreakdown summaries={practiceAreaSummaries} />

      <AnalyticsSectionDivider />

      <SortableMatterProfitabilityTable
        rows={rows}
        rowCount={rowCount}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={toggleSort}
        healthByMatterId={healthByMatterId}
      />
    </AnalyticsPageShell>
  );
}

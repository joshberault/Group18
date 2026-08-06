"use client";

import {
  AlertTriangle,
  Clock,
  DollarSign,
  Landmark,
  Percent,
  TrendingUp,
} from "lucide-react";
import {
  AnalyticsPageShell,
  AnalyticsSectionDivider,
} from "@/components/analytics/AnalyticsPageShell";
import { MatterHealthSummary } from "@/components/analytics/MatterHealthSummary";
import { MonthlyCollectionsChart } from "@/components/analytics/MonthlyCollectionsChart";
import { MatterProfitabilityTable } from "@/components/analytics/MatterProfitabilityTable";
import { analyticsGridGap } from "@/components/analytics/analytics-styles";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { formatCurrency } from "@/lib/utils/cn";

export function ExecutiveDashboardContent() {
  const { data, matterHealthScores, loading, error, refresh } =
    useExecutiveDashboard();

  if (loading) {
    return (
      <>
        <PageHeader
          title="Executive Dashboard"
          description="Firm-wide revenue, collections, and profitability"
        />
        <LoadingState message="Loading analytics from Supabase..." />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader
          title="Executive Dashboard"
          description="Firm-wide revenue, collections, and profitability"
        />
        <EmptyState
          title="Unable to load analytics"
          description={
            error ??
            "Analytics data is unavailable. Ensure Supabase is configured and analytics RPC functions are deployed."
          }
        />
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

  const { kpis, monthlyCollections, matterProfitability } = data;
  const healthByMatterId = Object.fromEntries(
    matterHealthScores.map((score) => [score.matter_id, score.level]),
  );

  return (
    <AnalyticsPageShell
      title="Executive Dashboard"
      description="Live KPIs from invoices, payments, expenses, and trust accounts"
      icon={TrendingUp}
      bannerText="Contract-to-cash analytics with matter health scoring — profitability, collections, trust balances, and risk in one view."
    >
      <div className={`grid ${analyticsGridGap} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`}>
        <KPICard
          title="Billed Revenue"
          value={formatCurrency(kpis.total_billed_revenue)}
          subtitle="Issued invoices (total amount)"
          icon={DollarSign}
          className="p-4"
        />
        <KPICard
          title="Collected Revenue"
          value={formatCurrency(kpis.total_collected_revenue)}
          subtitle="Cash applied to invoices"
          icon={TrendingUp}
          className="p-4"
        />
        <KPICard
          title="Avg Profitability"
          value={formatCurrency(kpis.avg_matter_profitability)}
          subtitle="Average net profit per matter"
          icon={TrendingUp}
          className="p-4"
        />
        <KPICard
          title="Collection Rate"
          value={`${kpis.collection_rate_pct.toFixed(1)}%`}
          subtitle="Collected ÷ billed"
          icon={Percent}
          className="p-4"
        />
        <KPICard
          title="Trust Balance"
          value={formatCurrency(kpis.current_trust_balance)}
          subtitle="Firm-wide client trust funds"
          icon={Landmark}
          className="p-4"
        />
        <KPICard
          title="Unbilled Time"
          value={formatCurrency(kpis.unbilled_time_value)}
          subtitle="Pending billable hours at matter rates"
          icon={Clock}
          className="p-4"
        />
      </div>

      <div className={`grid ${analyticsGridGap} sm:grid-cols-2`}>
        <KPICard
          title="Outstanding A/R"
          value={formatCurrency(kpis.outstanding_ar)}
          subtitle="Balance due on issued invoices"
          icon={DollarSign}
          className="p-4"
        />
        <KPICard
          title="Overdue Invoices"
          value={String(kpis.overdue_invoice_count)}
          subtitle="Past due with balance outstanding"
          icon={AlertTriangle}
          className="p-4"
        />
      </div>

      <AnalyticsSectionDivider />

      <MatterHealthSummary scores={matterHealthScores} />

      <AnalyticsSectionDivider />

      <MonthlyCollectionsChart data={monthlyCollections} />

      <MatterProfitabilityTable
        rows={matterProfitability}
        variant="executive"
        healthByMatterId={healthByMatterId}
      />
    </AnalyticsPageShell>
  );
}

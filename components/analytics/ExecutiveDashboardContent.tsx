"use client";

import {
  AlertTriangle,
  BarChart3,
  Clock,
  DollarSign,
  HeartPulse,
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
import { ReportsContent } from "@/components/analytics/ReportsContent";
import {
  analyticsGridGap,
  analyticsSectionClass,
} from "@/components/analytics/analytics-styles";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PipelineProfitReviewPanel } from "@/components/pipeline/PipelineProfitReviewPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { computeExecutiveKpiTrends } from "@/lib/analytics/dashboard-utils";
import { ANALYTICS_ROLES } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/utils/cn";

export function ExecutiveDashboardContent() {
  const { selectedRole } = useDemoRole();
  const canViewEmbeddedReports = (
    ANALYTICS_ROLES as readonly string[]
  ).includes(selectedRole);
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
  const trends = computeExecutiveKpiTrends(
    kpis,
    monthlyCollections,
    matterProfitability,
  );
  const healthByMatterId = Object.fromEntries(
    matterHealthScores.map((score) => [score.matter_id, score.level]),
  );

  const collectionRateBadge =
    kpis.collection_rate_pct >= 90
      ? { label: "Strong", variant: "success" as const }
      : kpis.collection_rate_pct >= 75
        ? { label: "Fair", variant: "warning" as const }
        : { label: "Low", variant: "danger" as const };

  const arBadge =
    kpis.outstanding_ar > kpis.total_billed_revenue * 0.25
      ? { label: "A/R Alert", variant: "danger" as const }
      : kpis.outstanding_ar > 0
        ? { label: "Monitor", variant: "warning" as const }
        : undefined;

  return (
    <AnalyticsPageShell
      title="Executive Dashboard"
      description="Live KPIs from invoices, payments, expenses, and trust accounts"
      icon={TrendingUp}
      bannerText="Contract-to-cash analytics with matter health scoring — profitability, collections, trust balances, and risk in one view."
    >
      <PipelineProfitReviewPanel />

      {/* TOP: Key Metrics */}
      <section className={analyticsSectionClass}>
        <AnalyticsSectionDivider
          title="Key Metrics"
          description="Top firm-wide performance indicators with month-over-month trends"
          icon={DollarSign}
        />
        <div className={`grid ${analyticsGridGap} lg:grid-cols-4`}>
          <KPICard
            size="large"
            title="Billed Revenue"
            value={formatCurrency(kpis.total_billed_revenue)}
            subtitle="Issued invoices (total amount)"
            icon={DollarSign}
            trendInfo={trends.billed}
            gradient
          />
          <KPICard
            size="large"
            title="Collected Revenue"
            value={formatCurrency(kpis.total_collected_revenue)}
            subtitle="Cash applied to invoices"
            icon={TrendingUp}
            trendInfo={trends.collected}
            badge={
              kpis.collection_rate_pct >= 85
                ? { label: "On Track", variant: "success" }
                : { label: "Below Target", variant: "warning" }
            }
            gradient
          />
          <KPICard
            size="large"
            title="Collection Rate"
            value={`${kpis.collection_rate_pct.toFixed(1)}%`}
            subtitle="Collected ÷ billed"
            icon={Percent}
            trendInfo={trends.collectionRate}
            badge={collectionRateBadge}
            progress={{
              value: kpis.collection_rate_pct,
              max: 100,
              label: "Collection target",
            }}
            gradient
          />
          <KPICard
            size="large"
            title="Outstanding A/R"
            value={formatCurrency(kpis.outstanding_ar)}
            subtitle="Balance due on issued invoices"
            icon={DollarSign}
            trendInfo={trends.outstandingAr}
            badge={arBadge}
            gradient
          />
        </div>

        <div className={`grid ${analyticsGridGap} sm:grid-cols-2 lg:grid-cols-4`}>
          <KPICard
            title="Avg Profitability"
            value={formatCurrency(kpis.avg_matter_profitability)}
            subtitle="Average net profit per matter"
            icon={TrendingUp}
            trendInfo={trends.profitability}
            progress={{
              value: Math.min(
                100,
                Math.max(0, (kpis.avg_matter_profitability / 50000) * 100),
              ),
              label: "Margin health",
            }}
          />
          <KPICard
            title="Trust Balance"
            value={formatCurrency(kpis.current_trust_balance)}
            subtitle="Firm-wide client trust funds"
            icon={Landmark}
            trendInfo={trends.trust}
          />
          <KPICard
            title="Unbilled Time"
            value={formatCurrency(kpis.unbilled_time_value)}
            subtitle="Pending billable hours at matter rates"
            icon={Clock}
            trendInfo={trends.unbilled}
            badge={
              kpis.unbilled_time_value > 50000
                ? { label: "Pipeline", variant: "info" }
                : undefined
            }
          />
          <KPICard
            title="Overdue Invoices"
            value={String(kpis.overdue_invoice_count)}
            subtitle="Past due with balance outstanding"
            icon={AlertTriangle}
            trendInfo={trends.overdue}
            badge={
              kpis.overdue_invoice_count > 0
                ? { label: "Action Needed", variant: "danger" }
                : { label: "Clear", variant: "success" }
            }
          />
        </div>
      </section>

      {/* MIDDLE: Matter Health + Quick Actions */}
      <section className={analyticsSectionClass}>
        <AnalyticsSectionDivider
          title="Matter Health & Quick Actions"
          description="At-risk matters with inline reasons and escalation controls"
          icon={HeartPulse}
        />
        <MatterHealthSummary scores={matterHealthScores} />
      </section>

      {/* BOTTOM: Trends */}
      <section className={analyticsSectionClass}>
        <AnalyticsSectionDivider
          title="Trends & Profitability"
          description="Collection performance vs. baseline and matter-level profitability"
          icon={BarChart3}
        />
        <div className={`grid ${analyticsGridGap} xl:grid-cols-2`}>
          <MonthlyCollectionsChart data={monthlyCollections} />
          <MatterProfitabilityTable
            rows={matterProfitability}
            variant="executive"
            healthByMatterId={healthByMatterId}
          />
        </div>
      </section>

      {canViewEmbeddedReports ? (
        <section className={analyticsSectionClass}>
          <AnalyticsSectionDivider
            title="Reports"
            description="Practice area performance and matter-level profitability"
            icon={BarChart3}
          />
          <ReportsContent embedded />
        </section>
      ) : null}
    </AnalyticsPageShell>
  );
}

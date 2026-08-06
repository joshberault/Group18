"use client";

import {
  AlertTriangle,
  Clock,
  DollarSign,
  Landmark,
  Percent,
  TrendingUp,
} from "lucide-react";
import { MonthlyCollectionsChart } from "@/components/analytics/MonthlyCollectionsChart";
import { MatterProfitabilityTable } from "@/components/analytics/MatterProfitabilityTable";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useExecutiveDashboard } from "@/hooks/useExecutiveDashboard";
import { formatCurrency } from "@/lib/utils/cn";

export function ExecutiveDashboardContent() {
  const { data, loading, error, refresh } = useExecutiveDashboard();

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

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description="Live KPIs from invoices, payments, expenses, and trust accounts"
      />

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">Managing Partner View</p>
          <p className="mt-2 text-sm text-gray-200">
            Contract-to-cash analytics powered by Supabase — billed revenue, collections,
            profitability, trust balances, and risk indicators.
          </p>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          title="Billed Revenue"
          value={formatCurrency(kpis.total_billed_revenue)}
          subtitle="Issued invoices (total amount)"
          icon={DollarSign}
        />
        <KPICard
          title="Collected Revenue"
          value={formatCurrency(kpis.total_collected_revenue)}
          subtitle="Cash applied to invoices"
          icon={TrendingUp}
        />
        <KPICard
          title="Avg Profitability"
          value={formatCurrency(kpis.avg_matter_profitability)}
          subtitle="Average net profit per matter"
          icon={TrendingUp}
        />
        <KPICard
          title="Collection Rate"
          value={`${kpis.collection_rate_pct.toFixed(1)}%`}
          subtitle="Collected ÷ billed"
          icon={Percent}
        />
        <KPICard
          title="Trust Balance"
          value={formatCurrency(kpis.current_trust_balance)}
          subtitle="Firm-wide client trust funds"
          icon={Landmark}
        />
        <KPICard
          title="Unbilled Time"
          value={formatCurrency(kpis.unbilled_time_value)}
          subtitle="Pending billable hours at matter rates"
          icon={Clock}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <KPICard
          title="Outstanding A/R"
          value={formatCurrency(kpis.outstanding_ar)}
          subtitle="Balance due on issued invoices"
          icon={DollarSign}
        />
        <KPICard
          title="Overdue Invoices"
          value={String(kpis.overdue_invoice_count)}
          subtitle="Past due with balance outstanding"
          icon={AlertTriangle}
        />
      </div>

      <div className="mb-6">
        <MonthlyCollectionsChart data={monthlyCollections} />
      </div>

      <MatterProfitabilityTable rows={matterProfitability} variant="executive" />
    </>
  );
}

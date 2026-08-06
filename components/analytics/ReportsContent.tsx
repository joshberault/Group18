"use client";

import { BarChart3 } from "lucide-react";
import { SortableMatterProfitabilityTable } from "@/components/analytics/SortableMatterProfitabilityTable";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useMatterProfitabilityReport } from "@/hooks/useMatterProfitabilityReport";

export function ReportsContent() {
  const {
    rows,
    rowCount,
    loading,
    error,
    refresh,
    sortKey,
    sortDirection,
    toggleSort,
  } = useMatterProfitabilityReport();

  if (loading) {
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
    return (
      <>
        <PageHeader
          title="Reports"
          description="Profitability and operational analytics across the firm"
        />
        <EmptyState title="Unable to load report" description={error} />
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
        title="Reports"
        description="Matter-level profitability detail from live Supabase data"
      />

      <Card className="mb-6 border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
            <BarChart3 className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gold-500">Managing Partner View</p>
            <p className="mt-2 text-sm text-gray-200">
              Full matter profitability breakdown — revenue, collections, expenses,
              margins, and outstanding balances. Sort any column to analyze performance.
            </p>
          </div>
        </div>
      </Card>

      <SortableMatterProfitabilityTable
        rows={rows}
        rowCount={rowCount}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={toggleSort}
      />
    </>
  );
}

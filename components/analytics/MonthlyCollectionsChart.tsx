"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import {
  analyticsCardClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
} from "@/components/analytics/analytics-styles";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { computeCollectionsStats } from "@/lib/analytics/dashboard-utils";
import type { MonthlyCollectionRow } from "@/lib/analytics/types";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface MonthlyCollectionsChartProps {
  data: MonthlyCollectionRow[];
  compact?: boolean;
  analyticsHref?: string;
  loading?: boolean;
}

export function MonthlyCollectionsChart({
  data,
  compact = false,
  analyticsHref,
  loading = false,
}: MonthlyCollectionsChartProps) {
  const stats = computeCollectionsStats(data);
  const chartData = data.map((row) => ({
    month: row.month_label,
    amount: row.total_collected,
    target: stats.target,
  }));

  const chartHeight = compact ? "h-40" : "h-56";

  return (
    <Card padding="sm" className={cn(analyticsCardClass, "h-full")}>
      <CardHeader className={compact ? "mb-1" : "mb-2"}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-navy-700" />
              <CardTitle
                className={cn(
                  analyticsSectionTitleClass,
                  compact && "text-base",
                )}
              >
                Monthly Collections
              </CardTitle>
            </div>
            <CardDescription className={analyticsSectionDescClass}>
              Cash collected by payment date (last 6 months)
            </CardDescription>
          </div>

          {!compact && chartData.length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs">
              <StatPill
                label="YTD Total"
                value={formatCurrency(stats.ytdTotal)}
              />
              <StatPill
                label="Variance"
                value={`${stats.variance >= 0 ? "+" : ""}${formatCurrency(stats.variance)}`}
                tone={stats.variance >= 0 ? "positive" : "negative"}
              />
            </div>
          )}
        </div>

        {!compact && stats.bestMonth && stats.worstMonth && (
          <div className="mt-3 flex flex-wrap gap-2">
            <MiniStat
              label="Best month"
              value={`${formatCurrency(stats.bestMonth.amount)} (${stats.bestMonth.label})`}
              tone="positive"
            />
            <MiniStat
              label="Worst month"
              value={`${formatCurrency(stats.worstMonth.amount)} (${stats.worstMonth.label})`}
              tone="negative"
            />
          </div>
        )}

        {compact && chartData.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
            <span>
              Latest:{" "}
              <strong className="text-navy-900">
                {formatCurrency(chartData[chartData.length - 1]?.amount ?? 0)}
              </strong>
            </span>
            <span>·</span>
            <span>
              YTD:{" "}
              <strong className="text-navy-900">
                {formatCurrency(stats.ytdTotal)}
              </strong>
            </span>
          </div>
        ) : null}
      </CardHeader>

      <div className={cn(chartHeight, "w-full px-3 pb-3")}>
        {loading ? (
          <LoadingState message="Loading collections…" />
        ) : chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-gray-500">
            No collection activity in the selected period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: compact ? 10 : 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: compact ? 10 : 11 }}
                stroke="#6b7280"
                tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "target" ? "Target" : "Collections",
                ]}
              />
              {!compact ? (
                <Legend
                  verticalAlign="top"
                  height={24}
                  formatter={(value) =>
                    value === "target" ? "Monthly Target" : "Collections"
                  }
                />
              ) : null}
              <ReferenceLine
                y={stats.target}
                stroke="#94a3b8"
                strokeDasharray="6 4"
                label={
                  compact
                    ? undefined
                    : {
                        value: "Baseline",
                        position: "insideTopRight",
                        fill: "#64748b",
                        fontSize: 10,
                      }
                }
              />
              <Line
                type="monotone"
                dataKey="amount"
                name="amount"
                stroke="#1e2a4a"
                strokeWidth={compact ? 2 : 2.5}
                dot={{ fill: "#c9a227", r: compact ? 2 : 3 }}
                activeDot={{ r: compact ? 4 : 5 }}
              />
              {!compact ? (
                <Line
                  type="monotone"
                  dataKey="target"
                  name="target"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {analyticsHref ? (
        <div className="border-t border-gray-100 px-4 py-3">
          <Link
            href={analyticsHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy-900 hover:text-navy-700"
          >
            View executive analytics
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass = {
    positive: "text-emerald-700 bg-emerald-50 border-emerald-200",
    negative: "text-red-700 bg-red-50 border-red-200",
    neutral: "text-navy-800 bg-navy-50 border-gray-200",
  }[tone];

  return (
    <div className={cn("rounded-lg border px-2.5 py-1.5", toneClass)}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
        tone === "positive"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800",
      )}
    >
      <span className="font-semibold">{label}:</span>
      {value}
    </span>
  );
}

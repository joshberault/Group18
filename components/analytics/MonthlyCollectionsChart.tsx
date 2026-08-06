"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  analyticsCardClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
} from "@/components/analytics/analytics-styles";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { MonthlyCollectionRow } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/utils/cn";

interface MonthlyCollectionsChartProps {
  data: MonthlyCollectionRow[];
}

export function MonthlyCollectionsChart({ data }: MonthlyCollectionsChartProps) {
  const chartData = data.map((row) => ({
    month: row.month_label,
    amount: row.total_collected,
  }));

  return (
    <Card padding="sm" className={analyticsCardClass}>
      <CardHeader className="mb-2">
        <CardTitle className={analyticsSectionTitleClass}>
          Monthly Collections
        </CardTitle>
        <CardDescription className={analyticsSectionDescClass}>
          Cash collected by payment date (last 6 months)
        </CardDescription>
      </CardHeader>
      <div className="h-56 w-full px-3 pb-3">
        {chartData.length === 0 ? (
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
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6b7280" />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Collections"]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#1e2a4a"
                strokeWidth={2}
                dot={{ fill: "#c9a227", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

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
    <Card>
      <CardHeader>
        <CardTitle>Monthly Collections</CardTitle>
        <CardDescription>Cash collected by payment date (last 6 months)</CardDescription>
      </CardHeader>
      <div className="h-64 w-full px-4 pb-4">
        {chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted">
            No collection activity in the selected period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis
                tick={{ fontSize: 12 }}
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
                dot={{ fill: "#c9a227", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

"use client";

import { Building2 } from "lucide-react";
import {
  analyticsCardClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
  analyticsTableWrapClass,
} from "@/components/analytics/analytics-styles";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { PracticeAreaSummary } from "@/lib/analytics/practice-area";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface PracticeAreaBreakdownProps {
  summaries: PracticeAreaSummary[];
}

function profitTone(netProfit: number): string {
  if (netProfit < 0) return "text-red-700";
  if (netProfit === 0) return "text-gray-600";
  return "text-emerald-800";
}

export function PracticeAreaBreakdown({ summaries }: PracticeAreaBreakdownProps) {
  const top = summaries[0];
  const bottom = summaries[summaries.length - 1];

  return (
    <Card padding="sm" className={analyticsCardClass}>
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-navy-700" />
          <CardTitle className={analyticsSectionTitleClass}>
            Practice Area Breakdown
          </CardTitle>
        </div>
        <CardDescription className={analyticsSectionDescClass}>
          Revenue and profitability by practice area — identify top and bottom performers
        </CardDescription>
      </CardHeader>

      {summaries.length > 1 && top && bottom && (
        <div className="mb-3 grid gap-2 px-1 sm:grid-cols-2">
          <InsightChip
            label="Most profitable"
            value={`${top.practice_area} (${formatCurrency(top.net_profit)})`}
            tone="positive"
          />
          <InsightChip
            label="Least profitable"
            value={`${bottom.practice_area} (${formatCurrency(bottom.net_profit)})`}
            tone="negative"
          />
        </div>
      )}

      <div className={analyticsTableWrapClass}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Practice Area</TableHead>
              <TableHead>Matters</TableHead>
              <TableHead>Billed</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Net Profit</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Collection Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500">
                  No practice area data available.
                </TableCell>
              </TableRow>
            ) : (
              summaries.map((row) => (
                <TableRow
                  key={row.practice_area}
                  className="hover:bg-navy-50/50"
                >
                  <TableCell className="font-medium text-navy-900">
                    {row.practice_area}
                  </TableCell>
                  <TableCell>{row.matter_count}</TableCell>
                  <TableCell>{formatCurrency(row.billed_revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.collected_revenue)}</TableCell>
                  <TableCell className={cn("font-medium", profitTone(row.net_profit))}>
                    {formatCurrency(row.net_profit)}
                  </TableCell>
                  <TableCell>
                    {row.margin_pct == null ? "—" : `${row.margin_pct.toFixed(1)}%`}
                  </TableCell>
                  <TableCell>{row.collection_rate_pct.toFixed(1)}%</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function InsightChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "neutral" | "negative";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-xs",
        tone === "positive" &&
          "border-emerald-200 bg-emerald-50/60 text-emerald-900",
        tone === "neutral" && "border-gray-200 bg-gray-50 text-gray-700",
        tone === "negative" && "border-red-200 bg-red-50 text-red-900",
      )}
    >
      <p className="font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

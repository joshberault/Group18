"use client";

import { AlertTriangle, Zap } from "lucide-react";
import { MatterHealthBadge } from "@/components/analytics/MatterHealthBadge";
import { MiniSparkline } from "@/components/analytics/MiniSparkline";
import {
  analyticsCardClass,
  analyticsRowHealthClass,
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
import {
  estimateDaysOutstanding,
  generateMatterSparkline,
} from "@/lib/analytics/dashboard-utils";
import type { MatterHealthLevel } from "@/lib/analytics/matter-health";
import type { MatterProfitabilityRow } from "@/lib/analytics/types";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface MatterProfitabilityTableProps {
  rows: MatterProfitabilityRow[];
  variant?: "executive" | "detail";
  healthByMatterId?: Record<string, MatterHealthLevel>;
}

function formatMargin(margin: number | null): string {
  if (margin == null) return "—";
  return `${margin.toFixed(1)}%`;
}

function RiskIndicator({ level }: { level?: MatterHealthLevel }) {
  if (level === "red") {
    return (
      <span title="Critical" className="inline-flex text-base leading-none">
        ⚠️
      </span>
    );
  }
  if (level === "yellow") {
    return (
      <span title="At risk" className="inline-flex text-amber-600">
        <Zap className="h-4 w-4" />
      </span>
    );
  }
  return null;
}

export function MatterProfitabilityTable({
  rows,
  variant = "executive",
  healthByMatterId = {},
}: MatterProfitabilityTableProps) {
  const isDetail = variant === "detail";
  const isExecutive = variant === "executive";

  return (
    <Card padding="sm" className={cn(analyticsCardClass, "h-full")}>
      <CardHeader className="mb-3">
        <CardTitle className={analyticsSectionTitleClass}>
          Matter Profitability
        </CardTitle>
        <CardDescription className={analyticsSectionDescClass}>
          {isDetail
            ? "Revenue, expenses, and margin by matter"
            : "Net profit trends, A/R aging, and health indicators by matter"}
        </CardDescription>
      </CardHeader>
      <div className={analyticsTableWrapClass}>
        <Table>
          <TableHeader>
            <TableRow>
              {isExecutive && <TableHead className="w-8">&nbsp;</TableHead>}
              <TableHead>Matter</TableHead>
              <TableHead>Health</TableHead>
              {isDetail && <TableHead>Client</TableHead>}
              {isDetail && <TableHead>Practice Area</TableHead>}
              {isExecutive && <TableHead>Trend</TableHead>}
              <TableHead>Collected</TableHead>
              {isDetail && <TableHead>Expenses</TableHead>}
              <TableHead>Net Profit</TableHead>
              <TableHead>Margin</TableHead>
              {(isDetail || isExecutive) && <TableHead>Days Out.</TableHead>}
              {isDetail && <TableHead>A/R</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isDetail ? 10 : isExecutive ? 8 : 5}
                  className="text-center text-gray-500"
                >
                  No billing or expense activity found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const health = healthByMatterId[row.matter_id];
                const daysOut = estimateDaysOutstanding(row);
                const sparkline = generateMatterSparkline(row);

                return (
                  <TableRow
                    key={row.matter_id}
                    className={cn(
                      health
                        ? analyticsRowHealthClass[health]
                        : "hover:bg-navy-50/50",
                    )}
                  >
                    {isExecutive && (
                      <TableCell className="px-2">
                        <RiskIndicator level={health} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-navy-900">
                      {row.matter_title}
                    </TableCell>
                    <TableCell>
                      {health ? (
                        <MatterHealthBadge level={health} compact />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {isDetail && <TableCell>{row.client_name}</TableCell>}
                    {isDetail && (
                      <TableCell>{row.practice_area ?? "—"}</TableCell>
                    )}
                    {isExecutive && (
                      <TableCell>
                        <MiniSparkline data={sparkline} />
                      </TableCell>
                    )}
                    <TableCell>{formatCurrency(row.collected_revenue)}</TableCell>
                    {isDetail && (
                      <TableCell>{formatCurrency(row.total_expenses)}</TableCell>
                    )}
                    <TableCell
                      className={
                        row.net_profit < 0 ? "text-red-700" : "text-navy-900"
                      }
                    >
                      {formatCurrency(row.net_profit)}
                    </TableCell>
                    <TableCell>{formatMargin(row.margin_pct)}</TableCell>
                    {(isDetail || isExecutive) && (
                      <TableCell>
                        <DaysOutstandingBadge days={daysOut} />
                      </TableCell>
                    )}
                    {isDetail && (
                      <TableCell>{formatCurrency(row.outstanding_ar)}</TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function DaysOutstandingBadge({ days }: { days: number }) {
  if (days === 0) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const toneClass =
    days >= 60
      ? "bg-red-100 text-red-800"
      : days >= 30
        ? "bg-amber-100 text-amber-900"
        : "bg-emerald-100 text-emerald-800";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        toneClass,
      )}
    >
      {days >= 60 && <AlertTriangle className="h-3 w-3" />}
      {days}d
    </span>
  );
}

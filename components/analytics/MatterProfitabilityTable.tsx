"use client";

import { MatterHealthBadge } from "@/components/analytics/MatterHealthBadge";
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
import type { MatterHealthLevel } from "@/lib/analytics/matter-health";
import type { MatterProfitabilityRow } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/utils/cn";

interface MatterProfitabilityTableProps {
  rows: MatterProfitabilityRow[];
  variant?: "executive" | "detail";
  healthByMatterId?: Record<string, MatterHealthLevel>;
}

function formatMargin(margin: number | null): string {
  if (margin == null) return "—";
  return `${margin.toFixed(1)}%`;
}

export function MatterProfitabilityTable({
  rows,
  variant = "executive",
  healthByMatterId = {},
}: MatterProfitabilityTableProps) {
  const isDetail = variant === "detail";

  return (
    <Card padding="sm" className={analyticsCardClass}>
      <CardHeader className="mb-3">
        <CardTitle className={analyticsSectionTitleClass}>
          Matter Profitability
        </CardTitle>
        <CardDescription className={analyticsSectionDescClass}>
          {isDetail
            ? "Revenue, expenses, and margin by matter"
            : "Net profit by matter with health score indicators"}
        </CardDescription>
      </CardHeader>
      <div className={analyticsTableWrapClass}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Health</TableHead>
              {isDetail && <TableHead>Client</TableHead>}
              {isDetail && <TableHead>Practice Area</TableHead>}
              <TableHead>Collected</TableHead>
              {isDetail && <TableHead>Expenses</TableHead>}
              <TableHead>Net Profit</TableHead>
              <TableHead>Margin</TableHead>
              {isDetail && <TableHead>A/R</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isDetail ? 9 : 5}
                  className="text-center text-gray-500"
                >
                  No billing or expense activity found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.matter_id}
                  className="hover:bg-navy-50/50"
                >
                  <TableCell className="font-medium text-navy-900">
                    {row.matter_title}
                  </TableCell>
                  <TableCell>
                    {healthByMatterId[row.matter_id] ? (
                      <MatterHealthBadge
                        level={healthByMatterId[row.matter_id]}
                        compact
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {isDetail && <TableCell>{row.client_name}</TableCell>}
                  {isDetail && (
                    <TableCell>{row.practice_area ?? "—"}</TableCell>
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
                  {isDetail && (
                    <TableCell>{formatCurrency(row.outstanding_ar)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

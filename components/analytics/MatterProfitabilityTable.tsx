"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { MatterProfitabilityRow } from "@/lib/analytics/types";
import { formatCurrency } from "@/lib/utils/cn";

interface MatterProfitabilityTableProps {
  rows: MatterProfitabilityRow[];
  /** Show full columns for the Reports page; executive view uses a compact layout */
  variant?: "executive" | "detail";
}

function formatMargin(margin: number | null): string {
  if (margin == null) return "—";
  return `${margin.toFixed(1)}%`;
}

export function MatterProfitabilityTable({
  rows,
  variant = "executive",
}: MatterProfitabilityTableProps) {
  const isDetail = variant === "detail";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matter Profitability</CardTitle>
        <CardDescription>
          {isDetail
            ? "Revenue, expenses, and margin by matter"
            : "Top matters by net profit (lowest first)"}
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Matter</TableHead>
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
                colSpan={isDetail ? 8 : 4}
                className="text-center text-muted"
              >
                No billing or expense activity found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.matter_id}>
                <TableCell className="font-medium">{row.matter_title}</TableCell>
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
                    row.net_profit < 0 ? "text-red-600" : "text-navy-900"
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
    </Card>
  );
}

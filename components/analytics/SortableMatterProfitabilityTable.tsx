"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type {
  ProfitabilitySortKey,
  SortDirection,
} from "@/hooks/useMatterProfitabilityReport";
import type { MatterProfitabilityRow } from "@/lib/analytics/types";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface SortableMatterProfitabilityTableProps {
  rows: MatterProfitabilityRow[];
  rowCount: number;
  sortKey: ProfitabilitySortKey;
  sortDirection: SortDirection;
  onSort: (key: ProfitabilitySortKey) => void;
}

function formatMargin(margin: number | null): string {
  if (margin == null) return "—";
  return `${margin.toFixed(1)}%`;
}

function formatBillingType(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: ProfitabilitySortKey;
  activeKey: ProfitabilitySortKey;
  direction: SortDirection;
  onSort: (key: ProfitabilitySortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive
    ? direction === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 font-medium text-navy-900 hover:text-gold-600"
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-gold-600" : "text-muted")} />
      </button>
    </TableHead>
  );
}

export function SortableMatterProfitabilityTable({
  rows,
  rowCount,
  sortKey,
  sortDirection,
  onSort,
}: SortableMatterProfitabilityTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matter Profitability Detail</CardTitle>
        <CardDescription>
          {rowCount} matter{rowCount === 1 ? "" : "s"} — click column headers to sort
        </CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                label="Matter"
                sortKey="matter_title"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <TableHead>Client</TableHead>
              <TableHead>Practice Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing</TableHead>
              <SortableHeader
                label="Billed"
                sortKey="billed_revenue"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Collected"
                sortKey="collected_revenue"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <TableHead>Expenses</TableHead>
              <SortableHeader
                label="Net Profit"
                sortKey="net_profit"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortableHeader
                label="Margin"
                sortKey="margin_pct"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <TableHead>A/R</TableHead>
              <TableHead>Unbilled Exp.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted">
                  No billing or expense activity found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.matter_id}>
                  <TableCell className="min-w-[180px] font-medium">
                    {row.matter_title}
                  </TableCell>
                  <TableCell>{row.client_name}</TableCell>
                  <TableCell>{row.practice_area ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.matter_status} />
                  </TableCell>
                  <TableCell>{formatBillingType(row.billing_type)}</TableCell>
                  <TableCell>{formatCurrency(row.billed_revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.collected_revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.total_expenses)}</TableCell>
                  <TableCell
                    className={
                      row.net_profit < 0 ? "text-red-600" : "text-navy-900"
                    }
                  >
                    {formatCurrency(row.net_profit)}
                  </TableCell>
                  <TableCell>{formatMargin(row.margin_pct)}</TableCell>
                  <TableCell>{formatCurrency(row.outstanding_ar)}</TableCell>
                  <TableCell>{formatCurrency(row.unbilled_expenses)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

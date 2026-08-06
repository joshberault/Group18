"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { MatterHealthBadge } from "@/components/analytics/MatterHealthBadge";
import {
  analyticsCardClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
  analyticsTableWrapClass,
} from "@/components/analytics/analytics-styles";
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
import type { MatterHealthLevel } from "@/lib/analytics/matter-health";
import type { MatterProfitabilityRow } from "@/lib/analytics/types";
import { cn, formatCurrency } from "@/lib/utils/cn";

interface SortableMatterProfitabilityTableProps {
  rows: MatterProfitabilityRow[];
  rowCount: number;
  sortKey: ProfitabilitySortKey;
  sortDirection: SortDirection;
  onSort: (key: ProfitabilitySortKey) => void;
  healthByMatterId?: Record<string, MatterHealthLevel>;
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
        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-navy-800 hover:text-gold-600"
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-gold-600" : "text-gray-400")} />
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
  healthByMatterId = {},
}: SortableMatterProfitabilityTableProps) {
  return (
    <Card padding="sm" className={analyticsCardClass}>
      <CardHeader className="mb-3">
        <CardTitle className={analyticsSectionTitleClass}>
          Matter Profitability Detail
        </CardTitle>
        <CardDescription className={analyticsSectionDescClass}>
          {rowCount} matter{rowCount === 1 ? "" : "s"} — click column headers to sort
        </CardDescription>
      </CardHeader>
      <div className={analyticsTableWrapClass}>
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
              <TableHead>Health</TableHead>
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
                <TableCell colSpan={13} className="text-center text-gray-500">
                  No billing or expense activity found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.matter_id}
                  className="hover:bg-navy-50/50"
                >
                  <TableCell className="min-w-[180px] font-medium text-navy-900">
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
                      row.net_profit < 0 ? "text-red-700" : "text-navy-900"
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

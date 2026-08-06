"use client";

import { useMemo, useState } from "react";
import {
  billingAttorneyOptions,
  billingCycleOptions,
  billingQueueRecords,
  billingQueueStatusOptions,
  type BillingQueueRecord,
  type BillingQueueStatus,
} from "@/lib/mock-data/billing-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import { BillingRecordDetailModal } from "./BillingRecordDetailModal";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const PAGE_SIZE = 8;

export interface BillingQueueFilters {
  search: string;
  status: string;
  attorney: string;
  billingCycle: string;
  exceptionsOnly: boolean;
}

interface BillingQueueSectionProps {
  filters: BillingQueueFilters;
  onFiltersChange: (filters: BillingQueueFilters) => void;
}

function statusToBadgeKey(status: BillingQueueStatus): string {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function BillingQueueSection({
  filters,
  onFiltersChange,
}: BillingQueueSectionProps) {
  const [page, setPage] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<BillingQueueRecord | null>(
    null,
  );

  const filteredRecords = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return billingQueueRecords
      .filter((record) => {
        if (filters.exceptionsOnly && !record.isException) return false;
        if (filters.status !== "all" && record.status !== filters.status) {
          return false;
        }
        if (
          filters.attorney !== "All attorneys" &&
          record.attorney !== filters.attorney
        ) {
          return false;
        }
        if (
          filters.billingCycle !== "All cycles" &&
          record.billingCycle !== filters.billingCycle
        ) {
          return false;
        }
        if (!search) return true;
        return (
          record.matter.toLowerCase().includes(search) ||
          record.client.toLowerCase().includes(search) ||
          record.attorney.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => b.daysWaiting - a.daysWaiting);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRecords = filteredRecords.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const updateFilter = (partial: Partial<BillingQueueFilters>) => {
    setPage(0);
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Billing Queue</CardTitle>
          <CardDescription>
            Manager-level review of matters in the billing pipeline
          </CardDescription>
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Matter, client, or attorney..."
            value={filters.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(e) => updateFilter({ status: e.target.value })}
            options={[
              { value: "all", label: "All statuses" },
              ...billingQueueStatusOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            label="Attorney"
            value={filters.attorney}
            onChange={(e) => updateFilter({ attorney: e.target.value })}
            options={billingAttorneyOptions.map((a) => ({ value: a, label: a }))}
          />
          <Select
            label="Billing cycle"
            value={filters.billingCycle}
            onChange={(e) => updateFilter({ billingCycle: e.target.value })}
            options={billingCycleOptions.map((c) => ({ value: c, label: c }))}
          />
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm text-navy-900">
          <input
            type="checkbox"
            checked={filters.exceptionsOnly}
            onChange={(e) => updateFilter({ exceptionsOnly: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          Exceptions only
        </label>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Responsible Attorney</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Unbilled WIP</TableHead>
              <TableHead>Draft Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days Waiting</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted">
                  No billing records match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.matter}</TableCell>
                  <TableCell>{record.client}</TableCell>
                  <TableCell>{record.attorney}</TableCell>
                  <TableCell>{record.billingCycle}</TableCell>
                  <TableCell>{formatCurrency(record.unbilledWip)}</TableCell>
                  <TableCell>
                    {record.draftAmount > 0
                      ? formatCurrency(record.draftAmount)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={statusToBadgeKey(record.status)} />
                  </TableCell>
                  <TableCell>{record.daysWaiting}</TableCell>
                  <TableCell>{record.lastUpdated}</TableCell>
                  <TableCell>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedRecord(record)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Showing {filteredRecords.length === 0 ? 0 : currentPage * PAGE_SIZE + 1}
            –
            {Math.min((currentPage + 1) * PAGE_SIZE, filteredRecords.length)} of{" "}
            {filteredRecords.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <BillingRecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </section>
  );
}

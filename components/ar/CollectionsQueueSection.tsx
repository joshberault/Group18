"use client";

import { useMemo, useState } from "react";
import {
  arAttorneyOptions,
  arCollectionStatusOptions,
  arCollectorOptions,
  arCollectionsQueue,
  arOfficeOptions,
  arAgingBucketOptions,
  type ArCollectionsRecord,
  type CollectionStatus,
} from "@/lib/mock-data/ar-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import { CollectionRecordDetailDrawer } from "./CollectionRecordDetailDrawer";
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

export interface CollectionsQueueFilters {
  search: string;
  agingBucket: string;
  attorney: string;
  collectionStatus: string;
  assignedCollector: string;
  office: string;
  minBalance: string;
  exceptionsOnly: boolean;
  client: string;
  exceptionType: string;
  kpiFilter: string;
}

interface CollectionsQueueSectionProps {
  filters: CollectionsQueueFilters;
  onFiltersChange: (filters: CollectionsQueueFilters) => void;
}

function statusToBadgeKey(status: CollectionStatus): string {
  return status.toLowerCase().replace(/\s+/g, "_");
}

function sortPriority(record: ArCollectionsRecord): number {
  let score = 0;
  if (record.agingBucket === "90+ Days") score += 1000;
  score += record.outstandingBalance;
  score += record.lastContactDays * 10;
  if (record.collectionStatus === "Disputed") score += 500;
  if (record.collectionStatus === "Write-Off Requested") score += 400;
  return score;
}

function matchesExceptionType(
  record: ArCollectionsRecord,
  exceptionType: string,
): boolean {
  if (!exceptionType) return true;
  return record.exceptionTypes.includes(exceptionType);
}

export function CollectionsQueueSection({
  filters,
  onFiltersChange,
}: CollectionsQueueSectionProps) {
  const [page, setPage] = useState(0);
  const [selectedRecord, setSelectedRecord] =
    useState<ArCollectionsRecord | null>(null);

  const filteredRecords = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const minBalance = filters.minBalance
      ? Number.parseFloat(filters.minBalance)
      : 0;

    return arCollectionsQueue
      .filter((record) => {
        if (filters.exceptionsOnly && !record.isException) return false;
        if (
          filters.agingBucket !== "all" &&
          record.agingBucket !== filters.agingBucket
        ) {
          return false;
        }
        if (
          filters.collectionStatus !== "all" &&
          record.collectionStatus !== filters.collectionStatus
        ) {
          return false;
        }
        if (
          filters.attorney !== "All attorneys" &&
          record.attorney !== filters.attorney
        ) {
          return false;
        }
        if (
          filters.assignedCollector !== "All collectors" &&
          record.assignedCollector !== filters.assignedCollector
        ) {
          return false;
        }
        if (
          filters.office !== "All offices" &&
          record.office !== filters.office
        ) {
          return false;
        }
        if (filters.client && record.client !== filters.client) return false;
        if (
          filters.exceptionType &&
          !matchesExceptionType(record, filters.exceptionType)
        ) {
          return false;
        }
        if (minBalance > 0 && record.outstandingBalance < minBalance) {
          return false;
        }
        if (filters.kpiFilter === "collection_rate") {
          if (
            record.collectionStatus !== "Current" &&
            record.collectionStatus !== "Payment Plan"
          ) {
            return false;
          }
        }
        if (!search) return true;
        return (
          record.client.toLowerCase().includes(search) ||
          record.matter.toLowerCase().includes(search) ||
          record.invoiceNumber.toLowerCase().includes(search) ||
          record.attorney.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => sortPriority(b) - sortPriority(a));
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRecords = filteredRecords.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  const updateFilter = (partial: Partial<CollectionsQueueFilters>) => {
    setPage(0);
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Collections Work Queue</CardTitle>
          <CardDescription>
            Outstanding invoices requiring collection oversight and follow-up
          </CardDescription>
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search"
            placeholder="Client, matter, invoice, or attorney..."
            value={filters.search}
            onChange={(e) => updateFilter({ search: e.target.value })}
          />
          <Select
            label="Aging bucket"
            value={filters.agingBucket}
            onChange={(e) => updateFilter({ agingBucket: e.target.value })}
            options={[
              { value: "all", label: "All buckets" },
              ...arAgingBucketOptions.map((b) => ({ value: b, label: b })),
            ]}
          />
          <Select
            label="Attorney"
            value={filters.attorney}
            onChange={(e) => updateFilter({ attorney: e.target.value })}
            options={arAttorneyOptions.map((a) => ({ value: a, label: a }))}
          />
          <Select
            label="Collection status"
            value={filters.collectionStatus}
            onChange={(e) =>
              updateFilter({ collectionStatus: e.target.value })
            }
            options={[
              { value: "all", label: "All statuses" },
              ...arCollectionStatusOptions.map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
          <Select
            label="Assigned collector"
            value={filters.assignedCollector}
            onChange={(e) =>
              updateFilter({ assignedCollector: e.target.value })
            }
            options={arCollectorOptions.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Office"
            value={filters.office}
            onChange={(e) => updateFilter({ office: e.target.value })}
            options={arOfficeOptions.map((o) => ({ value: o, label: o }))}
          />
          <Input
            label="Minimum balance"
            type="number"
            placeholder="0"
            value={filters.minBalance}
            onChange={(e) => updateFilter({ minBalance: e.target.value })}
          />
        </div>

        <label className="mb-4 flex items-center gap-2 text-sm text-navy-900">
          <input
            type="checkbox"
            checked={filters.exceptionsOnly}
            onChange={(e) =>
              updateFilter({ exceptionsOnly: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          Exceptions only
        </label>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Matter</TableHead>
              <TableHead>Responsible Attorney</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Original Amount</TableHead>
              <TableHead>Outstanding Balance</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Collection Status</TableHead>
              <TableHead>Last Contact</TableHead>
              <TableHead>Next Follow-Up</TableHead>
              <TableHead>Assigned Collector</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted">
                  No invoices match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {record.invoiceNumber}
                  </TableCell>
                  <TableCell>{record.client}</TableCell>
                  <TableCell>{record.matter}</TableCell>
                  <TableCell>{record.attorney}</TableCell>
                  <TableCell>{record.invoiceDate}</TableCell>
                  <TableCell>{record.dueDate}</TableCell>
                  <TableCell>{formatCurrency(record.originalAmount)}</TableCell>
                  <TableCell>
                    {formatCurrency(record.outstandingBalance)}
                  </TableCell>
                  <TableCell>{record.ageDays}d</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={statusToBadgeKey(record.collectionStatus)}
                    />
                  </TableCell>
                  <TableCell>{record.lastContact}</TableCell>
                  <TableCell>{record.nextFollowUp}</TableCell>
                  <TableCell>{record.assignedCollector}</TableCell>
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
            Showing{" "}
            {filteredRecords.length === 0 ? 0 : currentPage * PAGE_SIZE + 1}–
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

      <CollectionRecordDetailDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </section>
  );
}

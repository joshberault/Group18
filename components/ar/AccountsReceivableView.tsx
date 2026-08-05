"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  FileDown,
  FileText,
} from "lucide-react";
import {
  arAgingBuckets,
  arAttorneyResponsibility,
  arClientRiskProfiles,
  arCollectionExceptions,
  arPaymentExceptions,
  arRecentActivity,
  arSummaryKpis,
  type CollectionRisk,
} from "@/lib/mock-data/ar-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import {
  CollectionsQueueSection,
  type CollectionsQueueFilters,
} from "./CollectionsQueueSection";
import { WriteOffApprovalsSection } from "./WriteOffApprovalsSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const defaultQueueFilters: CollectionsQueueFilters = {
  search: "",
  agingBucket: "all",
  attorney: "All attorneys",
  collectionStatus: "all",
  assignedCollector: "All collectors",
  office: "All offices",
  minBalance: "",
  exceptionsOnly: false,
  client: "",
  exceptionType: "",
  kpiFilter: "",
};

function riskVariant(risk: CollectionRisk) {
  if (risk === "Green") return "success" as const;
  if (risk === "Yellow") return "warning" as const;
  return "danger" as const;
}

export function AccountsReceivableView() {
  const queueRef = useRef<HTMLDivElement>(null);
  const [queueFilters, setQueueFilters] =
    useState<CollectionsQueueFilters>(defaultQueueFilters);
  const [prototypeAction, setPrototypeAction] = useState<string | null>(null);

  const scrollToQueue = () => {
    queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyQueueFilter = (partial: Partial<CollectionsQueueFilters>) => {
    setQueueFilters((prev) => ({
      ...prev,
      ...partial,
      kpiFilter: partial.kpiFilter ?? "",
    }));
    scrollToQueue();
  };

  const resetAndApply = (partial: Partial<CollectionsQueueFilters>) => {
    setQueueFilters({ ...defaultQueueFilters, ...partial });
    scrollToQueue();
  };

  const totalAr = arAgingBuckets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <>
      <PageHeader
        title="Accounts Receivable"
        description="Monitor outstanding invoices, collections, payment activity, aging, and receivable exceptions across the firm."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPrototypeAction("Record Payment")}>
            <DollarSign className="h-4 w-4" />
            Record Payment
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPrototypeAction("Apply Unapplied Cash")}
          >
            <CreditCard className="h-4 w-4" />
            Apply Unapplied Cash
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              applyQueueFilter({
                collectionStatus: "Write-Off Requested",
                exceptionsOnly: true,
              })
            }
          >
            <FileText className="h-4 w-4" />
            Review Write-Offs
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPrototypeAction("Export Aging Report")}
          >
            <FileDown className="h-4 w-4" />
            Export Aging Report
          </Button>
        </div>
      </PageHeader>

      {/* Section 1: Receivable Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {arSummaryKpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            onClick={() => resetAndApply(kpi.queueFilter)}
            className="text-left"
          >
            <KPICard
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.supportingText}
              className={
                kpi.warning
                  ? "cursor-pointer border-amber-300 bg-amber-50/60 transition-shadow hover:shadow-md"
                  : "cursor-pointer transition-shadow hover:shadow-md"
              }
            />
          </button>
        ))}
      </div>

      {/* Section 2: Aging Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Aging Summary</CardTitle>
          <CardDescription>
            Outstanding receivables by aging bucket — {formatCurrency(totalAr)}{" "}
            total
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full">
            {arAgingBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className="h-full bg-navy-900 first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${bucket.percentOfTotal}%`,
                  opacity:
                    bucket.label === "90+ Days"
                      ? 1
                      : bucket.label === "61–90 Days"
                        ? 0.85
                        : bucket.label === "31–60 Days"
                          ? 0.7
                          : bucket.label === "1–30 Days"
                            ? 0.55
                            : 0.4,
                }}
                title={`${bucket.label}: ${bucket.percentOfTotal}%`}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {arAgingBuckets.map((bucket) => (
              <button
                key={bucket.id}
                type="button"
                onClick={() =>
                  resetAndApply({ agingBucket: bucket.label })
                }
                className="rounded-lg border border-gray-200 p-4 text-left transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-semibold text-navy-900">
                  {bucket.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-navy-900">
                  {formatCurrency(bucket.amount)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {bucket.invoiceCount} invoices · {bucket.percentOfTotal}%
                </p>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Section 3: Collection Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle>Collection Exceptions</CardTitle>
            <CardDescription>Issues requiring manager attention</CardDescription>
          </CardHeader>
          <ul className="space-y-3 px-6 pb-6">
            {arCollectionExceptions.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {item.count} invoices · {item.impact}
                    </p>
                  </div>
                  <StatusBadge
                    status={item.severity.toLowerCase()}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => resetAndApply(item.queueFilter)}
                >
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Section 4: Client Collection Risk */}
        <Card>
          <CardHeader>
            <CardTitle>Client Collection Risk</CardTitle>
            <CardDescription>
              Clients with elevated receivable exposure
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>90+ Day</TableHead>
                <TableHead>Oldest Invoice</TableHead>
                <TableHead>Attorney</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Disputes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arClientRiskProfiles.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() =>
                    resetAndApply({ client: client.client })
                  }
                >
                  <TableCell className="font-medium">
                    {client.client}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(client.outstandingBalance)}
                  </TableCell>
                  <TableCell>
                    {client.balance90Plus > 0
                      ? formatCurrency(client.balance90Plus)
                      : "—"}
                  </TableCell>
                  <TableCell>{client.oldestInvoice}</TableCell>
                  <TableCell>{client.attorney}</TableCell>
                  <TableCell>
                    <Badge variant={riskVariant(client.collectionRisk)}>
                      {client.collectionRisk}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.openDisputes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Section 5: Collections Work Queue */}
      <div ref={queueRef} className="mb-6">
        <CollectionsQueueSection
          filters={queueFilters}
          onFiltersChange={setQueueFilters}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Section 6: Attorney Responsibility */}
        <Card>
          <CardHeader>
            <CardTitle>Attorney Responsibility</CardTitle>
            <CardDescription>
              Receivable exposure by responsible attorney
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attorney</TableHead>
                <TableHead>Total A/R</TableHead>
                <TableHead>Past Due</TableHead>
                <TableHead>90+</TableHead>
                <TableHead>Disputed</TableHead>
                <TableHead>Action Needed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arAttorneyResponsibility.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    resetAndApply({ attorney: row.attorney })
                  }
                >
                  <TableCell className="font-medium">{row.attorney}</TableCell>
                  <TableCell>{formatCurrency(row.totalAr)}</TableCell>
                  <TableCell>{formatCurrency(row.pastDue)}</TableCell>
                  <TableCell>
                    {row.balance90Plus > 0
                      ? formatCurrency(row.balance90Plus)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {row.disputed > 0 ? formatCurrency(row.disputed) : "—"}
                  </TableCell>
                  <TableCell>
                    {row.attorneyActionNeeded > 0 ? (
                      <span className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {row.attorneyActionNeeded}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Section 7: Payment Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Exceptions</CardTitle>
            <CardDescription>
              Cash application and payment processing issues
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            {arPaymentExceptions.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-sm font-medium text-navy-900">
                  {item.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-navy-900">
                  {item.count}
                </p>
                <p className="text-xs text-muted">
                  {formatCurrency(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <WriteOffApprovalsSection />

      {/* Section 9: Recent Collection Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Collection Activity</CardTitle>
        </CardHeader>
        <ul className="space-y-3 px-6 pb-6">
          {arRecentActivity.map((event) => (
            <li
              key={event.id}
              className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-navy-900">
                  {event.action}
                </p>
                <span className="shrink-0 text-xs text-muted">
                  {event.relativeTime}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{event.matter}</p>
              <p className="text-sm text-navy-900">{event.description}</p>
              <p className="text-xs text-muted">{event.user}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        isOpen={Boolean(prototypeAction)}
        onClose={() => setPrototypeAction(null)}
        title="Prototype action"
        description={prototypeAction ?? undefined}
      >
        <p className="text-sm text-muted">
          This action is not connected to a backend process in the current
          prototype. No receivable records were changed.
        </p>
        <Button className="mt-4" onClick={() => setPrototypeAction(null)}>
          Close
        </Button>
      </Modal>
    </>
  );
}

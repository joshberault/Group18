"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Send,
  Upload,
} from "lucide-react";
import {
  billingBottlenecks,
  billingDeadlines,
  billingExceptions,
  billingHealthKpis,
  billingMonthlyProgress,
  billingRecentActivity,
} from "@/lib/mock-data/billing-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import {
  BillingQueueSection,
  type BillingQueueFilters,
} from "./BillingQueueSection";
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

const defaultQueueFilters: BillingQueueFilters = {
  search: "",
  status: "all",
  attorney: "All attorneys",
  billingCycle: "All cycles",
  exceptionsOnly: false,
};

export function BillingOversightView() {
  const queueRef = useRef<HTMLDivElement>(null);
  const [queueFilters, setQueueFilters] =
    useState<BillingQueueFilters>(defaultQueueFilters);
  const [prototypeAction, setPrototypeAction] = useState<string | null>(null);

  const progress = billingMonthlyProgress;
  const remaining = progress.total - progress.completed;

  const scrollToQueue = () => {
    queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const applyBottleneckFilter = (status: string) => {
    setQueueFilters((prev) => ({ ...prev, status, exceptionsOnly: false }));
    scrollToQueue();
  };

  const applyExceptionFilter = (filters: Partial<BillingQueueFilters>) => {
    setQueueFilters((prev) => ({ ...prev, ...filters }));
    scrollToQueue();
  };

  return (
    <>
      <PageHeader
        title="Billing Oversight"
        description="Monitor billing progress, attorney approvals, unbilled work, and billing exceptions across the firm."
      >
        <Button onClick={scrollToQueue}>View Billing Queue</Button>
      </PageHeader>

      {/* Section 1: Billing Health Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {billingHealthKpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.supportingText}
            className={
              kpi.warning
                ? "border-amber-300 bg-amber-50/60"
                : undefined
            }
          />
        ))}
      </div>

      {/* Section 2: Monthly Billing Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{progress.label}</CardTitle>
          <CardDescription>
            {progress.completed} of {progress.total} billable matters completed —{" "}
            {progress.percent}%
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-navy-900 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Completed</p>
              <p className="text-sm font-semibold text-navy-900">
                {progress.completed}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Remaining</p>
              <p className="text-sm font-semibold text-navy-900">{remaining}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Billed</p>
              <p className="text-sm font-semibold text-navy-900">
                {formatCurrency(progress.billedAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Unbilled WIP</p>
              <p className="text-sm font-semibold text-navy-900">
                {formatCurrency(progress.unbilledWip)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Section 3: Billing Bottlenecks */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Bottlenecks</CardTitle>
            <CardDescription>Current pipeline by billing status</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Bills</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billingBottlenecks.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.warning ? "bg-amber-50/40" : undefined}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {row.warning && (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                      {row.status}
                    </div>
                  </TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatCurrency(row.amount)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        applyBottleneckFilter(row.queueStatusFilter)
                      }
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Section 4: Billing Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Exceptions</CardTitle>
            <CardDescription>Issues requiring manager attention</CardDescription>
          </CardHeader>
          <ul className="space-y-3 px-6 pb-6">
            {billingExceptions.map((item) => (
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
                      {item.count} bills · {item.impact}
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
                  onClick={() =>
                    applyExceptionFilter({
                      exceptionsOnly: item.queueFilter?.exceptionsOnly ?? true,
                      status: item.queueFilter?.status ?? "all",
                    })
                  }
                >
                  Review
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div ref={queueRef} className="mb-6">
        <BillingQueueSection
          filters={queueFilters}
          onFiltersChange={setQueueFilters}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Section 6: Upcoming Billing Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Billing Deadlines</CardTitle>
          </CardHeader>
          <ul className="space-y-3 px-6 pb-6">
            {billingDeadlines.map((deadline) => (
              <li
                key={deadline.id}
                className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-navy-900">
                    {deadline.date} — {deadline.label}
                  </p>
                </div>
                <Badge variant="neutral">{deadline.affectedCount} matters</Badge>
              </li>
            ))}
          </ul>
        </Card>

        {/* Section 7: Recent Billing Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Billing Activity</CardTitle>
          </CardHeader>
          <ul className="space-y-3 px-6 pb-6">
            {billingRecentActivity.map((event) => (
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
                <p className="mt-1 text-sm text-muted">{event.reference}</p>
                <p className="text-xs text-muted">{event.user}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Prototype manager actions</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3 px-6 pb-6">
          <Button
            variant="secondary"
            onClick={() => setPrototypeAction("Generate Draft Bills")}
          >
            <FileText className="h-4 w-4" />
            Generate Draft Bills
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              applyExceptionFilter({ exceptionsOnly: true, status: "all" });
            }}
          >
            <AlertTriangle className="h-4 w-4" />
            Review Exceptions
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPrototypeAction("Finalize Approved Bills")}
          >
            <Send className="h-4 w-4" />
            Finalize Approved Bills
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPrototypeAction("Export LEDES")}
          >
            <Upload className="h-4 w-4" />
            Export LEDES
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={Boolean(prototypeAction)}
        onClose={() => setPrototypeAction(null)}
        title="Prototype action"
        description={prototypeAction ?? undefined}
      >
        <p className="text-sm text-muted">
          This action is not connected to a backend process in the current
          prototype. No billing records were changed.
        </p>
        <Button className="mt-4" onClick={() => setPrototypeAction(null)}>
          Close
        </Button>
      </Modal>
    </>
  );
}

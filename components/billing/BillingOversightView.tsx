"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Send,
  Upload,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { fetchBillingOversightWorkspace, useSupabaseQuery } from "@/lib/accounting";
import type { BillingException, BillingDeadline, BillingActivityEvent } from "@/lib/mock-data/billing-oversight";
import { downloadTextFile } from "@/lib/accounting-manager/download-text";
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
import { Toast } from "@/components/ui/Toast";
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
  const { data: workspace, loading, error } = useSupabaseQuery(
    fetchBillingOversightWorkspace,
    [],
  );
  const billingHealthKpis = workspace?.healthKpis ?? [];
  const billingMonthlyProgress =
    workspace?.monthlyProgress ?? {
      label: "August 2026",
      completed: 0,
      total: 0,
      percent: 0,
      billedAmount: 0,
      unbilledWip: 0,
    };
  const billingBottlenecks = workspace?.bottlenecks ?? [];
  const billingQueueRecords = workspace?.queueRecords ?? [];
  const billingExceptions: BillingException[] = [];
  const billingDeadlines: BillingDeadline[] = [];
  const billingRecentActivity: BillingActivityEvent[] = [];
  const queueRef = useRef<HTMLDivElement>(null);
  const [queueFilters, setQueueFilters] =
    useState<BillingQueueFilters>(defaultQueueFilters);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  function exportLedes() {
    const lines = [
      "LEDES98BI|V2|INVOICE_DATE|INVOICE_NUMBER|CLIENT_ID|LINE_ITEM_NUMBER|EXP/FEE/INV_ADJ_TYPE|LINE_ITEM_NUMBER|EXP/FEE/INV_ADJ_DATE|TASK|EXP/FEE/INV_ADJ_DESC|LINE_ITEM_AMOUNT",
      ...billingQueueRecords.map(
        (record, index) =>
          `LEDES|${record.client}|${record.matter}|${record.attorney}|${record.status}|${record.draftAmount}|${index + 1}`,
      ),
    ];
    downloadTextFile("billing-queue-ledes.txt", lines.join("\n"), "text/plain");
    setToast("LEDES export downloaded from current billing queue.");
  }

  function generateDraftBills() {
    const draftReady = billingQueueRecords.filter(
      (record) => record.status === "Draft",
    ).length;
    applyExceptionFilter({ status: "Draft", exceptionsOnly: false });
    setToast(
      `${draftReady} matters marked Draft Ready in queue view (session preview).`,
    );
  }

  function finalizeApprovedBills() {
    setConfirmAction({
      title: "Finalize approved bills",
      message:
        "Finalize all approved bills in the current session preview? No invoices will be sent externally.",
      action: () => {
        const approved = billingQueueRecords.filter(
          (record) => record.status === "Approved",
        ).length;
        applyExceptionFilter({ status: "Ready to Send", exceptionsOnly: false });
        setToast(`${approved} approved bills moved to Ready to Send (session only).`);
        setConfirmAction(null);
      },
    });
  }

  if (loading) {
    return <LoadingState message="Loading billing oversight..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Billing data unavailable"
        description={error}
        moduleLabel="Billing Oversight"
      />
    );
  }

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
          records={billingQueueRecords}
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
          <Button variant="secondary" onClick={generateDraftBills}>
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
          <Button variant="secondary" onClick={finalizeApprovedBills}>
            <Send className="h-4 w-4" />
            Finalize Approved Bills
          </Button>
          <Button variant="secondary" onClick={exportLedes}>
            <Upload className="h-4 w-4" />
            Export LEDES
          </Button>
        </div>
      </Card>

      <Modal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? "Confirm"}
        description={confirmAction?.message}
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button onClick={() => confirmAction?.action()}>Confirm</Button>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

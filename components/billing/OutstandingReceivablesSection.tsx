"use client";

import { useEffect, useMemo, useState } from "react";
import { BillingPeriodToolbar } from "@/components/billing/BillingPeriodToolbar";
import { InvoiceDetailsModal } from "@/components/billing/InvoiceDetailsModal";
import { PaymentReminderModal } from "@/components/billing/PaymentReminderModal";
import { RecordPaymentModal } from "@/components/billing/RecordPaymentModal";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { KPICard } from "@/components/ui/KPICard";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/lib/utils/cn";
import {
  getInvoiceAttorneys,
  INVOICE_STATUSES,
} from "@/lib/billing/invoice-seed";
import {
  refreshInvoiceCatalog,
  updateManagedInvoice,
} from "@/lib/billing/invoice-management-store";
import {
  AGING_BUCKETS,
  getOutstandingReceivables,
  getReceivablesSummary,
  type AgingBucket,
  type OutstandingReceivableRow,
} from "@/lib/billing/receivables-utils";
import type { Invoice, InvoiceStatus } from "@/lib/billing/invoice-types";
import { useBillingPeriodMetrics } from "@/lib/billing/use-billing-period-metrics";
import { BILLING_ROUTES } from "@/lib/billing/routes";
import { findMatterByClientAndName } from "@/lib/client-related-matters/data";
import { addPaymentReceivedNotification } from "@/lib/client-related-matters/notifications-store";

type SortKey =
  | "invoiceNumber"
  | "client"
  | "legalMatter"
  | "attorney"
  | "invoiceDate"
  | "dueDate"
  | "amountDue"
  | "amountPaid"
  | "remainingBalance"
  | "daysOverdue"
  | "agingBucket"
  | "status"
  | "lastReminderSent"
  | "reminderCount"
  | "reminderStatus";

type SortDir = "asc" | "desc";

const OPEN_STATUS_FILTERS: InvoiceStatus[] = [
  "Sent",
  "Partially Paid",
  "Overdue",
  "Disputed",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function agingVariant(
  bucket: AgingBucket,
): "success" | "gold" | "warning" | "danger" | "neutral" {
  if (bucket === "Current") return "success";
  if (bucket === "1–30") return "gold";
  if (bucket === "31–60") return "warning";
  return "danger";
}

function compareRows(
  a: OutstandingReceivableRow,
  b: OutstandingReceivableRow,
  key: SortKey,
): number {
  if (key === "lastReminderSent") {
    return (a.lastReminderSent || "").localeCompare(b.lastReminderSent || "");
  }
  if (key === "reminderCount") {
    return (a.reminderCount ?? 0) - (b.reminderCount ?? 0);
  }
  if (key === "reminderStatus") {
    return String(a.reminderStatus ?? "None").localeCompare(
      String(b.reminderStatus ?? "None"),
    );
  }
  const left = a[key];
  const right = b[key];
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function OutstandingReceivablesSection() {
  const {
    period,
    applyPreset,
    applyCustomRange,
    periodLabel,
    allInvoices,
    invoicesInPeriod,
    outsidePeriodCount,
  } = useBillingPeriodMetrics();

  // Open A/R only among invoices issued in the selected billing period
  const rows = useMemo(
    () => getOutstandingReceivables(invoicesInPeriod),
    [invoicesInPeriod],
  );
  const summary = useMemo(() => getReceivablesSummary(rows), [rows]);
  const attorneys = useMemo(() => getInvoiceAttorneys(rows), [rows]);
  const emptyPeriodOpenAr = invoicesInPeriod.length === 0;
  const emptyOpenInPeriod =
    !emptyPeriodOpenAr && rows.length === 0;

  const [clientSearch, setClientSearch] = useState("");
  const [attorney, setAttorney] = useState("all");
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [aging, setAging] = useState<"all" | AgingBucket>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("daysOverdue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "overdue") {
        setOverdueOnly(true);
        setStatus("all");
        setAging("all");
        setSortKey("daysOverdue");
        setSortDir("desc");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const filteredSorted = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (overdueOnly && !row.isOverdue) return false;
      if (q && !row.client.toLowerCase().includes(q)) return false;
      if (attorney !== "all" && row.attorney !== attorney) return false;
      if (status !== "all" && row.status !== status) return false;
      if (aging !== "all" && row.agingBucket !== aging) return false;
      return true;
    });

    return [...next].sort((a, b) => {
      const result = compareRows(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
  }, [
    rows,
    clientSearch,
    attorney,
    status,
    aging,
    overdueOnly,
    sortKey,
    sortDir,
  ]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "invoiceNumber" ||
          key === "client" ||
          key === "legalMatter" ||
          key === "attorney" ||
          key === "status" ||
          key === "agingBucket" ||
          key === "reminderStatus" ||
          key === "lastReminderSent"
          ? "asc"
          : "desc",
      );
    }
  }

  function sortMarker(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  async function handleSendReminder(invoice: Invoice) {
    const nextCount = (invoice.reminderCount ?? 0) + 1;
    const updated = await updateManagedInvoice(invoice.invoiceNumber, {
      lastReminderSent: todayIso(),
      reminderCount: nextCount,
      reminderStatus: "Reminder Sent",
    });
    await refreshInvoiceCatalog();
    setActionNote(
      updated
        ? `Payment reminder sent for ${invoice.invoiceNumber}. Reminder count is now ${nextCount}.`
        : `Could not update reminder fields for ${invoice.invoiceNumber}.`,
    );
  }

  async function handleRecordPayment(invoice: Invoice, amount: number) {
    const recordedAt = new Date();
    const paymentId = `pay-rem-${recordedAt.getTime()}`;
    const paid = invoice.amountPaid + amount;
    const remaining = Math.max(
      0,
      Math.round((invoice.remainingBalance - amount) * 100) / 100,
    );
    const newStatus =
      remaining <= 0
        ? "Paid"
        : paid > 0
          ? "Partially Paid"
          : invoice.status;
    const updated = await updateManagedInvoice(invoice.invoiceNumber, {
      amountPaid: paid,
      remainingBalance: remaining,
      status: newStatus as InvoiceStatus,
      paymentHistory: [
        ...(invoice.paymentHistory ?? []),
        {
          id: paymentId,
          date: todayIso(),
          method: "Check",
          reference: `REM-${invoice.invoiceNumber}`,
          amount,
        },
      ],
    });
    if (updated) {
      const matter = findMatterByClientAndName(
        invoice.client,
        invoice.legalMatter,
      );
      addPaymentReceivedNotification({
        notificationId: `crm-notif-${paymentId}`,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client,
        matterName: invoice.legalMatter,
        matterReference: matter?.matterReference ?? "",
        amount,
        remainingBalance: remaining,
        createdAt: recordedAt.toISOString(),
      });
    }
    await refreshInvoiceCatalog();
    setActionNote(
      updated
        ? `Payment of ${formatCurrency(amount)} recorded for ${invoice.invoiceNumber}.`
        : `Could not record payment for ${invoice.invoiceNumber}.`,
    );
  }

  const sortCols: { key: SortKey; label: string; overdueOnly?: boolean }[] = [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "client", label: "Client" },
    { key: "legalMatter", label: "Matter" },
    { key: "attorney", label: "Attorney" },
    { key: "invoiceDate", label: "Invoice Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "amountDue", label: "Amount Due" },
    { key: "amountPaid", label: "Paid" },
    { key: "remainingBalance", label: "Balance" },
    { key: "daysOverdue", label: "Days OD" },
    { key: "lastReminderSent", label: "Last Reminder", overdueOnly: true },
    { key: "reminderCount", label: "Reminders", overdueOnly: true },
    { key: "reminderStatus", label: "Reminder Status", overdueOnly: true },
    { key: "agingBucket", label: "Aging" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          overdueOnly ? "Overdue Invoices" : "Outstanding Accounts Receivable"
        }
        description={
          overdueOnly
            ? "Past-due open invoices with remaining balance. Clear the overdue filter to see all receivables."
            : "Unpaid and partially paid invoices with aging and balance detail."
        }
      >
        <div className="flex flex-col items-end gap-2">
          {!overdueOnly ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setOverdueOnly(true);
                setStatus("all");
                setAging("all");
                setSortKey("daysOverdue");
                setSortDir("desc");
                if (typeof window !== "undefined") {
                  window.history.replaceState(
                    {},
                    "",
                    `${BILLING_ROUTES.receivables}?view=overdue`,
                  );
                }
              }}
            >
              View Overdue
            </Button>
          ) : null}
          <p className="text-xs text-muted" role="status">
            {overdueOnly
              ? `${summary.overdueCount} overdue of ${rows.length} open`
              : "Open receivables from Invoice Management"}
          </p>
        </div>
      </PageHeader>

      <BillingPeriodToolbar
        variant="panel"
        period={period}
        periodLabel={periodLabel}
        invoiceCountInPeriod={invoicesInPeriod.length}
        invoiceCountAll={allInvoices.length}
        outsidePeriodCount={outsidePeriodCount}
        onApplyPreset={applyPreset}
        onApplyCustomRange={applyCustomRange}
        footnote="Open A/R is limited to invoices issued in the selected period."
      />

      {overdueOnly ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            Showing overdue invoices only (days past due &gt; 0 or status
            Overdue).
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setOverdueOnly(false);
              if (typeof window !== "undefined") {
                window.history.replaceState({}, "", BILLING_ROUTES.receivables);
              }
            }}
          >
            Show all receivables
          </Button>
        </div>
      ) : null}

      {emptyPeriodOpenAr ? (
        <EmptyState
          title="No invoices found for the selected billing period."
          description="Adjust the billing period to see open receivables."
        />
      ) : emptyOpenInPeriod ? (
        <EmptyState
          title="No open receivables for this period."
          description="Invoices issued in this period have no remaining balance, or none match the open A/R statuses."
        />
      ) : null}

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Receivables summary"
      >
        <KPICard
          title="Total Outstanding AR"
          value={formatCurrency(summary.totalOutstanding)}
        />
        <button
          type="button"
          className="text-left transition-opacity hover:opacity-90"
          onClick={() => {
            setOverdueOnly(true);
            setStatus("all");
            setAging("all");
            setSortKey("daysOverdue");
            setSortDir("desc");
            if (typeof window !== "undefined") {
              window.history.replaceState(
                {},
                "",
                `${BILLING_ROUTES.receivables}?view=overdue`,
              );
            }
          }}
        >
          <KPICard
            title="Total Overdue Invoices"
            value={String(summary.overdueCount)}
            subtitle="Click to view overdue only"
            className="border-amber-200"
          />
        </button>
        <KPICard
          title="Total Unpaid Invoices"
          value={String(summary.unpaidCount)}
        />
        <KPICard
          title="Partially Paid Invoices"
          value={String(summary.partiallyPaidCount)}
        />
      </section>

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search by client"
            type="search"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="e.g. Northline"
          />
          <Select
            label="Filter by attorney"
            value={attorney}
            onChange={(e) => setAttorney(e.target.value)}
            options={[
              { value: "all", label: "All attorneys" },
              ...attorneys.map((name) => ({ value: name, label: name })),
            ]}
          />
          <Select
            label="Filter by invoice status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | InvoiceStatus)
            }
            options={[
              { value: "all", label: "All open statuses" },
              ...OPEN_STATUS_FILTERS.filter((s) =>
                INVOICE_STATUSES.includes(s),
              ).map((value) => ({ value, label: value })),
            ]}
          />
          <Select
            label="Filter by aging bucket"
            value={aging}
            onChange={(e) =>
              setAging(e.target.value as "all" | AgingBucket)
            }
            options={[
              { value: "all", label: "All aging buckets" },
              ...AGING_BUCKETS.map((bucket) => ({
                value: bucket,
                label: bucket,
              })),
            ]}
          />
        </div>

        {actionNote ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            <span>{actionNote}</span>
            <Button size="sm" variant="ghost" onClick={() => setActionNote(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}

        <p className="text-sm text-muted" aria-live="polite">
          Showing {filteredSorted.length} of{" "}
          {overdueOnly ? summary.overdueCount : rows.length}{" "}
          {overdueOnly ? "overdue invoice" : "open receivable"}
          {(overdueOnly ? summary.overdueCount : rows.length) === 1 ? "" : "s"}
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              {sortCols
                .filter((c) => !c.overdueOnly || overdueOnly)
                .map((col) => (
                  <TableHead key={col.key}>
                    <button
                      type="button"
                      className="font-semibold uppercase tracking-wide text-muted hover:text-navy-900"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortMarker(col.key)}
                    </button>
                  </TableHead>
                ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSorted.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted">
                  No outstanding receivables match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredSorted.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(row.isOverdue && "bg-red-50/40")}
                >
                  <TableCell className="font-semibold">
                    {row.invoiceNumber}
                  </TableCell>
                  <TableCell>{row.client}</TableCell>
                  <TableCell>{row.legalMatter}</TableCell>
                  <TableCell>{row.attorney}</TableCell>
                  <TableCell>{formatDate(row.invoiceDate)}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell>{formatCurrency(row.amountDue)}</TableCell>
                  <TableCell>{formatCurrency(row.amountPaid)}</TableCell>
                  <TableCell className="font-medium text-amber-800">
                    {formatCurrency(row.remainingBalance)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      row.daysOverdue > 60 && "font-semibold text-red-700",
                      row.daysOverdue > 0 &&
                        row.daysOverdue <= 60 &&
                        "text-amber-800",
                    )}
                  >
                    {row.daysOverdue}
                  </TableCell>
                  {overdueOnly ? (
                    <>
                      <TableCell>
                        {row.lastReminderSent
                          ? formatDate(row.lastReminderSent)
                          : "—"}
                      </TableCell>
                      <TableCell>{row.reminderCount ?? 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.reminderStatus === "Reminder Sent"
                              ? "gold"
                              : "neutral"
                          }
                        >
                          {row.reminderStatus ?? "None"}
                        </Badge>
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    <Badge variant={agingVariant(row.agingBucket)}>
                      {row.agingBucket}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[9rem] flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewInvoice(row)}
                      >
                        View Account
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReminderInvoice(row)}
                      >
                        Send Reminder
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setPaymentInvoice(row)}
                      >
                        Record Payment
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {viewInvoice ? (
        <InvoiceDetailsModal
          invoice={viewInvoice}
          onClose={() => setViewInvoice(null)}
        />
      ) : null}
      {reminderInvoice ? (
        <PaymentReminderModal
          invoice={reminderInvoice}
          onClose={() => setReminderInvoice(null)}
          onSend={handleSendReminder}
        />
      ) : null}
      {paymentInvoice ? (
        <RecordPaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSave={handleRecordPayment}
        />
      ) : null}
    </div>
  );
}

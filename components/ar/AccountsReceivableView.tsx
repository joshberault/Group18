"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  FileDown,
  FileText,
} from "lucide-react";
import type {
  ArCollectionException,
  ArActivityEvent,
  CollectionRisk,
} from "@/lib/mock-data/ar-oversight";
import { fetchReceivablesWorkspace, useSupabaseQuery } from "@/lib/accounting";
import {
  getAllManagedInvoices,
  refreshInvoiceCatalog,
  updateManagedInvoice,
} from "@/lib/billing/invoice-management-store";
import type { InvoiceStatus } from "@/lib/billing/invoice-types";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { exportToCsv } from "@/lib/accounting-manager/export-csv";
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
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
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

const paymentExceptionFilters: Record<
  string,
  Partial<CollectionsQueueFilters>
> = {
  pe1: { exceptionsOnly: true, exceptionType: "unapplied_payments" },
  pe2: { exceptionsOnly: true, search: "partial" },
  pe3: { exceptionsOnly: true, search: "failed" },
  pe4: { exceptionsOnly: true, search: "overpayment" },
  pe5: { exceptionsOnly: true, exceptionType: "credits_not_applied" },
  pe6: { exceptionsOnly: true, search: "returned" },
  pe7: { exceptionsOnly: true, search: "pending deposit" },
};

type ArModal =
  | { type: "record_payment" }
  | { type: "apply_cash" }
  | null;

export function AccountsReceivableView() {
  const searchParams = useSearchParams();
  const { data: workspace, loading, error, refresh } = useSupabaseQuery(
    fetchReceivablesWorkspace,
    [],
  );
  const arSummaryKpis = workspace?.summaryKpis ?? [];
  const arAgingBuckets = workspace?.agingBuckets ?? [];
  const arClientRiskProfiles = workspace?.clientRiskProfiles ?? [];
  const arAttorneyResponsibility = workspace?.attorneyResponsibility ?? [];
  const arPaymentExceptions = workspace?.paymentExceptions ?? [];
  const collectionsQueue = workspace?.collectionsQueue ?? [];
  const queueRef = useRef<HTMLDivElement>(null);
  const writeOffRef = useRef<HTMLDivElement>(null);
  const paymentExceptionRef = useRef<HTMLDivElement>(null);

  const initialFilters = (): CollectionsQueueFilters => {
    const next = { ...defaultQueueFilters };
    const kpi = searchParams.get("kpi");
    const section = searchParams.get("section");
    const filter = searchParams.get("filter");
    if (kpi === "90plus") next.agingBucket = "90+";
    if (kpi === "stale") next.collectionStatus = "No Activity";
    if (section === "write-offs") {
      next.collectionStatus = "Write-Off Requested";
    }
    if (section === "payment-exceptions") {
      next.exceptionsOnly = true;
      if (filter === "unapplied") next.exceptionType = "unapplied_payments";
      if (filter === "failed") next.search = "failed";
    }
    return next;
  };

  const [queueFilters, setQueueFilters] =
    useState<CollectionsQueueFilters>(initialFilters);
  const [modal, setModal] = useState<ArModal>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentClient, setPaymentClient] = useState("");
  const [paymentInvoice, setPaymentInvoice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Check");
  const [paymentNote, setPaymentNote] = useState("");
  const [cashClient, setCashClient] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashInvoice, setCashInvoice] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const sessionActivity: ArActivityEvent[] = [];
  const arCollectionExceptions: ArCollectionException[] = [];

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "write-offs" && writeOffRef.current) {
      writeOffRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (section === "payment-exceptions" && paymentExceptionRef.current) {
      paymentExceptionRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (searchParams.get("kpi") && queueRef.current) {
      queueRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams]);

  function riskVariant(risk: CollectionRisk) {
    if (risk === "Green") return "success" as const;
    if (risk === "Yellow") return "warning" as const;
    return "danger" as const;
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
    setPaymentClient("");
    setPaymentInvoice("");
    setPaymentAmount("");
    setPaymentNote("");
    setCashClient("");
    setCashAmount("");
    setCashInvoice("");
  }

  async function submitRecordPayment() {
    const amount = Number(paymentAmount);
    if (!paymentInvoice.trim()) {
      setFormError("Invoice number is required.");
      return;
    }
    if (!paymentClient.trim()) {
      setFormError("Client is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Payment amount must be greater than zero.");
      return;
    }

    await refreshInvoiceCatalog();
    const invoice = getAllManagedInvoices().find(
      (row) =>
        row.invoiceNumber.toLowerCase() === paymentInvoice.trim().toLowerCase(),
    );
    if (!invoice) {
      setFormError(`Invoice ${paymentInvoice.trim()} was not found.`);
      return;
    }

    const paid = invoice.amountPaid + amount;
    const remaining = Math.max(
      0,
      Math.round((invoice.remainingBalance - amount) * 100) / 100,
    );
    const newStatus: InvoiceStatus =
      remaining <= 0
        ? "Paid"
        : paid > 0
          ? "Partially Paid"
          : invoice.status;
    const paymentId = `pay-ar-${Date.now()}`;
    const updated = await updateManagedInvoice(invoice.invoiceNumber, {
      amountPaid: paid,
      remainingBalance: remaining,
      status: newStatus,
      paymentHistory: [
        ...(invoice.paymentHistory ?? []),
        {
          id: paymentId,
          date: new Date().toISOString().slice(0, 10),
          method: paymentMethod,
          reference: paymentNote.trim() || `AR-${invoice.invoiceNumber}`,
          amount,
        },
      ],
    });

    if (!updated) {
      setFormError("Could not record payment. Try again from Billing receivables.");
      return;
    }

    await refresh();
    setToast(
      `Payment of ${formatCurrency(amount)} recorded for ${invoice.invoiceNumber}.`,
    );
    closeModal();
  }

  async function submitApplyCash() {
    const amount = Number(cashAmount);
    if (!cashClient.trim() || !cashInvoice.trim()) {
      setFormError("Client and invoice are required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }

    await refreshInvoiceCatalog();
    const invoice = getAllManagedInvoices().find(
      (row) =>
        row.invoiceNumber.toLowerCase() === cashInvoice.trim().toLowerCase(),
    );
    if (!invoice) {
      setFormError(`Invoice ${cashInvoice.trim()} was not found.`);
      return;
    }

    const paid = invoice.amountPaid + amount;
    const remaining = Math.max(
      0,
      Math.round((invoice.remainingBalance - amount) * 100) / 100,
    );
    const newStatus: InvoiceStatus =
      remaining <= 0
        ? "Paid"
        : paid > 0
          ? "Partially Paid"
          : invoice.status;
    const updated = await updateManagedInvoice(invoice.invoiceNumber, {
      amountPaid: paid,
      remainingBalance: remaining,
      status: newStatus,
      paymentHistory: [
        ...(invoice.paymentHistory ?? []),
        {
          id: `pay-cash-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          method: "Check",
          reference: `CASH-${invoice.invoiceNumber}`,
          amount,
        },
      ],
    });

    if (!updated) {
      setFormError("Could not apply cash to that invoice.");
      return;
    }

    await refresh();
    setToast(
      `${formatCurrency(amount)} applied to ${invoice.invoiceNumber}.`,
    );
    closeModal();
  }

  function exportAgingReport() {
    exportToCsv(
      "ar-aging-report.csv",
      ["Aging Bucket", "Amount", "Invoice Count", "Percent of Total"],
      arAgingBuckets.map((bucket) => [
        bucket.label,
        String(bucket.amount),
        String(bucket.invoiceCount),
        `${bucket.percentOfTotal}%`,
      ]),
    );
    setToast("A/R aging report exported.");
  }

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

  if (loading) {
    return <LoadingState message="Loading receivables..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Receivables data unavailable"
        description={error}
        moduleLabel="Accounts Receivable"
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Accounts Receivable"
        description="Monitor outstanding invoices, collections, payment activity, aging, and receivable exceptions across the firm."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModal({ type: "record_payment" })}>
            <DollarSign className="h-4 w-4" />
            Record Payment
          </Button>
          <Button
            variant="secondary"
            onClick={() => setModal({ type: "apply_cash" })}
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
          <Button variant="secondary" onClick={exportAgingReport}>
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
          records={collectionsQueue}
          onRecordsChange={() => void refresh()}
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
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  resetAndApply(paymentExceptionFilters[item.id] ?? { exceptionsOnly: true })
                }
                className="rounded-lg border border-gray-200 p-4 text-left transition-shadow hover:shadow-md"
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
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div ref={writeOffRef}>
        <WriteOffApprovalsSection />
      </div>

      {/* Section 9: Recent Collection Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Collection Activity</CardTitle>
        </CardHeader>
        <ul className="space-y-3 px-6 pb-6">
          {sessionActivity.map((event) => (
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
        isOpen={modal?.type === "record_payment"}
        onClose={closeModal}
        title="Record Payment"
        description="Record a payment against an open invoice. Updates receivables and posts to the general ledger."
      >
        <div className="space-y-4">
          <Input
            label="Invoice number"
            value={paymentInvoice}
            onChange={(e) => setPaymentInvoice(e.target.value)}
            required
          />
          <Input
            label="Client"
            value={paymentClient}
            onChange={(e) => setPaymentClient(e.target.value)}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
          />
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: "Check", label: "Check" },
              { value: "ACH", label: "ACH" },
              { value: "Wire", label: "Wire" },
              { value: "Credit Card", label: "Credit Card" },
            ]}
          />
          <Textarea
            label="Notes (optional)"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={submitRecordPayment}>Record payment</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal?.type === "apply_cash"}
        onClose={closeModal}
        title="Apply Unapplied Cash"
        description="Apply unapplied cash to an open invoice."
      >
        <div className="space-y-4">
          <Input
            label="Client"
            value={cashClient}
            onChange={(e) => setCashClient(e.target.value)}
            required
          />
          <Input
            label="Invoice number"
            value={cashInvoice}
            onChange={(e) => setCashInvoice(e.target.value)}
            required
          />
          <Input
            label="Amount to apply"
            type="number"
            min="0.01"
            step="0.01"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            required
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={submitApplyCash}>Apply cash</Button>
          </div>
        </div>
      </Modal>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

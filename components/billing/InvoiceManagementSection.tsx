"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BillingPeriodToolbar } from "@/components/billing/BillingPeriodToolbar";
import { InvoiceDetailsModal } from "@/components/billing/InvoiceDetailsModal";
import { RecordPaymentModal } from "@/components/billing/RecordPaymentModal";
import { DeleteInvoiceModal } from "@/components/billing/DeleteInvoiceModal";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  BILLING_METHODS,
  getInvoiceAttorneys,
  INVOICE_STATUSES,
} from "@/lib/billing/invoice-seed";
import {
  countGeneratedInvoices,
  deleteManagedInvoice,
  getAllManagedInvoices,
  INVOICES_UPDATED_EVENT,
  refreshInvoiceCatalog,
  updateManagedInvoice,
} from "@/lib/billing/invoice-management-store";
import { filterInvoicesByPeriod } from "@/lib/billing/dashboard-metrics";
import {
  createDefaultBillingPeriod,
  formatPeriodLabel,
  resolvePeriodRange,
  type BillingPeriodPreset,
  type BillingPeriodState,
} from "@/lib/billing/billing-period";
import type {
  BillingMethod,
  Invoice,
  InvoiceStatus,
} from "@/lib/billing/invoice-types";
import { parseInvoiceStatusParam } from "@/lib/billing/invoice-status-summary";
import { isInvoiceOverdue } from "@/lib/billing/receivables-utils";
import { BILLING_ROUTES } from "@/lib/billing/routes";

type Props = {
  invoices?: Invoice[];
};

type SortKey =
  | "invoiceNumber"
  | "client"
  | "legalMatter"
  | "billingMethod"
  | "invoiceDate"
  | "dueDate"
  | "totalAmount"
  | "amountPaid"
  | "remainingBalance"
  | "status";

type SortDir = "asc" | "desc";

const PAGE_SIZES = [5, 10, 25] as const;

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

function compareInvoices(a: Invoice, b: Invoice, key: SortKey): number {
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

export function InvoiceManagementSection({ invoices }: Props) {
  const [catalog, setCatalog] = useState<Invoice[]>(
    () => invoices ?? [],
  );
  const [generatedCount, setGeneratedCount] = useState(0);
  const [highlightNumber, setHighlightNumber] = useState<string | null>(null);
  const [period, setPeriod] = useState<BillingPeriodState>(() =>
    createDefaultBillingPeriod(),
  );

  const [clientSearch, setClientSearch] = useState("");
  const [attorney, setAttorney] = useState("all");
  const [billingMethod, setBillingMethod] = useState<"all" | BillingMethod>(
    "all",
  );
  const [status, setStatus] = useState<"all" | InvoiceStatus | "none">("all");
  const [statusFilterLabel, setStatusFilterLabel] = useState<string | null>(
    null,
  );
  /** Calendar/status rule filter for overdue (view=overdue), not just status=Overdue */
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("invoiceDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  function applyPreset(preset: BillingPeriodPreset) {
    if (preset === "custom") {
      setPeriod((prev) => ({
        ...prev,
        preset: "custom",
        range: resolvePeriodRange("custom", new Date(), {
          start: prev.customStart,
          end: prev.customEnd,
        }),
      }));
      setPage(1);
      return;
    }
    const range = resolvePeriodRange(preset);
    setPeriod({
      preset,
      range,
      customStart: range.start,
      customEnd: range.end,
    });
    setPage(1);
  }

  function applyCustomRange(start: string, end: string) {
    const range = resolvePeriodRange("custom", new Date(), { start, end });
    setPeriod({
      preset: "custom",
      range,
      customStart: start,
      customEnd: end,
    });
    setPage(1);
  }

  const activeRange = useMemo(() => {
    if (period.preset === "custom") return period.range;
    return resolvePeriodRange(period.preset);
  }, [period]);

  const periodLabel = useMemo(
    () => formatPeriodLabel(period.preset, activeRange),
    [period.preset, activeRange],
  );

  /** Period filter first (shared invoiceDate helper), then other list filters. */
  const periodScoped = useMemo(
    () => filterInvoicesByPeriod(catalog, activeRange),
    [catalog, activeRange],
  );

  const outsidePeriodCount = Math.max(0, catalog.length - periodScoped.length);

  function refreshCatalog() {
    const all = getAllManagedInvoices();
    setCatalog(all);
    setGeneratedCount(countGeneratedInvoices());
  }

  async function reloadFromSupabase() {
    await refreshInvoiceCatalog();
    refreshCatalog();
  }

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async function handleRecordPayment(invoice: Invoice, amount: number) {
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
          id: `pay-inv-${Date.now()}`,
          date: todayIso(),
          method: "Check",
          reference: `PMT-${invoice.invoiceNumber}`,
          amount,
        },
      ],
    });
    await reloadFromSupabase();
    setActionNote(
      updated
        ? `Payment of ${formatCurrency(amount)} recorded for ${invoice.invoiceNumber}.`
        : `Could not record payment for ${invoice.invoiceNumber}.`,
    );
  }

  async function handleConfirmDelete(invoice: Invoice) {
    const result = await deleteManagedInvoice(invoice.invoiceNumber);
    await reloadFromSupabase();
    setActionNote(
      result.ok
        ? `Invoice ${invoice.invoiceNumber} deleted.`
        : `Could not fully remove ${invoice.invoiceNumber}${result.error ? `: ${result.error}` : ""}.`,
    );
  }

  useEffect(() => {
    // Optional initial paint from props only; live list always reloads from Supabase.
    if (invoices && invoices.length > 0) {
      setCatalog(invoices);
    }

    const onCacheUpdated = () => {
      refreshCatalog();
    };
    const reload = () => {
      void reloadFromSupabase();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reload();
      }
    };

    void reloadFromSupabase();

    try {
      const params = new URLSearchParams(window.location.search);
      const hl = params.get("highlight");
      const view = params.get("view");
      const clientParam = params.get("client");
      const attorneyParam = params.get("attorney");
      const statusParam = params.get("status");

      if (hl) {
        setHighlightNumber(hl);
        setClientSearch("");
        setAttorney("all");
        setBillingMethod("all");
        setStatus("all");
        setStatusFilterLabel(null);
        setOverdueOnly(false);
        setSortKey("invoiceNumber");
        setSortDir("desc");
        setPage(1);
      }
      if (view === "completed" || view === "paid") {
        setClientSearch("");
        setAttorney("all");
        setBillingMethod("all");
        setStatus("Paid");
        setStatusFilterLabel("Paid");
        setOverdueOnly(false);
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
      if (view === "overdue") {
        setClientSearch("");
        setAttorney("all");
        setBillingMethod("all");
        setStatus("all");
        setStatusFilterLabel("Overdue");
        setOverdueOnly(true);
        setSortKey("dueDate");
        setSortDir("asc");
        setPage(1);
      }
      if (statusParam) {
        const parsed = parseInvoiceStatusParam(statusParam);
        setClientSearch("");
        setAttorney("all");
        setBillingMethod("all");
        setOverdueOnly(false);
        if (parsed === "none") {
          setStatus("none");
          setStatusFilterLabel(statusParam.trim());
        } else if (parsed) {
          setStatus(parsed);
          setStatusFilterLabel(parsed === "Cancelled" ? "Canceled" : parsed);
        } else {
          // Preserve paid deep-link shortcuts even if casing varies
          const lower = statusParam.trim().toLowerCase();
          if (lower === "paid") {
            setStatus("Paid");
            setStatusFilterLabel("Paid");
          }
        }
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
      if (clientParam && clientParam.trim()) {
        setClientSearch(clientParam.trim());
        setAttorney("all");
        setBillingMethod("all");
        setStatus("all");
        setStatusFilterLabel(null);
        setOverdueOnly(false);
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
      if (attorneyParam && attorneyParam.trim()) {
        setClientSearch("");
        setAttorney(attorneyParam.trim());
        setBillingMethod("all");
        setStatus("all");
        setStatusFilterLabel(null);
        setOverdueOnly(false);
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
    } catch {
      /* ignore */
    }

    window.addEventListener(INVOICES_UPDATED_EVENT, onCacheUpdated);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(INVOICES_UPDATED_EVENT, onCacheUpdated);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [invoices]);

  const data = periodScoped;
  const attorneys = useMemo(() => getInvoiceAttorneys(data), [data]);

  const filteredSorted = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const rows = data.filter((invoice) => {
      if (q) {
        const clientMatch = invoice.client.toLowerCase().includes(q);
        const matterMatch = (invoice.legalMatter || "")
          .toLowerCase()
          .includes(q);
        const matterIdMatch = (invoice.matterId || "")
          .toLowerCase()
          .includes(q);
        if (!clientMatch && !matterMatch && !matterIdMatch) return false;
      }
      if (attorney !== "all" && invoice.attorney !== attorney) return false;
      if (billingMethod !== "all" && invoice.billingMethod !== billingMethod) {
        return false;
      }
      if (overdueOnly) {
        if (!isInvoiceOverdue(invoice)) return false;
      } else {
        if (status === "none") return false;
        if (status !== "all" && invoice.status !== status) return false;
      }
      return true;
    });

    return [...rows].sort((a, b) => {
      const result = compareInvoices(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
  }, [
    data,
    clientSearch,
    attorney,
    billingMethod,
    status,
    overdueOnly,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, currentPage, pageSize]);

  const rangeStart =
    filteredSorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredSorted.length);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "invoiceNumber" ||
          key === "client" ||
          key === "legalMatter" ||
          key === "billingMethod" ||
          key === "status"
          ? "asc"
          : "desc",
      );
    }
    setPage(1);
  }

  function sortMarker(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function resetPageOnFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function clearStatusFilter() {
    setStatus("all");
    setStatusFilterLabel(null);
    setOverdueOnly(false);
    setPage(1);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("status");
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    } catch {
      /* ignore */
    }
  }

  const statusFilterActive = status !== "all" || overdueOnly;
  const statusFilterDisplay =
    overdueOnly
      ? "Overdue"
      : statusFilterLabel ??
        (status === "none"
          ? "Selected status"
          : status === "Cancelled"
            ? "Canceled"
            : status);

  const title =
    attorney !== "all"
      ? `Invoices — ${attorney}`
      : clientSearch.trim()
        ? `Invoices — ${clientSearch.trim()}`
        : statusFilterActive
          ? `Invoices — ${statusFilterDisplay}`
          : "Invoice Management";

  const description =
    attorney !== "all"
      ? "Showing invoices for this attorney. Clear the attorney filter to see all invoices."
      : clientSearch.trim()
        ? "Showing invoices for this client. Clear the search box to see all invoices."
        : statusFilterActive
          ? `Showing ${statusFilterDisplay} invoices. Clear the status filter to see all invoices.`
          : "Search, filter, sort, and page through firm invoices. Open any row for full billing detail.";

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}>
        <div className="flex flex-wrap gap-2">
          <Link
            href={BILLING_ROUTES.generateInvoice}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800"
          >
            Create Invoice
          </Link>
          <p className="self-center text-xs text-muted" role="status">
            {generatedCount > 0
              ? `${generatedCount} generated invoice${generatedCount === 1 ? "" : "s"}`
              : "No generated invoices yet"}
          </p>
        </div>
      </PageHeader>

      <BillingPeriodToolbar
        variant="panel"
        period={period}
        periodLabel={periodLabel}
        invoiceCountInPeriod={periodScoped.length}
        invoiceCountAll={catalog.length}
        outsidePeriodCount={outsidePeriodCount}
        onApplyPreset={applyPreset}
        onApplyCustomRange={applyCustomRange}
        footnote="List is limited to invoices issued in the selected period (invoice date)."
      />

      {periodScoped.length === 0 && catalog.length > 0 ? (
        <EmptyState
          title="No invoices found for the selected billing period."
          description="Choose All Time or another range to browse the full catalog."
        />
      ) : null}

      {statusFilterActive ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-900/15 bg-navy-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-medium text-navy-900">
            Showing {statusFilterDisplay} Invoices
            <span className="ml-2 font-normal text-muted">
              ({filteredSorted.length} match
              {filteredSorted.length === 1 ? "" : "es"})
            </span>
          </p>
          <Button size="sm" variant="secondary" onClick={clearStatusFilter}>
            Clear Filter
          </Button>
        </div>
      ) : null}

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Search by client or matter"
            type="search"
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Client or matter name"
          />
          <Select
            label="Filter by attorney"
            value={attorney}
            onChange={(e) => resetPageOnFilter(setAttorney)(e.target.value)}
            options={[
              { value: "all", label: "All attorneys" },
              ...attorneys.map((name) => ({ value: name, label: name })),
            ]}
          />
          <Select
            label="Billing method"
            value={billingMethod}
            onChange={(e) =>
              resetPageOnFilter(setBillingMethod)(
                e.target.value as "all" | BillingMethod,
              )
            }
            options={[
              { value: "all", label: "All methods" },
              ...BILLING_METHODS.map((method) => ({
                value: method,
                label: method,
              })),
            ]}
          />
          <Select
            label="Invoice status"
            value={status === "none" ? "all" : status}
            onChange={(e) => {
              const next = e.target.value as "all" | InvoiceStatus;
              setOverdueOnly(false);
              resetPageOnFilter(setStatus)(next);
              setStatusFilterLabel(next === "all" ? null : next);
              if (next === "all") {
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("status");
                  url.searchParams.delete("view");
                  window.history.replaceState(
                    {},
                    "",
                    url.pathname + (url.search || ""),
                  );
                } catch {
                  /* ignore */
                }
              }
            }}
            options={[
              { value: "all", label: "All statuses" },
              ...INVOICE_STATUSES.map((value) => ({
                value,
                label: value === "Cancelled" ? "Canceled" : value,
              })),
            ]}
          />
          <Select
            label="Rows per page"
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(
                Number(e.target.value) as (typeof PAGE_SIZES)[number],
              );
              setPage(1);
            }}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
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
          Showing {rangeStart}–{rangeEnd} of {filteredSorted.length} invoice
          {filteredSorted.length === 1 ? "" : "s"}
          {filteredSorted.length !== data.length
            ? ` (filtered from ${data.length})`
            : ""}
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              {(
                [
                  ["invoiceNumber", "Invoice #"],
                  ["client", "Client"],
                  ["legalMatter", "Legal Matter"],
                  ["billingMethod", "Method"],
                  ["invoiceDate", "Invoice Date"],
                  ["dueDate", "Due Date"],
                  ["totalAmount", "Total"],
                  ["amountPaid", "Paid"],
                  ["remainingBalance", "Balance"],
                  ["status", "Status"],
                ] as const
              ).map(([key, label]) => (
                <TableHead key={key}>
                  <button
                    type="button"
                    className="font-semibold uppercase tracking-wide text-muted hover:text-navy-900"
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    {sortMarker(key)}
                  </button>
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted">
                  No invoices match your filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className={cn(
                    highlightNumber === invoice.invoiceNumber &&
                      "bg-gold-100/60",
                  )}
                >
                  <TableCell className="font-semibold">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{invoice.client}</TableCell>
                  <TableCell>{invoice.legalMatter}</TableCell>
                  <TableCell>{invoice.billingMethod}</TableCell>
                  <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>{formatCurrency(invoice.amountPaid)}</TableCell>
                  <TableCell
                    className={
                      invoice.remainingBalance > 0
                        ? "font-medium text-amber-800"
                        : "text-muted"
                    }
                  >
                    {formatCurrency(invoice.remainingBalance)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[9rem] flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelected(invoice)}
                      >
                        View Invoice
                      </Button>
                      {invoice.remainingBalance > 0 ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setPaymentInvoice(invoice)}
                        >
                          Record Payment
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteInvoice(invoice)}
                      >
                        Delete Invoice
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <p className="text-sm text-muted">
            Page {currentPage} of {totalPages}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </Card>

      {selected ? (
        <InvoiceDetailsModal
          invoice={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
      {paymentInvoice ? (
        <RecordPaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSave={handleRecordPayment}
        />
      ) : null}
      {deleteInvoice ? (
        <DeleteInvoiceModal
          invoice={deleteInvoice}
          onClose={() => setDeleteInvoice(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      ) : null}
    </div>
  );
}

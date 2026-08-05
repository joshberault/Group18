"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InvoiceDetailsModal } from "@/components/billing/InvoiceDetailsModal";
import { PaymentReminderModal } from "@/components/billing/PaymentReminderModal";
import { RecordPaymentModal } from "@/components/billing/RecordPaymentModal";
import { getInvoiceAttorneys, INVOICE_STATUSES } from "@/lib/billing/invoice-seed";
import {
  getAllManagedInvoices,
  INVOICES_UPDATED_EVENT,
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

function statusClass(status: InvoiceStatus): string {
  switch (status) {
    case "Partially Paid":
      return "inv-status--partial";
    case "Overdue":
    case "Disputed":
      return "inv-status--alert";
    case "Sent":
      return "inv-status--sent";
    default:
      return "inv-status--draft";
  }
}

function agingClass(bucket: AgingBucket): string {
  if (bucket === "Current") return "ar-age--current";
  if (bucket === "1–30") return "ar-age--30";
  if (bucket === "31–60") return "ar-age--60";
  if (bucket === "61–90") return "ar-age--90";
  return "ar-age--90plus";
}

function compareRows(
  a: OutstandingReceivableRow,
  b: OutstandingReceivableRow,
  key: SortKey,
): number {
  if (key === "lastReminderSent") {
    const left = a.lastReminderSent || "";
    const right = b.lastReminderSent || "";
    return left.localeCompare(right);
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
  const [catalog, setCatalog] = useState<Invoice[]>([]);

  useEffect(() => {
    const refresh = () => setCatalog(getAllManagedInvoices());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(INVOICES_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(INVOICES_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const rows = useMemo(
    () =>
      catalog.length > 0
        ? getOutstandingReceivables(catalog)
        : getOutstandingReceivables(),
    [catalog],
  );
  const summary = useMemo(() => getReceivablesSummary(rows), [rows]);
  const attorneys = useMemo(() => getInvoiceAttorneys(rows), [rows]);

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
      const view = params.get("view");
      if (view === "overdue") {
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

  function handleSendReminder(invoice: Invoice) {
    const nextCount = (invoice.reminderCount ?? 0) + 1;
    const updated = updateManagedInvoice(invoice.invoiceNumber, {
      lastReminderSent: todayIso(),
      reminderCount: nextCount,
      reminderStatus: "Reminder Sent",
    });
    setCatalog(getAllManagedInvoices());
    setActionNote(
      updated
        ? `Payment reminder sent for ${invoice.invoiceNumber}. Reminder count is now ${nextCount}.`
        : `Could not update reminder fields for ${invoice.invoiceNumber}.`,
    );
  }

  function handleRecordPayment(invoice: Invoice, amount: number) {
    const recordedAt = new Date();
    const paymentId = `pay-rem-${recordedAt.getTime()}`;
    const paid = invoice.amountPaid + amount;
    const remaining = Math.max(0, Math.round((invoice.remainingBalance - amount) * 100) / 100);
    const newStatus =
      remaining <= 0
        ? "Paid"
        : paid > 0
          ? "Partially Paid"
          : invoice.status;
    const updated = updateManagedInvoice(invoice.invoiceNumber, {
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
    setCatalog(getAllManagedInvoices());
    setActionNote(
      updated
        ? `Payment of ${formatCurrency(amount)} recorded for ${invoice.invoiceNumber}.`
        : `Could not record payment for ${invoice.invoiceNumber}.`,
    );
  }

  return (
    <section className="inv-mgmt ar-mgmt" aria-labelledby="ar-heading">
      <style>{styles}</style>

      <header className="inv-mgmt__header">
        <div>
          <p className="page-back">
            <Link href={BILLING_ROUTES.dashboard}>← Billing Dashboard</Link>
            {" · "}
            <Link href={BILLING_ROUTES.invoices}>Invoice Management</Link>
            {" · "}
            <Link href={BILLING_ROUTES.generateInvoice}>Generate Invoice</Link>
          </p>
          <h2 id="ar-heading">
            {overdueOnly
              ? "Overdue Invoices"
              : "Outstanding Accounts Receivable"}
          </h2>
          <p>
            {overdueOnly
              ? "Past-due open invoices with remaining balance. Clear the overdue filter to see all receivables."
              : "Unpaid and partially paid invoices with aging and balance detail."}
          </p>
        </div>
        <p className="inv-mgmt__source" role="status">
          {overdueOnly
            ? `${summary.overdueCount} overdue of ${rows.length} open`
            : "Open receivables from Invoice Management"}
        </p>
      </header>

      {overdueOnly ? (
        <div className="ar-overdue-banner" role="status">
          <span>
            Showing overdue invoices only (days past due &gt; 0 or status
            Overdue).
          </span>
          <button
            type="button"
            className="ar-overdue-banner__clear"
            onClick={() => {
              setOverdueOnly(false);
              if (typeof window !== "undefined") {
                window.history.replaceState({}, "", BILLING_ROUTES.receivables);
              }
            }}
          >
            Show all receivables
          </button>
        </div>
      ) : null}

      <div className="ar-summary" aria-label="Receivables summary">
        <div className="ar-summary__card">
          <span className="ar-summary__label">
            Total Outstanding Accounts Receivable
          </span>
          <strong className="ar-summary__value">
            {formatCurrency(summary.totalOutstanding)}
          </strong>
        </div>
        <div className="ar-summary__card ar-summary__card--warn">
          <span className="ar-summary__label">Total Overdue Invoices</span>
          <strong className="ar-summary__value">
            {summary.overdueCount}
          </strong>
        </div>
        <div className="ar-summary__card">
          <span className="ar-summary__label">Total Unpaid Invoices</span>
          <strong className="ar-summary__value">{summary.unpaidCount}</strong>
        </div>
        <div className="ar-summary__card">
          <span className="ar-summary__label">
            Total Partially Paid Invoices
          </span>
          <strong className="ar-summary__value">
            {summary.partiallyPaidCount}
          </strong>
        </div>
      </div>

      <div className="inv-mgmt__filters ar-filters">
        <label className="inv-field">
          <span>Search by client</span>
          <input
            type="search"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="e.g. Northline"
          />
        </label>

        <label className="inv-field">
          <span>Filter by attorney</span>
          <select
            value={attorney}
            onChange={(e) => setAttorney(e.target.value)}
          >
            <option value="all">All attorneys</option>
            {attorneys.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="inv-field">
          <span>Filter by invoice status</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | InvoiceStatus)
            }
          >
            <option value="all">All open statuses</option>
            {OPEN_STATUS_FILTERS.filter((s) =>
              INVOICE_STATUSES.includes(s),
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="inv-field">
          <span>Filter by aging bucket</span>
          <select
            value={aging}
            onChange={(e) =>
              setAging(e.target.value as "all" | AgingBucket)
            }
          >
            <option value="all">All aging buckets</option>
            {AGING_BUCKETS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {bucket}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionNote ? (
        <div className="ar-action-note" role="status">
          {actionNote}
          <button
            type="button"
            className="ar-action-note__dismiss"
            onClick={() => setActionNote(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <p className="inv-mgmt__count" aria-live="polite">
        Showing {filteredSorted.length} of{" "}
        {overdueOnly ? summary.overdueCount : rows.length}{" "}
        {overdueOnly ? "overdue invoice" : "open receivable"}
        {(overdueOnly ? summary.overdueCount : rows.length) === 1 ? "" : "s"}
      </p>

      <div className="inv-mgmt__scroll">
        <table className="inv-mgmt__table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("invoiceNumber")}
                >
                  Invoice Number{sortMarker("invoiceNumber")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("client")}
                >
                  Client{sortMarker("client")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("legalMatter")}
                >
                  Legal Matter{sortMarker("legalMatter")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("attorney")}
                >
                  Responsible Attorney{sortMarker("attorney")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("invoiceDate")}
                >
                  Invoice Date{sortMarker("invoiceDate")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("dueDate")}
                >
                  Due Date{sortMarker("dueDate")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("amountDue")}
                >
                  Original Invoice Amount{sortMarker("amountDue")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("amountPaid")}
                >
                  Amount Paid{sortMarker("amountPaid")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("remainingBalance")}
                >
                  Remaining Balance{sortMarker("remainingBalance")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("daysOverdue")}
                >
                  Days Overdue{sortMarker("daysOverdue")}
                </button>
              </th>
              {overdueOnly ? (
                <>
                  <th>
                    <button
                      type="button"
                      className="inv-sort"
                      onClick={() => handleSort("lastReminderSent")}
                    >
                      Last Reminder Sent{sortMarker("lastReminderSent")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="inv-sort"
                      onClick={() => handleSort("reminderCount")}
                    >
                      Reminder Count{sortMarker("reminderCount")}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="inv-sort"
                      onClick={() => handleSort("reminderStatus")}
                    >
                      Reminder Status{sortMarker("reminderStatus")}
                    </button>
                  </th>
                </>
              ) : null}
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("agingBucket")}
                >
                  Aging Bucket{sortMarker("agingBucket")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="inv-sort"
                  onClick={() => handleSort("status")}
                >
                  Invoice Status{sortMarker("status")}
                </button>
              </th>
              {overdueOnly ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={overdueOnly ? 16 : 12}
                  className="inv-mgmt__empty"
                >
                  No outstanding receivables match your filters.
                </td>
              </tr>
            ) : (
              filteredSorted.map((row) => (
                <tr
                  key={row.id}
                  className={row.isOverdue ? "ar-row--overdue" : undefined}
                >
                  <td className="inv-mgmt__strong">{row.invoiceNumber}</td>
                  <td>{row.client}</td>
                  <td>{row.legalMatter}</td>
                  <td>{row.attorney}</td>
                  <td>{formatDate(row.invoiceDate)}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td className="inv-num">{formatCurrency(row.amountDue)}</td>
                  <td className="inv-num">{formatCurrency(row.amountPaid)}</td>
                  <td className="inv-num inv-num--due">
                    {formatCurrency(row.remainingBalance)}
                  </td>
                  <td className="inv-num">
                    {row.daysOverdue > 60 ? (
                      <span className="ar-days-badge" title="More than 60 days overdue">
                        ⚠ {row.daysOverdue}
                      </span>
                    ) : row.daysOverdue > 0 ? (
                      <span className="ar-days-overdue">{row.daysOverdue}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  {overdueOnly ? (
                    <>
                      <td>
                        {row.lastReminderSent
                          ? formatDate(row.lastReminderSent)
                          : "—"}
                      </td>
                      <td className="inv-num">{row.reminderCount ?? 0}</td>
                      <td>
                        <span
                          className={
                            row.reminderStatus === "Reminder Sent"
                              ? "ar-reminder-status ar-reminder-status--sent"
                              : "ar-reminder-status"
                          }
                        >
                          {row.reminderStatus ?? "None"}
                        </span>
                      </td>
                    </>
                  ) : null}
                  <td>
                    <span className={`ar-age ${agingClass(row.agingBucket)}`}>
                      {row.agingBucket}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inv-status ${
                        row.isOverdue
                          ? "inv-status--alert"
                          : statusClass(row.status)
                      }`}
                    >
                      {row.isOverdue && row.status !== "Overdue"
                        ? `⚠ ${row.status}`
                        : row.status === "Overdue"
                          ? `⚠ ${row.status}`
                          : row.status}
                    </span>
                  </td>
                  {overdueOnly ? (
                    <td>
                      <div className="ar-row-actions">
                        <button
                          type="button"
                          className="ar-action-btn"
                          onClick={() => setViewInvoice(row)}
                        >
                          View Invoice
                        </button>
                        <button
                          type="button"
                          className="ar-action-btn"
                          onClick={() => setReminderInvoice(row)}
                        >
                          Send Reminder
                        </button>
                        <button
                          type="button"
                          className="ar-action-btn ar-action-btn--primary"
                          onClick={() => setPaymentInvoice(row)}
                        >
                          Record Payment
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </section>
  );
}

const styles = `
  .inv-mgmt {
    --ink: #1e3a5f;
    --muted: #6b7280;
    --line: #d6dce5;
    --surface: #ffffff;
    --surface-muted: #f5f7fa;
    --accent: #1e3a5f;
    --accent-soft: #e8eef5;
    --positive: #2f6f4f;
    --warn: #b8860b;
    --error: #a94442;
    --error-soft: #f5eaea;
    margin-top: 0.25rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 1.2rem 1.15rem 1.35rem;
    box-shadow: 0 1px 0 rgba(20, 32, 51, 0.05);
    color: var(--ink);
    font-family: Figtree, "Segoe UI", sans-serif;
  }

  .inv-mgmt__header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .inv-mgmt__header h2 {
    margin: 0;
    font-family: Fraunces, Georgia, serif;
    font-size: 1.4rem;
    font-weight: 500;
  }

  .inv-mgmt__header p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .inv-mgmt__source {
    margin: 0 !important;
    align-self: flex-start;
    font-size: 0.82rem !important;
    color: var(--muted) !important;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0.4rem 0.75rem;
    background: #f5f7fa;
  }

  .ar-summary {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;
    margin-bottom: 1rem;
  }

  @media (min-width: 720px) {
    .ar-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1100px) {
    .ar-summary {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .ar-summary__card {
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #fff;
    padding: 0.85rem 0.95rem;
    display: grid;
    gap: 0.35rem;
  }

  .ar-summary__card--warn {
    border-color: color-mix(in srgb, var(--error) 35%, var(--line));
    background: var(--surface);
  }

  .ar-summary__label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
    line-height: 1.3;
  }

  .ar-summary__value {
    font-family: Fraunces, Georgia, serif;
    font-size: 1.35rem;
    font-weight: 500;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }

  .ar-summary__card--warn .ar-summary__value {
    color: var(--error);
  }

  .ar-overdue-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    margin: 0 0 1rem;
    padding: 0.7rem 0.9rem;
    border: 1px solid color-mix(in srgb, var(--error) 35%, var(--line));
    border-radius: 10px;
    background: var(--error-soft);
    color: var(--error);
    font-size: 0.88rem;
    font-weight: 600;
  }

  .ar-overdue-banner__clear {
    appearance: none;
    border: 1px solid var(--accent);
    background: var(--surface);
    color: var(--accent);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .ar-overdue-banner__clear:hover {
    background: var(--accent-soft);
  }

  .ar-filters {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;
    margin-bottom: 0.75rem;
  }

  @media (min-width: 720px) {
    .ar-filters {
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
    }
  }

  .inv-field {
    display: grid;
    gap: 0.3rem;
  }

  .inv-field span {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .inv-field input,
  .inv-field select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font: inherit;
    font-size: 0.92rem;
    background: #fff;
    color: var(--ink);
  }

  .inv-mgmt__count {
    margin: 0 0 0.7rem;
    font-size: 0.86rem;
    color: var(--muted);
  }

  .inv-mgmt__scroll {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .inv-mgmt__table {
    width: 100%;
    min-width: 1600px;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  .inv-mgmt__table th {
    text-align: left;
    padding: 0.7rem 0.65rem;
    border-bottom: 1px solid var(--line);
    background: #f5f7fa;
    white-space: nowrap;
  }

  .inv-mgmt__table td {
    padding: 0.7rem 0.65rem;
    border-bottom: 1px solid #d6dce5;
    vertical-align: middle;
  }

  .ar-row--overdue {
    background: var(--error-soft);
  }

  .ar-days-overdue {
    color: var(--error);
    font-weight: 700;
  }

  .ar-days-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    background: #f5eaea;
    color: #a94442;
    border: 1px solid #e0c4c3;
    white-space: nowrap;
  }

  .ar-reminder-status {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    border: 1px solid var(--line);
    background: #f5f7fa;
    color: var(--muted);
    white-space: nowrap;
  }

  .ar-reminder-status--sent {
    background: #e6f0ea;
    color: #2f6f4f;
    border-color: #b9d0c3;
  }

  .ar-row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    min-width: 14rem;
  }

  .ar-action-btn {
    appearance: none;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  }

  .ar-action-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .ar-action-btn--primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .ar-action-btn--primary:hover {
    background: #162c4a;
    color: #fff;
  }

  .ar-action-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    margin: 0 0 0.85rem;
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--positive) 30%, var(--line));
    background: #e6f0ea;
    color: #2f6f4f;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .ar-action-note__dismiss {
    appearance: none;
    border: 1px solid var(--line);
    background: #fff;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 0.3rem 0.55rem;
    border-radius: 6px;
    cursor: pointer;
  }

  .inv-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(30, 58, 95, 0.4);
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .inv-modal {
    width: min(720px, 100%);
    max-height: min(90vh, 900px);
    overflow: auto;
    background: #fff;
    border-radius: 12px;
    border: 1px solid var(--line);
    box-shadow: 0 16px 40px rgba(30, 58, 95, 0.18);
  }

  .inv-modal--reminder {
    width: min(640px, 100%);
  }

  .inv-modal--payment {
    width: min(480px, 100%);
  }

  .inv-modal__header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    padding: 1rem 1.15rem;
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    background: #fff;
  }

  .inv-modal__kicker {
    margin: 0 0 0.2rem;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .inv-modal__header h2 {
    margin: 0;
    font-family: Fraunces, Georgia, serif;
    font-size: 1.35rem;
    font-weight: 500;
  }

  .inv-modal__close {
    appearance: none;
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 8px;
    padding: 0.4rem 0.7rem;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .inv-modal__body {
    padding: 0.85rem 1.15rem 1.25rem;
    display: grid;
    gap: 1rem;
  }

  .inv-modal__section h3 {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .inv-dl {
    margin: 0;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: 1fr 1fr;
  }

  .inv-dl dt {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .inv-dl dd {
    margin: 0.15rem 0 0;
    font-size: 0.92rem;
  }

  .inv-dl--wide {
    grid-column: 1 / -1;
  }

  .ar-reminder-meta {
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .ar-reminder-meta dt {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .ar-reminder-meta dd {
    margin: 0.2rem 0 0;
    font-weight: 600;
  }

  .ar-reminder-preview h3 {
    margin: 0 0 0.45rem;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .ar-reminder-preview__body {
    margin: 0;
    padding: 0.85rem 1rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #f5f7fa;
    font-family: Figtree, "Segoe UI", sans-serif;
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
    color: var(--ink);
  }

  .ar-reminder-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    justify-content: flex-end;
  }

  .ar-reminder-success {
    padding: 0.85rem 1rem;
    border-radius: 10px;
    border: 1px solid #b9d0c3;
    background: #e6f0ea;
    color: #2f6f4f;
    font-size: 0.92rem;
    font-weight: 600;
  }

  .ar-payment-lede {
    margin: 0;
    font-size: 0.92rem;
    color: var(--muted);
  }

  .ar-payment-error {
    margin: 0;
    color: var(--error);
    font-size: 0.88rem;
    font-weight: 600;
  }

  .gi-btn {
    appearance: none;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    padding: 0.55rem 0.9rem;
    border-radius: 10px;
    cursor: pointer;
  }

  .dashboard__create-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 0.95rem;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 700;
    color: #fff;
    text-decoration: none;
    background: var(--accent);
    border: 1px solid #162c4a;
    border-radius: 10px;
    cursor: pointer;
  }

  .inv-sort {
    appearance: none;
    border: 0;
    background: transparent;
    padding: 0;
    margin: 0;
    font: inherit;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    text-align: left;
  }

  .inv-mgmt__strong {
    font-weight: 600;
    white-space: nowrap;
  }

  .inv-mgmt__empty {
    text-align: center;
    color: var(--muted);
    padding: 1.5rem 0.5rem !important;
  }

  .inv-num {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .inv-num--due {
    color: var(--error);
    font-weight: 600;
  }

  .inv-status {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    border: 1px solid var(--line);
    white-space: nowrap;
  }

  .inv-status--partial {
    background: #f7f0dd;
    color: #b8860b;
    border-color: #e6d7a8;
  }

  .inv-status--alert {
    background: #f5eaea;
    color: #a94442;
    border-color: #e0c4c3;
  }

  .inv-status--sent {
    background: #e8eef5;
    color: #1e3a5f;
    border-color: #d6dce5;
  }

  .inv-status--draft {
    background: #f5f7fa;
    color: var(--muted);
  }

  .ar-age {
    display: inline-block;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    border: 1px solid var(--line);
    white-space: nowrap;
  }

  .ar-age--current {
    background: #e8eef5;
    color: #1e3a5f;
    border-color: #d6dce5;
  }

  .ar-age--30 {
    background: #e8eef5;
    color: #4b5d73;
    border-color: #d6dce5;
  }

  .ar-age--60 {
    background: #f7f0dd;
    color: #b8860b;
    border-color: #e6d7a8;
  }

  .ar-age--90 {
    background: #f7f0dd;
    color: #9a7009;
    border-color: #e6d7a8;
  }

  .ar-age--90plus {
    background: #f5eaea;
    color: #a94442;
    border-color: #e0c4c3;
  }
`;

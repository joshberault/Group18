"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InvoiceDetailsModal } from "@/components/billing/InvoiceDetailsModal";
import {
  BILLING_METHODS,
  getInvoiceAttorneys,
  INVOICE_SEED,
  INVOICE_STATUSES,
} from "@/lib/billing/invoice-seed";
import {
  countGeneratedInvoices,
  getAllManagedInvoices,
  INVOICES_UPDATED_EVENT,
} from "@/lib/billing/invoice-management-store";
import type {
  BillingMethod,
  Invoice,
  InvoiceStatus,
} from "@/lib/billing/invoice-types";
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

function statusClass(status: InvoiceStatus): string {
  switch (status) {
    case "Paid":
      return "inv-status--paid";
    case "Partially Paid":
      return "inv-status--partial";
    case "Overdue":
    case "Disputed":
      return "inv-status--alert";
    case "Cancelled":
      return "inv-status--muted";
    case "Draft":
      return "inv-status--draft";
    default:
      return "inv-status--sent";
  }
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
    () => invoices ?? INVOICE_SEED,
  );
  const [generatedCount, setGeneratedCount] = useState(0);
  const [highlightNumber, setHighlightNumber] = useState<string | null>(null);

  useEffect(() => {
    if (invoices && invoices.length > 0) {
      setCatalog(invoices);
      return;
    }

    const refresh = () => {
      const all = getAllManagedInvoices();
      setCatalog(all);
      setGeneratedCount(countGeneratedInvoices());
    };

    refresh();

    // Support deep links: ?highlight=, ?view=completed, ?client=, ?attorney=
    try {
      const params = new URLSearchParams(window.location.search);
      const hl = params.get("highlight");
      const view = params.get("view");
      const clientParam = params.get("client");
      const attorneyParam = params.get("attorney");
      if (hl) {
        setHighlightNumber(hl);
        setClientSearch("");
        setAttorney("all");
        setBillingMethod("all");
        setStatus("all");
        setSortKey("invoiceNumber");
        setSortDir("desc");
        setPage(1);
      }
      if (view === "completed" || view === "paid") {
        setClientSearch("");
        setAttorney("all");
        setBillingMethod("all");
        setStatus("Paid");
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
      if (clientParam && clientParam.trim()) {
        setClientSearch(clientParam.trim());
        setAttorney("all");
        setBillingMethod("all");
        setStatus("all");
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
      if (attorneyParam && attorneyParam.trim()) {
        setClientSearch("");
        setAttorney(attorneyParam.trim());
        setBillingMethod("all");
        setStatus("all");
        setSortKey("invoiceDate");
        setSortDir("desc");
        setPage(1);
      }
    } catch {
      /* ignore */
    }

    window.addEventListener("storage", refresh);
    window.addEventListener(INVOICES_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(INVOICES_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [invoices]);

  const data = catalog;
  const attorneys = useMemo(() => getInvoiceAttorneys(data), [data]);

  const [clientSearch, setClientSearch] = useState("");
  const [attorney, setAttorney] = useState("all");
  const [billingMethod, setBillingMethod] = useState<"all" | BillingMethod>(
    "all",
  );
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("invoiceDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);

  const filteredSorted = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const rows = data.filter((invoice) => {
      if (q && !invoice.client.toLowerCase().includes(q)) return false;
      if (attorney !== "all" && invoice.attorney !== attorney) return false;
      if (billingMethod !== "all" && invoice.billingMethod !== billingMethod) {
        return false;
      }
      if (status !== "all" && invoice.status !== status) return false;
      return true;
    });

    return [...rows].sort((a, b) => {
      const result = compareInvoices(a, b, sortKey);
      return sortDir === "asc" ? result : -result;
    });
  }, [data, clientSearch, attorney, billingMethod, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSorted.slice(start, start + pageSize);
  }, [filteredSorted, currentPage, pageSize]);

  const rangeStart =
    filteredSorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    currentPage * pageSize,
    filteredSorted.length,
  );

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

  return (
    <section
      id="invoice-management"
      className="inv-mgmt"
      aria-labelledby="inv-mgmt-heading"
    >
      <style>{invoiceManagementStyles}</style>

      <header className="inv-mgmt__header">
        <div>
          <p className="page-back">
            <Link href={BILLING_ROUTES.dashboard}>← Billing Dashboard</Link>
            {" · "}
            <Link href={BILLING_ROUTES.generateInvoice}>Generate Invoice</Link>
            {" · "}
            <Link href={BILLING_ROUTES.receivables}>Accounts Receivable</Link>
          </p>
          <h2 id="inv-mgmt-heading">
            {attorney !== "all"
              ? `Invoices — ${attorney}`
              : clientSearch.trim()
                ? `Invoices — ${clientSearch.trim()}`
                : status === "Paid"
                  ? "Completed Invoices"
                  : "Invoice Management"}
          </h2>
          <p>
            {attorney !== "all"
              ? "Showing invoices for this attorney. Clear the attorney filter to see all invoices."
              : clientSearch.trim()
                ? "Showing invoices for this client. Clear the search box to see all invoices."
                : status === "Paid"
                  ? "Fully paid invoices (collections). Clear the status filter to see all invoices."
                  : "Search, filter, sort, and page through firm invoices. Open any row for full billing detail."}
          </p>
        </div>
        <p className="inv-mgmt__source" role="status">
          {generatedCount > 0
            ? `${generatedCount} created + seed data`
            : "Seed data (demo) — create invoices from Generate Invoice"}
        </p>
      </header>

      <div className="inv-mgmt__filters">
        <label className="inv-field">
          <span>Search by client</span>
          <input
            type="search"
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. Northline"
          />
        </label>

        <label className="inv-field">
          <span>Filter by attorney</span>
          <select
            value={attorney}
            onChange={(e) => resetPageOnFilter(setAttorney)(e.target.value)}
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
          <span>Filter by billing method</span>
          <select
            value={billingMethod}
            onChange={(e) =>
              resetPageOnFilter(setBillingMethod)(
                e.target.value as "all" | BillingMethod,
              )
            }
          >
            <option value="all">All methods</option>
            {BILLING_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className="inv-field">
          <span>Filter by invoice status</span>
          <select
            value={status}
            onChange={(e) =>
              resetPageOnFilter(setStatus)(
                e.target.value as "all" | InvoiceStatus,
              )
            }
          >
            <option value="all">All statuses</option>
            {INVOICE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="inv-field">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(
                Number(e.target.value) as (typeof PAGE_SIZES)[number],
              );
              setPage(1);
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="inv-mgmt__count" aria-live="polite">
        Showing {rangeStart}–{rangeEnd} of {filteredSorted.length} invoice
        {filteredSorted.length === 1 ? "" : "s"}
        {filteredSorted.length !== data.length
          ? ` (filtered from ${data.length})`
          : ""}
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
                  onClick={() => handleSort("billingMethod")}
                >
                  Billing Method{sortMarker("billingMethod")}
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
                  onClick={() => handleSort("totalAmount")}
                >
                  Total Amount{sortMarker("totalAmount")}
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
                  onClick={() => handleSort("status")}
                >
                  Status{sortMarker("status")}
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="inv-mgmt__empty">
                  No invoices match your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((invoice) => (
                <tr
                  key={invoice.id}
                  className={
                    highlightNumber === invoice.invoiceNumber
                      ? "inv-mgmt__row--highlight"
                      : undefined
                  }
                >
                  <td className="inv-mgmt__strong">{invoice.invoiceNumber}</td>
                  <td>{invoice.client}</td>
                  <td>{invoice.legalMatter}</td>
                  <td>{invoice.billingMethod}</td>
                  <td>{formatDate(invoice.invoiceDate)}</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                  <td className="inv-num">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="inv-num">
                    {formatCurrency(invoice.amountPaid)}
                  </td>
                  <td
                    className={
                      invoice.remainingBalance > 0
                        ? "inv-num inv-num--due"
                        : "inv-num inv-num--muted"
                    }
                  >
                    {formatCurrency(invoice.remainingBalance)}
                  </td>
                  <td>
                    <span
                      className={`inv-status ${statusClass(invoice.status)}`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="inv-view-btn"
                      onClick={() => setSelected(invoice)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="inv-pagination">
        <button
          type="button"
          className="inv-page-btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <p className="inv-pagination__label">
          Page {currentPage} of {totalPages}
        </p>
        <button
          type="button"
          className="inv-page-btn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>

      {selected ? (
        <InvoiceDetailsModal
          invoice={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

const invoiceManagementStyles = `
  .inv-mgmt {
    --ink: #1e3a5f;
    --muted: #6b7280;
    --line: #d6dce5;
    --surface: #ffffff;
    --surface-muted: #f5f7fa;
    --accent: #1e3a5f;
    --accent-soft: #e8eef5;
    --positive: #2f6f4f;
    --positive-soft: #e6f0ea;
    --warn: #b8860b;
    --warn-soft: #f7f0dd;
    --error: #a94442;
    --error-soft: #f5eaea;
    margin-top: 0.25rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 1.2rem 1.15rem 1.35rem;
    box-shadow: 0 1px 0 rgba(16, 32, 51, 0.04);
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

  .ar-kicker {
    margin: 0 0 0.4rem;
    font-size: 0.85rem;
  }

  .ar-kicker a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }

  .ar-kicker a:hover {
    text-decoration: underline;
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

  .inv-mgmt__filters {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr;
    margin-bottom: 0.75rem;
  }

  @media (min-width: 720px) {
    .inv-mgmt__filters {
      grid-template-columns: 1.2fr repeat(4, minmax(0, 1fr));
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

  .inv-field input:focus,
  .inv-field select:focus {
    outline: 2px solid color-mix(in srgb, var(--accent) 40%, white);
    border-color: var(--accent);
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
    min-width: 1100px;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  .inv-mgmt__table th {
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
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

  .inv-mgmt__table tr:last-child td {
    border-bottom: 0;
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

  .inv-sort:hover {
    color: var(--ink);
  }

  .inv-mgmt__strong {
    font-weight: 600;
    white-space: nowrap;
  }

  .inv-mgmt__row--highlight {
    background: color-mix(in srgb, var(--accent-soft, #e8eef5) 85%, white) !important;
    outline: 2px solid var(--accent, #1e3a5f);
    outline-offset: -2px;
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

  .inv-num--muted {
    color: var(--muted);
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

  .inv-status--paid {
    background: #e6f0ea;
    color: #2f6f4f;
    border-color: #b9d0c3;
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

  .inv-status--muted {
    background: #f5f7fa;
    color: #6b7280;
  }

  .inv-view-btn {
    appearance: none;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem 0.65rem;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
  }

  .inv-view-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .inv-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .inv-pagination__label {
    margin: 0;
    font-size: 0.9rem;
    color: var(--muted);
  }

  .inv-page-btn {
    appearance: none;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.5rem 0.9rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .inv-page-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .inv-page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .inv-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(16, 32, 51, 0.45);
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .inv-modal {
    width: min(820px, 100%);
    max-height: min(90vh, 900px);
    overflow: auto;
    background: #fff;
    border-radius: 12px;
    border: 1px solid var(--line);
    box-shadow: 0 16px 40px rgba(16, 32, 51, 0.18);
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
    gap: 1.1rem;
  }

  .inv-modal__section h3 {
    margin: 0 0 0.55rem;
    font-size: 0.95rem;
  }

  .inv-modal__subhead {
    margin: 0.85rem 0 0.45rem;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .inv-dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem 1rem;
    margin: 0;
  }

  .inv-dl--wide {
    grid-column: 1 / -1;
  }

  .inv-dl dt {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    font-weight: 600;
  }

  .inv-dl dd {
    margin: 0.15rem 0 0;
    font-size: 0.9rem;
  }

  .inv-mini-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  .inv-mini-table th,
  .inv-mini-table td {
    text-align: left;
    padding: 0.45rem 0.4rem;
    border-bottom: 1px solid #d6dce5;
  }

  .inv-mini-table th {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .inv-empty {
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;
  }
`;

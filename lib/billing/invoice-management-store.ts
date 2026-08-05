import { INVOICE_SEED } from "@/lib/billing/invoice-seed";
import type {
  BillingMethod,
  Invoice,
  InvoiceStatus,
  TimeEntry,
  ExpenseEntry,
  WriteDown,
} from "@/lib/billing/invoice-types";
import type {
  GenerateClient,
  GenerateMatter,
  InvoiceTotals,
  UnbilledExpense,
  UnbilledTimeEntry,
  WriteDownLine,
} from "@/lib/billing/generate-invoice-types";
import { normalizeBillingDate, toIsoDate } from "@/lib/billing/billing-period";

/** Browser storage key for invoices created in Generate Invoice workflow */
export const GENERATED_INVOICES_STORAGE_KEY = "nv-billing-generated-invoices-v1";

/** Invoice numbers permanently removed (seed or generated) after admin delete */
export const DELETED_INVOICES_STORAGE_KEY = "nv-billing-deleted-invoices-v1";

/** Same-tab notify so Invoice Management can refresh without a full reload */
export const INVOICES_UPDATED_EVENT = "nv-invoices-updated";

/**
 * When true, merge demo INVOICE_SEED into the live catalog.
 * Default false — live dashboards/AR use generated invoices only.
 * Set NEXT_PUBLIC_BILLING_DEMO_SEED=1 to re-enable seed for empty demos.
 */
export const USE_INVOICE_SEED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_BILLING_DEMO_SEED === "1";

/** Survives SPA navigations in the same browser tab even if storage is flaky */
const MEMORY_KEY = "__nvGeneratedInvoices";
const DELETED_MEMORY_KEY = "__nvDeletedInvoices";

type PersistResult = {
  ok: boolean;
  count: number;
  error?: string;
};

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

function readMemory(): Invoice[] {
  if (!canUseDom()) return [];
  try {
    const bag = (window as Window & { [MEMORY_KEY]?: Invoice[] })[MEMORY_KEY];
    return Array.isArray(bag) ? bag : [];
  } catch {
    return [];
  }
}

function writeMemory(invoices: Invoice[]) {
  if (!canUseDom()) return;
  try {
    (window as Window & { [MEMORY_KEY]?: Invoice[] })[MEMORY_KEY] = invoices;
  } catch {
    /* ignore */
  }
}

function isInvoiceShape(row: unknown): row is Invoice {
  if (!row || typeof row !== "object") return false;
  const inv = row as Partial<Invoice> & { totalAmount?: unknown };
  const total =
    typeof inv.totalAmount === "number"
      ? inv.totalAmount
      : Number(inv.totalAmount);
  return (
    typeof inv.id === "string" &&
    typeof inv.invoiceNumber === "string" &&
    typeof inv.client === "string" &&
    Number.isFinite(total)
  );
}

function sanitizeList(rows: unknown): Invoice[] {
  if (!Array.isArray(rows)) return [];
  const out: Invoice[] = [];
  for (const row of rows) {
    if (!isInvoiceShape(row)) continue;
    const raw = row as Invoice & { totalAmount: unknown };
    const total =
      typeof raw.totalAmount === "number"
        ? raw.totalAmount
        : Number(raw.totalAmount);
    out.push({
      ...raw,
      totalAmount: total,
      amountPaid: Number(raw.amountPaid) || 0,
      remainingBalance: Number.isFinite(Number(raw.remainingBalance))
        ? Number(raw.remainingBalance)
        : Math.max(0, total - (Number(raw.amountPaid) || 0)),
      invoiceDate: String(raw.invoiceDate ?? ""),
      dueDate: String(raw.dueDate ?? ""),
      status: raw.status,
    });
  }
  return out;
}

function notifyInvoicesUpdated() {
  if (!canUseDom()) return;
  try {
    bumpCatalogRevision();
    window.dispatchEvent(new Event(INVOICES_UPDATED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Monotonic catalog revision (memory + storage) so UIs can detect updates */
const CATALOG_REVISION_KEY = "nv-billing-catalog-rev-v1";
const REVISION_MEMORY_KEY = "__nvBillingCatalogRev";

function readStoredRevision(): number {
  if (!canUseDom()) return 0;
  try {
    const bag = (window as Window & { [REVISION_MEMORY_KEY]?: number })[
      REVISION_MEMORY_KEY
    ];
    if (typeof bag === "number" && Number.isFinite(bag)) return bag;
  } catch {
    /* ignore */
  }
  try {
    const raw =
      window.sessionStorage.getItem(CATALOG_REVISION_KEY) ??
      window.localStorage.getItem(CATALOG_REVISION_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function bumpCatalogRevision() {
  if (!canUseDom()) return;
  const next = readStoredRevision() + 1;
  try {
    (window as Window & { [REVISION_MEMORY_KEY]?: number })[
      REVISION_MEMORY_KEY
    ] = next;
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.setItem(CATALOG_REVISION_KEY, String(next));
    window.localStorage.setItem(CATALOG_REVISION_KEY, String(next));
  } catch {
    /* ignore */
  }
}

/** Revision stamped each time the invoice catalog is written. */
export function getInvoiceCatalogRevision(): number {
  return readStoredRevision();
}

/**
 * Subscribe to catalog changes (same-tab event, storage, focus, visibility, poll).
 * Used by dashboard via useSyncExternalStore.
 */
export function subscribeInvoiceCatalog(onStoreChange: () => void): () => void {
  if (!canUseDom()) return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(INVOICES_UPDATED_EVENT, handler);
  window.addEventListener("storage", handler);
  window.addEventListener("focus", handler);
  window.addEventListener("pageshow", handler);
  document.addEventListener("visibilitychange", handler);
  // Poll catches same-tab writes if the custom event listener was not mounted yet
  const pollId = window.setInterval(handler, 800);
  return () => {
    window.removeEventListener(INVOICES_UPDATED_EVENT, handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("focus", handler);
    window.removeEventListener("pageshow", handler);
    document.removeEventListener("visibilitychange", handler);
    window.clearInterval(pollId);
  };
}

type SnapshotCache = {
  fingerprint: string;
  invoices: Invoice[];
};

/** Prefer a window singleton so HMR / dual bundles share cache correctly */
function getSnapshotCacheHolder(): { current: SnapshotCache | null } {
  if (!canUseDom()) {
    return { current: null };
  }
  const w = window as Window & {
    __nvBillingSnapshot?: { current: SnapshotCache | null };
  };
  if (!w.__nvBillingSnapshot) {
    w.__nvBillingSnapshot = { current: null };
  }
  return w.__nvBillingSnapshot;
}

/** Fingerprint local sources so we never serve a stale seed-only snapshot. */
function catalogFingerprint(): string {
  if (!canUseDom()) return "ssr";
  let localLen = 0;
  let sessionLen = 0;
  let localRaw = "";
  try {
    localRaw = window.localStorage.getItem(GENERATED_INVOICES_STORAGE_KEY) ?? "";
    localLen = localRaw.length;
  } catch {
    /* ignore */
  }
  try {
    sessionLen = (
      window.sessionStorage.getItem(GENERATED_INVOICES_STORAGE_KEY) ?? ""
    ).length;
  } catch {
    /* ignore */
  }
  const mem = readMemory();
  return [
    getInvoiceCatalogRevision(),
    localLen,
    sessionLen,
    mem.length,
    // Hash invoice numbers from raw local string quickly
    (localRaw.match(/"invoiceNumber"\s*:\s*"[^"]+"/g) || []).join(","),
    mem.map((m) => m.invoiceNumber).join(","),
  ].join("|");
}

export function getManagedInvoicesSnapshot(): Invoice[] {
  const holder = getSnapshotCacheHolder();
  const fingerprint = catalogFingerprint();
  if (holder.current?.fingerprint === fingerprint) {
    return holder.current.invoices;
  }
  const invoices = getAllManagedInvoices();
  holder.current = { fingerprint, invoices };
  return invoices;
}

export function getServerInvoicesSnapshot(): Invoice[] {
  // SSR has no localStorage; seed would dual-feed demos into live metrics.
  return USE_INVOICE_SEED ? INVOICE_SEED : [];
}

/** Invalidate external-store cache after catalog mutations */
function invalidateSnapshotCache() {
  getSnapshotCacheHolder().current = null;
}

function readFromLocalStorage(): Invoice[] {
  if (!canUseDom()) return [];
  try {
    const raw = window.localStorage.getItem(GENERATED_INVOICES_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeToLocalStorage(invoices: Invoice[]): string | undefined {
  if (!canUseDom()) return "Browser storage unavailable";
  try {
    window.localStorage.setItem(
      GENERATED_INVOICES_STORAGE_KEY,
      JSON.stringify(invoices),
    );
    // Verify round-trip so we surface silent storage failures
    const check = readFromLocalStorage();
    if (!check.some((c) => invoices.some((i) => i.invoiceNumber === c.invoiceNumber))) {
      if (invoices.length > 0 && check.length === 0) {
        return "Could not verify stored invoices in localStorage";
      }
    }
    return undefined;
  } catch (err) {
    return err instanceof Error ? err.message : "localStorage write failed";
  }
}

function readFromSessionStorage(): Invoice[] {
  if (!canUseDom()) return [];
  try {
    const raw = window.sessionStorage.getItem(GENERATED_INVOICES_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeToSessionStorage(invoices: Invoice[]) {
  if (!canUseDom()) return;
  try {
    window.sessionStorage.setItem(
      GENERATED_INVOICES_STORAGE_KEY,
      JSON.stringify(invoices),
    );
  } catch {
    /* ignore */
  }
}

/**
 * Merge lists by invoiceNumber, preferring the first occurrence (newer first).
 */
function mergeByNumber(...lists: Invoice[][]): Invoice[] {
  const seen = new Set<string>();
  const out: Invoice[] = [];
  for (const list of lists) {
    for (const inv of list) {
      if (seen.has(inv.invoiceNumber)) continue;
      seen.add(inv.invoiceNumber);
      out.push(inv);
    }
  }
  return out;
}

export function loadGeneratedInvoices(): Invoice[] {
  return mergeByNumber(
    readMemory(),
    readFromLocalStorage(),
    readFromSessionStorage(),
  );
}

function readDeletedMemory(): string[] {
  if (!canUseDom()) return [];
  try {
    const bag = (window as Window & { [DELETED_MEMORY_KEY]?: string[] })[
      DELETED_MEMORY_KEY
    ];
    return Array.isArray(bag) ? bag.filter((n) => typeof n === "string") : [];
  } catch {
    return [];
  }
}

function writeDeletedMemory(numbers: string[]) {
  if (!canUseDom()) return;
  try {
    (window as Window & { [DELETED_MEMORY_KEY]?: string[] })[DELETED_MEMORY_KEY] =
      numbers;
  } catch {
    /* ignore */
  }
}

function readDeletedFromStorage(): string[] {
  if (!canUseDom()) return [];
  const keys = [window.localStorage, window.sessionStorage];
  const all: string[] = [];
  for (const store of keys) {
    try {
      const raw = store.getItem(DELETED_INVOICES_STORAGE_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const n of parsed) {
          if (typeof n === "string") all.push(n);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return all;
}

function writeDeletedToStorage(numbers: string[]) {
  if (!canUseDom()) return;
  try {
    const raw = JSON.stringify(numbers);
    window.localStorage.setItem(DELETED_INVOICES_STORAGE_KEY, raw);
    window.sessionStorage.setItem(DELETED_INVOICES_STORAGE_KEY, raw);
  } catch {
    /* ignore */
  }
}

/**
 * Invoice numbers soft-deleted via admin-approved delete.
 * Seed rows with these numbers are hidden; generated rows are removed.
 */
export function loadDeletedInvoiceNumbers(): string[] {
  return Array.from(
    new Set([...readDeletedMemory(), ...readDeletedFromStorage()]),
  );
}

function persistDeletedInvoiceNumber(invoiceNumber: string) {
  const next = Array.from(
    new Set([...loadDeletedInvoiceNumbers(), invoiceNumber]),
  );
  writeDeletedMemory(next);
  writeDeletedToStorage(next);
}

/**
 * Managed invoice catalog for Invoice Management and dashboards.
 *
 * Live mode: generated invoices + deleted tombstones only.
 * Demo seed only when USE_INVOICE_SEED / NEXT_PUBLIC_BILLING_DEMO_SEED=1.
 */
export function getAllManagedInvoices(): Invoice[] {
  const deleted = new Set(loadDeletedInvoiceNumbers());
  const generated = loadGeneratedInvoices()
    .filter((g) => !deleted.has(g.invoiceNumber))
    .sort((a, b) => {
      const byNumber = b.invoiceNumber.localeCompare(a.invoiceNumber, undefined, {
        numeric: true,
      });
      if (byNumber !== 0) return byNumber;
      return b.invoiceDate.localeCompare(a.invoiceDate);
    });

  if (!USE_INVOICE_SEED) {
    return generated;
  }

  const generatedNumbers = new Set(generated.map((g) => g.invoiceNumber));
  const seed = INVOICE_SEED.filter(
    (s) =>
      !generatedNumbers.has(s.invoiceNumber) && !deleted.has(s.invoiceNumber),
  );
  return [...generated, ...seed];
}

/**
 * Permanently remove an invoice from the managed catalog (admin gate enforced in UI).
 * Works for generated and seed invoices via a tombstone list.
 */
export function deleteManagedInvoice(invoiceNumber: string): PersistResult {
  const existed = getAllManagedInvoices().some(
    (row) => row.invoiceNumber === invoiceNumber,
  );
  if (!existed && !loadDeletedInvoiceNumbers().includes(invoiceNumber)) {
    // May already be deleted, or unknown number — still ensure tombstone
  }

  const without = loadGeneratedInvoices().filter(
    (row) => row.invoiceNumber !== invoiceNumber,
  );
  writeMemory(without);
  writeToSessionStorage(without);
  const error = writeToLocalStorage(without);
  writeMemory(without);

  persistDeletedInvoiceNumber(invoiceNumber);
  invalidateSnapshotCache();
  notifyInvoicesUpdated();

  const stillVisible = getAllManagedInvoices().some(
    (row) => row.invoiceNumber === invoiceNumber,
  );

  return {
    ok: !stillVisible,
    count: getAllManagedInvoices().length,
    error: stillVisible
      ? error || "Invoice could not be removed from catalog"
      : undefined,
  };
}

export function countGeneratedInvoices(): number {
  const deleted = new Set(loadDeletedInvoiceNumbers());
  return loadGeneratedInvoices().filter((g) => !deleted.has(g.invoiceNumber))
    .length;
}

/** Upsert by invoice number; writes memory + localStorage + sessionStorage */
export function upsertGeneratedInvoice(invoice: Invoice): PersistResult {
  // If this number was previously admin-deleted, revive it by clearing the tombstone
  const deleted = loadDeletedInvoiceNumbers().filter(
    (n) => n !== invoice.invoiceNumber,
  );
  if (deleted.length !== loadDeletedInvoiceNumbers().length) {
    writeDeletedMemory(deleted);
    writeDeletedToStorage(deleted);
  }

  const without = loadGeneratedInvoices().filter(
    (row) => row.invoiceNumber !== invoice.invoiceNumber,
  );
  const next = [invoice, ...without];
  writeMemory(next);
  writeToSessionStorage(next);
  const error = writeToLocalStorage(next);
  // Re-affirm memory from what we intended to store
  writeMemory(next);
  // Invalidate external-store snapshot cache (revision bump is inside notify)
  invalidateSnapshotCache();
  notifyInvoicesUpdated();
  const verified = loadGeneratedInvoices().some(
    (row) => row.invoiceNumber === invoice.invoiceNumber,
  );
  return {
    ok: verified,
    count: loadGeneratedInvoices().filter(
      (g) => !new Set(loadDeletedInvoiceNumbers()).has(g.invoiceNumber),
    ).length,
    error: verified ? undefined : error || "Invoice was not found after save",
  };
}

/**
 * Merge a patch into an existing managed invoice and persist the full
 * updated record (payments, status, etc.). Calls notify via upsert.
 */
export function updateManagedInvoice(
  invoiceNumber: string,
  patch: Partial<Invoice>,
): Invoice | null {
  const found = getAllManagedInvoices().find(
    (row) => row.invoiceNumber === invoiceNumber,
  );
  if (!found) return null;
  const updated: Invoice = { ...found, ...patch };
  upsertGeneratedInvoice(updated);
  return updated;
}

function extended(hours: number, rate: number): number {
  return Math.round(hours * rate * 100) / 100;
}

function mapTimeEntries(entries: UnbilledTimeEntry[]): TimeEntry[] {
  return entries.map((t) => ({
    id: t.id,
    date: t.date,
    attorney: t.person,
    description: t.description,
    hours: t.hours,
    rate: t.rate,
    amount: extended(t.hours, t.rate),
  }));
}

function mapExpenses(entries: UnbilledExpense[]): ExpenseEntry[] {
  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    description: `${e.category} — ${e.description}`,
    amount: e.amount,
  }));
}

function mapWriteDowns(
  lines: WriteDownLine[],
  applyWriteDowns: boolean,
  courtesyDiscount: number,
  invoiceDate: string,
): WriteDown[] {
  const downs: WriteDown[] = [];
  if (applyWriteDowns) {
    for (const w of lines.filter((line) => line.approved)) {
      downs.push({
        id: w.id,
        date: invoiceDate,
        reason: w.reason,
        amount: w.amount,
      });
    }
  }
  if (courtesyDiscount > 0) {
    downs.push({
      id: `wd-courtesy-${invoiceDate}`,
      date: invoiceDate,
      reason: "Approved courtesy discount",
      amount: courtesyDiscount,
    });
  }
  return downs;
}

export type BuildManagedInvoiceInput = {
  id?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  client: GenerateClient;
  matter: GenerateMatter;
  timeEntries: UnbilledTimeEntry[];
  expenses: UnbilledExpense[];
  applyWriteDowns: boolean;
  courtesyDiscount: number;
  totals: InvoiceTotals;
};

/** Map Generate Invoice wizard data into Invoice Management shape */
export function buildManagedInvoiceFromGeneration(
  input: BuildManagedInvoiceInput,
): Invoice {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    status,
    client,
    matter,
    timeEntries,
    expenses,
    applyWriteDowns,
    courtesyDiscount,
    totals,
  } = input;

  const amountPaid = 0;
  const totalAmount = Number.isFinite(totals.totalDue) ? totals.totalDue : 0;
  const remainingBalance =
    status === "Cancelled" ? 0 : Math.max(0, totalAmount - amountPaid);

  const normalizedInvoiceDate =
    normalizeBillingDate(invoiceDate) ?? toIsoDate(new Date());
  const normalizedDueDate =
    normalizeBillingDate(dueDate) ?? normalizedInvoiceDate;

  return {
    id: input.id ?? `gen-${invoiceNumber}-${Date.now()}`,
    invoiceNumber,
    client: client.name,
    legalMatter: matter.matterName,
    attorney: matter.responsibleAttorney,
    billingMethod: client.billingMethod as BillingMethod,
    invoiceDate: normalizedInvoiceDate,
    dueDate: normalizedDueDate,
    totalAmount,
    amountPaid,
    remainingBalance,
    status,
    clientInfo: {
      name: client.name,
      contact: client.billingContact,
      email: client.email,
      phone: client.phone,
      billingAddress: client.address,
    },
    matterDescription: `${matter.matterName} (${matter.matterNumber}) · billing period ${matter.billingPeriod}`,
    timeEntries: mapTimeEntries(timeEntries),
    reimbursableExpenses: mapExpenses(expenses),
    writeDowns: mapWriteDowns(
      matter.writeDowns,
      applyWriteDowns,
      courtesyDiscount,
      invoiceDate,
    ),
    retainerApplied: totals.retainerApplied,
    paymentHistory: [],
  };
}

/**
 * Next sequential invoice number from the managed catalog.
 * Continues the NV-YYYY-#### series from the highest known number.
 */
export function allocateNextInvoiceNumber(year = 2026): string {
  const all = getAllManagedInvoices();
  let max = 1100;
  const re = /NV-\d{4}-(\d+)/i;
  for (const inv of all) {
    const match = inv.invoiceNumber.match(re);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `NV-${year}-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Time entry IDs already present on managed invoices (not Cancelled).
 * Used as the billed flag for CounselFlow time_entries (no DB billed column).
 */
export function getInvoicedTimeEntryIds(): Set<string> {
  const ids = new Set<string>();
  for (const inv of getAllManagedInvoices()) {
    if (inv.status === "Cancelled") continue;
    for (const te of inv.timeEntries ?? []) {
      if (te.id) ids.add(te.id);
    }
  }
  return ids;
}

/** Expense line IDs already on managed invoices (not Cancelled). */
export function getInvoicedExpenseIds(): Set<string> {
  const ids = new Set<string>();
  for (const inv of getAllManagedInvoices()) {
    if (inv.status === "Cancelled") continue;
    for (const ex of inv.reimbursableExpenses ?? []) {
      if (ex.id) ids.add(ex.id);
    }
  }
  return ids;
}

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
import {
  allocateNextInvoiceNumberFromDb,
  deleteInvoiceInSupabase,
  fetchInvoicesFromSupabase,
  upsertInvoiceInSupabase,
} from "@/lib/billing/invoice-supabase";

/** @deprecated browser storage no longer holds live invoices; kept for migration/cleanup */
export const GENERATED_INVOICES_STORAGE_KEY = "nv-billing-generated-invoices-v1";
/** @deprecated */
export const DELETED_INVOICES_STORAGE_KEY = "nv-billing-deleted-invoices-v1";

/** Same-tab notify so Invoice Management / dashboards can refresh */
export const INVOICES_UPDATED_EVENT = "nv-invoices-updated";

/**
 * When true, merge demo INVOICE_SEED into the live catalog (client-only demos).
 * Default false — live paths use Supabase invoices only.
 */
export const USE_INVOICE_SEED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_BILLING_DEMO_SEED === "1";

export type PersistResult = {
  ok: boolean;
  count: number;
  error?: string;
  invoice?: Invoice;
};

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

const CACHE_KEY = "__nvManagedInvoicesCache";
const REVISION_MEMORY_KEY = "__nvBillingCatalogRev";
const CATALOG_REVISION_KEY = "nv-billing-catalog-rev-v1";
const LOAD_STATE_KEY = "__nvInvoiceCatalogLoad";

type LoadState = {
  inFlight: Promise<void> | null;
  lastError: string | null;
  lastLoadedAt: number;
};

function getCacheHolder(): { current: Invoice[] } {
  if (!canUseDom()) return { current: [] };
  const w = window as Window & { [CACHE_KEY]?: { current: Invoice[] } };
  if (!w[CACHE_KEY]) w[CACHE_KEY] = { current: [] };
  return w[CACHE_KEY]!;
}

function getLoadState(): LoadState {
  if (!canUseDom()) {
    return { inFlight: null, lastError: null, lastLoadedAt: 0 };
  }
  const w = window as Window & { [LOAD_STATE_KEY]?: LoadState };
  if (!w[LOAD_STATE_KEY]) {
    w[LOAD_STATE_KEY] = {
      inFlight: null,
      lastError: null,
      lastLoadedAt: 0,
    };
  }
  return w[LOAD_STATE_KEY]!;
}

function mergeWithOptionalSeed(rows: Invoice[]): Invoice[] {
  if (!USE_INVOICE_SEED) return rows;
  const numbers = new Set(rows.map((r) => r.invoiceNumber));
  const seed = INVOICE_SEED.filter((s) => !numbers.has(s.invoiceNumber));
  return [...rows, ...seed].sort((a, b) => {
    const byNumber = b.invoiceNumber.localeCompare(a.invoiceNumber, undefined, {
      numeric: true,
    });
    if (byNumber !== 0) return byNumber;
    return b.invoiceDate.localeCompare(a.invoiceDate);
  });
}

function writeCache(invoices: Invoice[]) {
  getCacheHolder().current = invoices;
}

function readCache(): Invoice[] {
  return getCacheHolder().current;
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
 * Pull firm invoices from Supabase into the in-memory catalog.
 * Safe to call often; concurrent calls share one in-flight request.
 */
export async function refreshInvoiceCatalog(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const state = getLoadState();
  if (state.inFlight) {
    await state.inFlight;
    return { ok: !state.lastError, error: state.lastError ?? undefined };
  }

  state.inFlight = (async () => {
    const { data, error } = await fetchInvoicesFromSupabase();
    if (error) {
      state.lastError = error;
      // Keep existing cache on soft failures so UI stays usable offline-ish
      if (readCache().length === 0 && USE_INVOICE_SEED) {
        writeCache(mergeWithOptionalSeed([]));
        notifyInvoicesUpdated();
      }
      return;
    }
    state.lastError = null;
    writeCache(mergeWithOptionalSeed(data));
    state.lastLoadedAt = Date.now();
    notifyInvoicesUpdated();
  })();

  try {
    await state.inFlight;
  } finally {
    state.inFlight = null;
  }
  return { ok: !state.lastError, error: state.lastError ?? undefined };
}

/**
 * Subscribe to catalog changes (custom event, focus, visibility, poll refresh).
 * Used by dashboards via useSyncExternalStore.
 */
export function subscribeInvoiceCatalog(onStoreChange: () => void): () => void {
  if (!canUseDom()) return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(INVOICES_UPDATED_EVENT, handler);
  window.addEventListener("focus", handler);
  window.addEventListener("pageshow", handler);
  document.addEventListener("visibilitychange", handler);

  // Initial + interval firm-wide refresh (all users share one DB)
  void refreshInvoiceCatalog();
  const pollId = window.setInterval(() => {
    void refreshInvoiceCatalog();
  }, 15_000);

  return () => {
    window.removeEventListener(INVOICES_UPDATED_EVENT, handler);
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

function catalogFingerprint(): string {
  const rows = readCache();
  return [
    getInvoiceCatalogRevision(),
    rows.length,
    rows.map((r) => `${r.invoiceNumber}:${r.amountPaid}:${r.status}`).join(","),
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

/** Stable empty reference — getServerSnapshot must not return a new [] each call */
const EMPTY_SERVER_SNAPSHOT: Invoice[] = [];

/**
 * SSR snapshot for useSyncExternalStore.
 * Must return a cached identity; a fresh [] each call triggers React’s infinite loop.
 */
export function getServerInvoicesSnapshot(): Invoice[] {
  // SSR has no browser cache; seed optional for SSR demos only
  return USE_INVOICE_SEED ? INVOICE_SEED : EMPTY_SERVER_SNAPSHOT;
}

/**
 * Managed invoice catalog (sync read of last Supabase refresh).
 * Call refreshInvoiceCatalog() / await upsert/delete for firm-wide truth.
 */
export function getAllManagedInvoices(): Invoice[] {
  return readCache();
}

export function getInvoiceCatalogError(): string | null {
  return getLoadState().lastError;
}

export async function deleteManagedInvoice(
  invoiceNumber: string,
): Promise<PersistResult> {
  const result = await deleteInvoiceInSupabase(invoiceNumber);
  await refreshInvoiceCatalog();
  const stillVisible = getAllManagedInvoices().some(
    (row) => row.invoiceNumber === invoiceNumber,
  );
  return {
    ok: result.ok && !stillVisible,
    count: getAllManagedInvoices().length,
    error: stillVisible
      ? result.error || "Invoice still visible after delete"
      : result.error,
  };
}

export function countGeneratedInvoices(): number {
  return getAllManagedInvoices().length;
}

/** Upsert by invoice number into shared Supabase invoices */
export async function upsertGeneratedInvoice(
  invoice: Invoice,
): Promise<PersistResult> {
  const result = await upsertInvoiceInSupabase(invoice);
  if (result.ok && result.invoice) {
    // Optimistic patch then authoritative refresh
    const without = readCache().filter(
      (row) =>
        row.invoiceNumber !== result.invoice!.invoiceNumber &&
        row.id !== result.invoice!.id,
    );
    writeCache(mergeWithOptionalSeed([result.invoice, ...without]));
    notifyInvoicesUpdated();
  }
  await refreshInvoiceCatalog();
  const verified = getAllManagedInvoices().some(
    (row) => row.invoiceNumber === invoice.invoiceNumber,
  );
  return {
    ok: result.ok && verified,
    count: getAllManagedInvoices().length,
    invoice: result.invoice,
    error: result.ok
      ? verified
        ? undefined
        : "Invoice was not found after save"
      : result.error,
  };
}

/**
 * Merge a patch into an existing managed invoice and persist.
 */
export async function updateManagedInvoice(
  invoiceNumber: string,
  patch: Partial<Invoice>,
): Promise<Invoice | null> {
  await refreshInvoiceCatalog();
  const found = getAllManagedInvoices().find(
    (row) => row.invoiceNumber === invoiceNumber,
  );
  if (!found) return null;
  const updated: Invoice = { ...found, ...patch };
  const result = await upsertGeneratedInvoice(updated);
  return result.invoice ?? (result.ok ? updated : null);
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
    clientId: client.id,
    matterId: matter.id,
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
 * Next sequential invoice number from the managed catalog (+ DB).
 * Sync path uses cache; prefer allocateNextInvoiceNumberAsync when possible.
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

export async function allocateNextInvoiceNumberAsync(
  year = 2026,
): Promise<string> {
  await refreshInvoiceCatalog();
  return allocateNextInvoiceNumberFromDb(year, getAllManagedInvoices());
}

/**
 * Time entry IDs already present on managed invoices (not Cancelled).
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

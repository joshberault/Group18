/**
 * Temporary performance cache for Billing UI.
 * Source of truth: shared Supabase invoices (+ line items + payments).
 * Always call refreshInvoiceCatalog() before trusting getAllManagedInvoices().
 */
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

/** Same-tab notify so Invoice Management / Billing dashboards re-render after DB refresh */
export const INVOICES_UPDATED_EVENT = "nv-invoices-updated";

/** @deprecated No longer used as invoice storage */
export const GENERATED_INVOICES_STORAGE_KEY = "nv-billing-generated-invoices-v1";
/** @deprecated */
export const DELETED_INVOICES_STORAGE_KEY = "nv-billing-deleted-invoices-v1";

/**
 * Seed merge disabled — Billing uses Supabase only.
 * Kept as false so env flags cannot reintroduce browser seed as primary data.
 */
export const USE_INVOICE_SEED = false;

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
const LOAD_STATE_KEY = "__nvInvoiceCatalogLoad";

type LoadState = {
  inFlight: Promise<void> | null;
  lastError: string | null;
  lastLoadedAt: number;
};

/** Module-level SSR-safe empty cache (stable empty for server snapshot) */
const SSR_EMPTY: Invoice[] = [];
let moduleRevision = 0;

function getCacheHolder(): { current: Invoice[] } {
  if (!canUseDom()) {
    return { current: SSR_EMPTY };
  }
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

function writeCache(invoices: Invoice[]) {
  if (!canUseDom()) return;
  getCacheHolder().current = invoices;
}

function readCache(): Invoice[] {
  if (!canUseDom()) return SSR_EMPTY;
  return getCacheHolder().current;
}

function bumpCatalogRevision() {
  moduleRevision += 1;
  if (!canUseDom()) return;
  try {
    (window as Window & { [REVISION_MEMORY_KEY]?: number })[
      REVISION_MEMORY_KEY
    ] = moduleRevision;
  } catch {
    /* ignore */
  }
}

function notifyInvoicesUpdated() {
  bumpCatalogRevision();
  if (!canUseDom()) return;
  try {
    window.dispatchEvent(new Event(INVOICES_UPDATED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Monotonic revision for useSyncExternalStore fingerprints */
export function getInvoiceCatalogRevision(): number {
  if (!canUseDom()) return moduleRevision;
  try {
    const bag = (window as Window & { [REVISION_MEMORY_KEY]?: number })[
      REVISION_MEMORY_KEY
    ];
    if (typeof bag === "number" && Number.isFinite(bag)) return bag;
  } catch {
    /* ignore */
  }
  return moduleRevision;
}

/**
 * Pull firm invoices from Supabase into the temporary in-memory cache.
 * Concurrent callers share one in-flight request.
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
      // Keep previous cache on transport failure only — never inject seed.
      return;
    }
    state.lastError = null;
    writeCache(data);
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
 * Subscribe for Billing dashboards (useSyncExternalStore).
 * Refetches from Supabase on mount, focus, and a light poll.
 */
export function subscribeInvoiceCatalog(onStoreChange: () => void): () => void {
  if (!canUseDom()) return () => {};
  const handler = () => onStoreChange();
  const refetch = () => {
    void refreshInvoiceCatalog();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      refetch();
    }
  };
  // Notify on cache updates; re-pull from Supabase on mount, focus, and poll.
  window.addEventListener(INVOICES_UPDATED_EVENT, handler);
  window.addEventListener("focus", refetch);
  window.addEventListener("pageshow", refetch);
  document.addEventListener("visibilitychange", onVisible);

  void refreshInvoiceCatalog();
  const pollId = window.setInterval(refetch, 12_000);

  return () => {
    window.removeEventListener(INVOICES_UPDATED_EVENT, handler);
    window.removeEventListener("focus", refetch);
    window.removeEventListener("pageshow", refetch);
    document.removeEventListener("visibilitychange", onVisible);
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
    rows
      .map(
        (r) =>
          `${r.invoiceNumber}:${r.amountPaid}:${r.remainingBalance}:${r.status}`,
      )
      .join(","),
  ].join("|");
}

/** Sync snapshot of last Supabase refresh (for useSyncExternalStore). */
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

const EMPTY_SERVER_SNAPSHOT: Invoice[] = [];

/** SSR snapshot — stable empty; live data loads after hydrate via refresh. */
export function getServerInvoicesSnapshot(): Invoice[] {
  return EMPTY_SERVER_SNAPSHOT;
}

/**
 * Last successful Supabase snapshot (temporary cache).
 * Prefer await refreshInvoiceCatalog() first.
 */
export function getAllManagedInvoices(): Invoice[] {
  return readCache();
}

export function getInvoiceCatalogError(): string | null {
  return getLoadState().lastError;
}

export function isInvoiceCatalogFromDatabase(): boolean {
  const state = getLoadState();
  return state.lastLoadedAt > 0 && !state.lastError;
}

export async function deleteManagedInvoice(
  invoiceNumber: string,
): Promise<PersistResult> {
  const result = await deleteInvoiceInSupabase(invoiceNumber);

  // Drop immediately from the shared in-memory catalog so every role's
  // useSyncExternalStore subscribers (dashboard KPIs, AR, invoices list)
  // drop the row even before the next network re-fetch finishes.
  if (result.ok && canUseDom()) {
    const next = readCache().filter(
      (row) => row.invoiceNumber !== invoiceNumber,
    );
    writeCache(next);
    notifyInvoicesUpdated();
  }

  // Authoritative reload from Supabase — single source of truth for all roles.
  await refreshInvoiceCatalog();
  const stillVisible = getAllManagedInvoices().some(
    (row) => row.invoiceNumber === invoiceNumber,
  );
  return {
    ok: result.ok && !stillVisible,
    count: getAllManagedInvoices().length,
    error: !result.ok
      ? result.error
      : stillVisible
        ? result.error || "Invoice still visible after delete"
        : undefined,
  };
}

export function countGeneratedInvoices(): number {
  return getAllManagedInvoices().length;
}

/** Persist invoice to Supabase, then re-fetch firm catalog. */
export async function upsertGeneratedInvoice(
  invoice: Invoice,
): Promise<PersistResult> {
  const result = await upsertInvoiceInSupabase(invoice);
  // Always re-read from database — never leave UI on optimistic-only state.
  await refreshInvoiceCatalog();
  const verified = getAllManagedInvoices().some(
    (row) => row.invoiceNumber === invoice.invoiceNumber,
  );
  const fromDb = getAllManagedInvoices().find(
    (row) => row.invoiceNumber === invoice.invoiceNumber,
  );
  return {
    ok: result.ok && verified,
    count: getAllManagedInvoices().length,
    invoice: fromDb ?? result.invoice,
    error: result.ok
      ? verified
        ? undefined
        : "Invoice was not found in Supabase after save"
      : result.error,
  };
}

/** Merge patch, write Supabase, re-fetch. */
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
  return result.invoice ?? null;
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

/** Attorneys present on the live firm invoice list (no seed). */
export function getInvoiceAttorneysFromCatalog(
  invoices: Invoice[] = getAllManagedInvoices(),
): string[] {
  return Array.from(
    new Set(
      invoices
        .map((i) => i.attorney?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ).sort();
}

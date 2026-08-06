"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GenerateInvoicePreview } from "@/components/billing/GenerateInvoicePreview";
import type {
  FinalizedInvoiceRecord,
  GenerateClient,
  GenerateMatter,
  InvoiceTotals,
  ClientBillingMethod,
  TimeApprovalStatus,
  UnbilledTimeEntry,
} from "@/lib/billing/generate-invoice-types";
import {
  allocateNextInvoiceNumberAsync,
  buildManagedInvoiceFromGeneration,
  getInvoicedExpenseIds,
  getInvoicedTimeEntryIds,
  refreshInvoiceCatalog,
  upsertGeneratedInvoice,
} from "@/lib/billing/invoice-management-store";
import {
  type CatalogSource,
  enrichClientWithRetainerBalance,
  loadBillingClients,
  loadBillingMattersForClient,
} from "@/lib/billing/counselflow-catalog";
import { hydrateMatterWithModuleWip } from "@/lib/billing/matter-wip";
import {
  applyRetainerToMatter,
  fetchMatterRetainerBalance,
} from "@/lib/billing/retainer";
import { toIsoDate } from "@/lib/billing/billing-period";
import {
  BILLING_ROUTES,
  invoicesHref,
} from "@/lib/billing/routes";
import { PageHeader } from "@/components/ui/PageHeader";

const STEPS = [
  "Select Client",
  "Select Legal Matter",
  "Billable Time",
  "Expenses",
  "Adjustments",
  "Invoice Preview",
  "Finalize",
] as const;

const NARRATIVE_ONE_LINE_CHARS = 72;

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function extended(hours: number, rate: number): number {
  return Math.round(hours * rate * 100) / 100;
}

function isTimeApproved(t: UnbilledTimeEntry): boolean {
  return t.approvalStatus === "Approved";
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function approvalBadgeClass(status: TimeApprovalStatus): string {
  if (status === "Approved") return "gi-approval gi-approval--approved";
  if (status === "Pending") return "gi-approval gi-approval--pending";
  return "gi-approval gi-approval--rejected";
}

export function GenerateInvoiceWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState<GenerateClient[]>([]);
  const [catalogSource, setCatalogSource] =
    useState<CatalogSource>("empty");
  const [catalogMessage, setCatalogMessage] = useState<string | null>(
    "Loading firm clients…",
  );
  const [clientsLoading, setClientsLoading] = useState(true);
  const [firmMatters, setFirmMatters] = useState<GenerateMatter[]>([]);
  const [mattersLoading, setMattersLoading] = useState(false);
  const [mattersMessage, setMattersMessage] = useState<string | null>(null);
  const [matterWipLoading, setMatterWipLoading] = useState(false);
  const [matterWipMessage, setMatterWipMessage] = useState<string | null>(null);
  /** Matter-scoped retainer (authoritative when a matter is selected). */
  const [matterRetainerBalance, setMatterRetainerBalance] = useState(0);
  const [retainerSourceNote, setRetainerSourceNote] = useState<string | null>(
    null,
  );
  const [retainerLoading, setRetainerLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [client, setClient] = useState<GenerateClient | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [autofillName, setAutofillName] = useState("");
  const [autofillClientId, setAutofillClientId] = useState("");
  const [autofillContact, setAutofillContact] = useState("");
  const [autofillMethod, setAutofillMethod] =
    useState<ClientBillingMethod>("Hourly");
  const [completeAmount, setCompleteAmount] = useState("");
  const [prepaidAmount, setPrepaidAmount] = useState("");
  const [selectClientErrors, setSelectClientErrors] = useState<string[]>([]);
  const [matter, setMatter] = useState<GenerateMatter | null>(null);
  const [selectedTimeIds, setSelectedTimeIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(
    new Set(),
  );
  const [retainerToApply, setRetainerToApply] = useState(0);
  const [applyWriteDowns, setApplyWriteDowns] = useState(true);
  const [applyCourtesy, setApplyCourtesy] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [status, setStatus] = useState<"Draft" | "Sent">("Draft");
  const [invoiceHistory, setInvoiceHistory] = useState<FinalizedInvoiceRecord[]>(
    [],
  );
  const [lockedTimeIds, setLockedTimeIds] = useState<Set<string>>(() =>
    getInvoicedTimeEntryIds(),
  );
  const [lockedExpenseIds, setLockedExpenseIds] = useState<Set<string>>(() =>
    getInvoicedExpenseIds(),
  );
  const [messages, setMessages] = useState<string[]>([]);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [managementLinkNumber, setManagementLinkNumber] = useState<string | null>(
    null,
  );
  const [expandedTimeIds, setExpandedTimeIds] = useState<Set<string>>(
    new Set(),
  );

  const reloadMattersForClient = useCallback(
    async (firmClient: GenerateClient | null) => {
      if (!firmClient) {
        setFirmMatters([]);
        setMattersMessage(null);
        setMattersLoading(false);
        return;
      }
      setMattersLoading(true);
      setMattersMessage(null);
      const catalog = await loadBillingMattersForClient(firmClient.id);
      setFirmMatters(catalog.matters);
      setMattersMessage(catalog.message);
      setMattersLoading(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadClients(opts?: { silent?: boolean }) {
      if (!opts?.silent) setClientsLoading(true);
      await refreshInvoiceCatalog();
      if (cancelled) return;
      const catalog = await loadBillingClients();
      if (cancelled) return;
      setClients(catalog.clients);
      setCatalogSource(catalog.source);
      setCatalogMessage(catalog.message);
      setClientsLoading(false);
      setLockedTimeIds(getInvoicedTimeEntryIds());
      setLockedExpenseIds(getInvoicedExpenseIds());
      // Keep selected client balances in sync after CRM refresh
      setClient((prev) => {
        if (!prev) return prev;
        const fresh = catalog.clients.find((c) => c.id === prev.id);
        if (!fresh) return prev;
        return {
          ...prev,
          name: fresh.name,
          clientId: fresh.clientId,
          email: fresh.email,
          phone: fresh.phone,
          address: fresh.address,
          trustRetainerBalance: fresh.trustRetainerBalance,
        };
      });
    }

    void loadClients();

    function onFocus() {
      void loadClients({ silent: true });
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        void loadClients({ silent: true });
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Refresh matters + matter retainer when returning to the tab
  useEffect(() => {
    if (!client) return;
    const firmClientId = client.id;
    const matterId = matter?.id;

    function onRefresh() {
      void reloadMattersForClient({ id: firmClientId } as GenerateClient);
      if (matterId) {
        void fetchMatterRetainerBalance(matterId).then((r) => {
          setMatterRetainerBalance(r.balance);
          setRetainerSourceNote(
            r.message
              ? r.message
              : `Matter retainer available: ${money(r.balance)} (from CounselFlow matter record).`,
          );
          setRetainerToApply((prev) => Math.min(prev, r.balance));
        });
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") onRefresh();
    }

    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [client, matter?.id, reloadMattersForClient]);

  const matters = firmMatters;

  /** All unbilled (not locked) time shown on Step 3, including pending/rejected */
  const unbilledTimeEntries = useMemo(() => {
    if (!matter) return [];
    return matter.timeEntries.filter(
      (t) => !t.billed && !lockedTimeIds.has(t.id),
    );
  }, [matter, lockedTimeIds]);

  const approvedUnbilledTime = useMemo(
    () => unbilledTimeEntries.filter(isTimeApproved),
    [unbilledTimeEntries],
  );

  const approvedExpenses = useMemo(() => {
    if (!matter) return [];
    return matter.expenses.filter(
      (e) => e.approved && !e.billed && !lockedExpenseIds.has(e.id),
    );
  }, [matter, lockedExpenseIds]);

  const selectedTime = approvedUnbilledTime.filter((t) =>
    selectedTimeIds.has(t.id),
  );
  const selectedExpenses = approvedExpenses.filter((e) =>
    selectedExpenseIds.has(e.id),
  );

  const selectedTimeHours = selectedTime.reduce((sum, t) => sum + t.hours, 0);

  const writeDownTotal = useMemo(() => {
    if (!matter || !applyWriteDowns) return 0;
    return matter.writeDowns
      .filter((w) => w.approved)
      .reduce((sum, w) => sum + w.amount, 0);
  }, [matter, applyWriteDowns]);

  const courtesyDiscount =
    matter && applyCourtesy ? matter.courtesyDiscountApproved : 0;

  const timeSubtotal = selectedTime.reduce(
    (sum, t) => sum + extended(t.hours, t.rate),
    0,
  );
  const expenseSubtotal = selectedExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  /**
   * Retainer available for application: matter-level after matter select;
   * client sum of matter retainers before that.
   */
  const maxRetainer = matter
    ? matterRetainerBalance
    : (client?.trustRetainerBalance ?? 0);

  const amountDueBeforeRetainer = useMemo(() => {
    const pre = timeSubtotal + expenseSubtotal - writeDownTotal - courtesyDiscount;
    return Math.max(0, Math.round(pre * 100) / 100);
  }, [timeSubtotal, expenseSubtotal, writeDownTotal, courtesyDiscount]);

  const maxRetainerApplicable = useMemo(
    () => Math.min(maxRetainer, amountDueBeforeRetainer),
    [maxRetainer, amountDueBeforeRetainer],
  );

  const remainingRetainer = useMemo(
    () => Math.round((maxRetainer - retainerToApply) * 100) / 100,
    [maxRetainer, retainerToApply],
  );

  const retainerCoversAmountDue =
    amountDueBeforeRetainer > 0 && maxRetainer >= amountDueBeforeRetainer;

  const totals: InvoiceTotals = useMemo(() => {
    const adjustments = writeDownTotal + courtesyDiscount + retainerToApply;
    const gross = timeSubtotal + expenseSubtotal;
    const totalDue = Math.max(0, Math.round((gross - adjustments) * 100) / 100);
    return {
      billableTime: timeSubtotal,
      expenses: expenseSubtotal,
      writeDowns: writeDownTotal,
      courtesyDiscount,
      retainerApplied: retainerToApply,
      totalAdjustments: adjustments,
      totalDue,
    };
  }, [
    timeSubtotal,
    expenseSubtotal,
    writeDownTotal,
    courtesyDiscount,
    retainerToApply,
  ]);

  const historySorted = useMemo(
    () =>
      [...invoiceHistory].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [invoiceHistory],
  );

  function selectClient(next: GenerateClient) {
    setClient(next);
    setSelectedClientId(next.id);
    setAutofillName(next.name);
    setAutofillClientId(next.clientId);
    setAutofillContact(next.billingContact);
    setAutofillMethod(next.billingMethod);
    setCompleteAmount(String(next.trustRetainerBalance));
    setMatter(null);
    setMatterWipMessage(null);
    setMatterRetainerBalance(0);
    setRetainerSourceNote(null);
    setSelectedTimeIds(new Set());
    setSelectedExpenseIds(new Set());
    setRetainerToApply(0);
    setMessages([]);
    setSuccessNote(null);
    setStatus("Draft");
    setSelectClientErrors([]);
    setInvoiceNumber("");
    setInvoiceDate("");
    setDueDate("");
    void reloadMattersForClient(next);
  }

  async function loadClientIntoForm(clientId: string) {
    setSelectedClientId(clientId);
    setSelectClientErrors([]);
    setClient(null);
    setFirmMatters([]);
    setMattersMessage(null);
    setMatter(null);
    setMatterWipMessage(null);
    setMatterRetainerBalance(0);
    setRetainerSourceNote(null);
    if (!clientId) {
      setAutofillName("");
      setAutofillClientId("");
      setAutofillContact("");
      setAutofillMethod("Hourly");
      setCompleteAmount("");
      setPrepaidAmount("");
      setRetainerLoading(false);
      return;
    }
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;
    setAutofillName(found.name);
    setAutofillClientId(found.clientId);
    setAutofillContact(found.billingContact);
    setAutofillMethod(found.billingMethod);
    setPrepaidAmount("");
    setRetainerLoading(true);
    setCompleteAmount("…");
    const enriched = await enrichClientWithRetainerBalance(found);
    setAutofillName(enriched.name);
    setCompleteAmount(String(enriched.trustRetainerBalance));
    setRetainerSourceNote(
      "Retainer balance is the sum of retainer_balance on this client's CounselFlow matters.",
    );
    setRetainerLoading(false);
    // Keep clients list balance fresh
    setClients((list) =>
      list.map((c) => (c.id === enriched.id ? enriched : c)),
    );
  }

  async function confirmExistingClient() {
    const errors: string[] = [];
    if (!selectedClientId) {
      errors.push("Select an existing client from the dropdown.");
    }
    const found = clients.find((c) => c.id === selectedClientId);
    if (!found && selectedClientId) {
      errors.push("That client could not be found.");
    }

    const prepaid = Number(prepaidAmount || "0");
    if (Number.isNaN(prepaid) || prepaid < 0) {
      errors.push("Prepaid / deposit amount must be 0 or greater.");
    }

    const contact = autofillContact.trim();
    if (!contact) {
      errors.push("Billing contact is required.");
    }

    if (errors.length || !found) {
      setSelectClientErrors(errors);
      return;
    }

    setRetainerLoading(true);
    const enriched = await enrichClientWithRetainerBalance(found);
    setRetainerLoading(false);

    const updated: GenerateClient = {
      ...enriched,
      billingContact: contact,
      billingMethod: autofillMethod,
    };
    setClients((list) =>
      list.map((c) => (c.id === updated.id ? updated : c)),
    );
    setCompleteAmount(String(updated.trustRetainerBalance));
    selectClient(updated);
    if (prepaid > 0) {
      setRetainerToApply(Math.min(prepaid, updated.trustRetainerBalance));
    }
    setSuccessNote(
      `${updated.name} is selected. Retainer total from matter records: ${money(updated.trustRetainerBalance)}. Select a matter next to bill time and apply that matter’s retainer.`,
    );
  }

  async function selectMatter(base: GenerateMatter) {
    setMatterWipLoading(true);
    setMatterWipMessage(null);
    setExpandedTimeIds(new Set());
    setSelectedTimeIds(new Set());
    setSelectedExpenseIds(new Set());
    setRetainerToApply(0);
    setApplyWriteDowns(true);
    setApplyCourtesy(true);
    setMessages([]);
    setSuccessNote(null);
    setStatus("Draft");
    setMatter({ ...base, timeEntries: [], expenses: [] });

    const billedTime = getInvoicedTimeEntryIds();
    const billedExp = getInvoicedExpenseIds();
    setLockedTimeIds(billedTime);
    setLockedExpenseIds(billedExp);

    const [result, retainer] = await Promise.all([
      hydrateMatterWithModuleWip(base),
      fetchMatterRetainerBalance(base.id),
    ]);
    setMatterWipLoading(false);
    setMatterWipMessage(result.message);
    setMatter(result.matter);
    setMatterRetainerBalance(retainer.balance);
    setRetainerSourceNote(
      retainer.message
        ? retainer.message
        : `Matter retainer available: ${money(retainer.balance)} (from CounselFlow matter record).`,
    );

    const prepaid = Number(prepaidAmount || "0");
    if (prepaid > 0 && !retainer.message) {
      setRetainerToApply(Math.min(prepaid, retainer.balance));
    }

    const timeIds = result.matter.timeEntries
      .filter(
        (t) => isTimeApproved(t) && !t.billed && !billedTime.has(t.id),
      )
      .map((t) => t.id);
    const expenseIds = result.matter.expenses
      .filter((e) => e.approved && !e.billed && !billedExp.has(e.id))
      .map((e) => e.id);
    setSelectedTimeIds(new Set(timeIds));
    setSelectedExpenseIds(new Set(expenseIds));
  }

  function selectAllApprovedTime() {
    setSelectedTimeIds(new Set(approvedUnbilledTime.map((t) => t.id)));
  }

  function clearAllSelectedTime() {
    setSelectedTimeIds(new Set());
  }

  function toggleTimeExpand(id: string) {
    setExpandedTimeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleId(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    id: string,
  ) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function toggleApprovedTime(id: string) {
    const entry = matter?.timeEntries.find((t) => t.id === id);
    if (!entry || !isTimeApproved(entry)) return;
    toggleId(selectedTimeIds, setSelectedTimeIds, id);
  }

  function setRetainerSafe(value: number) {
    const clamped = Math.min(Math.max(0, value), maxRetainer);
    const maxAgainstInvoice = Math.max(0, amountDueBeforeRetainer);
    setRetainerToApply(Math.min(clamped, maxAgainstInvoice, maxRetainer));
  }

  /** Apply as much retainer as needed to cover amount due (capped at available / due). */
  function applyRetainerToCoverAmountDue() {
    const amount = Math.min(maxRetainer, amountDueBeforeRetainer);
    setRetainerToApply(amount);
    if (amount <= 0) {
      setSuccessNote(null);
      setMessages([
        amountDueBeforeRetainer <= 0
          ? "There is no amount due after other adjustments. Retainer was not applied."
          : "No retainer balance is available to apply.",
      ]);
      return;
    }
    setMessages([]);
    const remaining = Math.round((maxRetainer - amount) * 100) / 100;
    if (maxRetainer >= amountDueBeforeRetainer) {
      setSuccessNote(
        `Retainer of ${money(amount)} applied to fully cover the amount due. Remaining retainer balance: ${money(remaining)}.`,
      );
    } else {
      setSuccessNote(
        `Retainer of ${money(amount)} applied (available balance is less than the amount due of ${money(amountDueBeforeRetainer)}). Remaining retainer balance: ${money(remaining)}. Client balance due stays ${money(Math.round((amountDueBeforeRetainer - amount) * 100) / 100)}.`,
      );
    }
  }

  function clearRetainerApplication() {
    setRetainerToApply(0);
    setMessages([]);
    setSuccessNote(
      `Retainer application cleared. Full retainer available: ${money(maxRetainer)}.`,
    );
  }

  function validateForPreviewOrLater(): string[] {
    const errors: string[] = [];
    if (!client) errors.push("Select a client before continuing.");
    if (!matter) errors.push("Select a legal matter before continuing.");
    if (selectedTime.length === 0) {
      errors.push(
        "Select at least one approved, unbilled time entry to generate an invoice.",
      );
    }
    if (client && matter) {
      const duplicate = invoiceHistory.some(
        (h) =>
          h.status === "Sent" &&
          h.clientId === client.id &&
          h.matterId === matter.id &&
          h.billingPeriod === matter.billingPeriod,
      );
      if (duplicate) {
        errors.push(
          `An invoice already exists for matter ${matter.matterNumber} and billing period ${matter.billingPeriod}.`,
        );
      }
    }
    return errors;
  }

  function goNext() {
    setSuccessNote(null);
    if (step === 0 && !client) {
      setMessages([
        "Select a client from the dropdown (autofills name, ID, and billing contact), complete the invoice amounts, and confirm before continuing.",
      ]);
      return;
    }
    if (step === 1 && !matter) {
      setMessages(["Select a legal matter to continue."]);
      return;
    }
    if (step === 1 && matterWipLoading) {
      setMessages([
        "Still loading billable time for this matter. Wait a moment, then continue.",
      ]);
      return;
    }
    if (step === 2 && selectedTime.length === 0) {
      setMessages([
        "Include at least one approved billable time entry from Time & Expenses, or return to pick a matter with approved unbilled time.",
      ]);
      return;
    }
    // Step 5 (index 4) → Preview Step 6: generate invoice # and dates for the first time
    if (step === 4) {
      if (!invoiceDate) setInvoiceDate(todayIso());
      if (!dueDate) setDueDate(plusDaysIso(30));
      if (!invoiceNumber) {
        void allocateNextInvoiceNumberAsync().then((num) =>
          setInvoiceNumber(num),
        );
      }
    }
    setMessages([]);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    setMessages([]);
    setSuccessNote(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function saveDraft() {
    const errs = validateForPreviewOrLater();
    if (errs.length) {
      setMessages(errs);
      return;
    }
    if (!client || !matter) return;

    const number =
      invoiceNumber || (await allocateNextInvoiceNumberAsync());
    const invDate = invoiceDate || todayIso();
    const due = dueDate || plusDaysIso(30);
    setInvoiceNumber(number);
    setInvoiceDate(invDate);
    setDueDate(due);

    setStatus("Draft");
    const createdAt = new Date().toISOString();
    const alreadyDraft = invoiceHistory.some(
      (h) => h.invoiceNumber === number,
    );

    if (!alreadyDraft) {
      const record: FinalizedInvoiceRecord = {
        id: `draft-${Date.now()}`,
        invoiceNumber: number,
        clientId: client.id,
        matterId: matter.id,
        billingPeriod: matter.billingPeriod,
        invoiceDate: invDate,
        dueDate: due,
        totalDue: totals.totalDue,
        status: "Draft",
        lockedTimeEntryIds: [],
        createdAt,
      };
      setInvoiceHistory((h) => [...h, record]);
    } else {
      setInvoiceHistory((h) =>
        h.map((row) =>
          row.invoiceNumber === number
            ? {
                ...row,
                invoiceDate: invDate,
                dueDate: due,
                totalDue: totals.totalDue,
                status: "Draft",
              }
            : row,
        ),
      );
    }

    const saved = await upsertGeneratedInvoice(
      buildManagedInvoiceFromGeneration({
        id: `draft-${number}`,
        invoiceNumber: number,
        invoiceDate: invDate,
        dueDate: due,
        status: "Draft",
        client,
        matter,
        timeEntries: selectedTime,
        expenses: selectedExpenses,
        applyWriteDowns,
        courtesyDiscount,
        totals,
      }),
    );

    if (saved.ok) {
      setManagementLinkNumber(number);
      setSuccessNote(
        `Draft ${number} saved to Invoice Management (${saved.count} invoice${saved.count === 1 ? "" : "s"} in firm catalog). Time entries remain billable until finalized.`,
      );
      setMessages([]);
    } else {
      setManagementLinkNumber(null);
      setMessages([
        `Could not save draft ${number} to Invoice Management: ${saved.error || "unknown error"}. Check Supabase configuration and that the client/matter are linked.`,
      ]);
      setSuccessNote(null);
    }
  }

  async function finalizeInvoice() {
    const errs = validateForPreviewOrLater();
    if (errs.length) {
      setMessages(errs);
      return;
    }
    if (!client || !matter) return;
    if (finalizing) return;

    setFinalizing(true);
    setMessages([]);
    setSuccessNote(null);

    const number =
      invoiceNumber || (await allocateNextInvoiceNumberAsync());
    const invDate = invoiceDate || todayIso();
    const due = dueDate || plusDaysIso(30);

    // Write back matter retainer before locking invoice — fail closed (no invent).
    let remainingMatterRetainer = matterRetainerBalance;
    if (retainerToApply > 0) {
      const applyResult = await applyRetainerToMatter(
        matter.id,
        retainerToApply,
      );
      if (!applyResult.ok) {
        setFinalizing(false);
        setMessages([
          applyResult.error ||
            "Could not update matter retainer balance. Finalize was blocked so funds stay correct.",
        ]);
        setSuccessNote(null);
        return;
      }
      remainingMatterRetainer = applyResult.remainingBalance;
      setMatterRetainerBalance(remainingMatterRetainer);
      setClient((c) =>
        c
          ? {
              ...c,
              trustRetainerBalance: Math.max(
                0,
                Math.round(
                  ((c.trustRetainerBalance || 0) - retainerToApply) * 100,
                ) / 100,
              ),
            }
          : c,
      );
    }

    const locked = selectedTime.map((t) => t.id);
    const lockedExp = selectedExpenses.map((e) => e.id);
    setLockedTimeIds((prev) => new Set([...prev, ...locked]));
    setLockedExpenseIds((prev) => new Set([...prev, ...lockedExp]));

    const existingIndex = invoiceHistory.findIndex(
      (h) => h.invoiceNumber === number,
    );
    const createdAt =
      existingIndex >= 0
        ? invoiceHistory[existingIndex].createdAt
        : new Date().toISOString();

    const record: FinalizedInvoiceRecord = {
      id:
        existingIndex >= 0
          ? invoiceHistory[existingIndex].id
          : `fin-${Date.now()}`,
      invoiceNumber: number,
      clientId: client.id,
      matterId: matter.id,
      billingPeriod: matter.billingPeriod,
      invoiceDate: invDate,
      dueDate: due,
      totalDue: totals.totalDue,
      status: "Sent",
      lockedTimeEntryIds: locked,
      createdAt,
    };

    const clientForInvoice: GenerateClient = {
      ...client,
      trustRetainerBalance: remainingMatterRetainer,
    };

    const managed = buildManagedInvoiceFromGeneration({
      id: record.id,
      invoiceNumber: number,
      invoiceDate: invDate,
      dueDate: due,
      status: "Sent",
      client: clientForInvoice,
      matter,
      timeEntries: selectedTime,
      expenses: selectedExpenses,
      applyWriteDowns,
      courtesyDiscount,
      totals,
    });

    const saved = await upsertGeneratedInvoice(managed);

    setInvoiceHistory((h) => {
      const without = h.filter((row) => row.invoiceNumber !== number);
      return [...without, record];
    });
    setStatus("Sent");
    setInvoiceNumber(number);
    setInvoiceDate(invDate);
    setDueDate(due);
    setFinalizing(false);

    if (saved.ok) {
      setManagementLinkNumber(number);
      const retainerNote =
        retainerToApply > 0
          ? ` Applied ${money(retainerToApply)} from matter retainer (remaining ${money(remainingMatterRetainer)}).`
          : "";
      setSuccessNote(
        `Invoice ${number} finalized as Sent and saved to firm Invoice Management (${saved.count} invoice${saved.count === 1 ? "" : "s"} in catalog).${retainerNote} Use the link below to open it.`,
      );
      setMessages([]);
      if (retainerToApply > 0) {
        setRetainerToApply(0);
      }
    } else {
      setManagementLinkNumber(null);
      setSuccessNote(null);
      setMessages([
        `Invoice ${number} was partially processed but could not be written to Invoice Management storage: ${saved.error || "unknown error"}. Check browser privacy/storage settings and try Finalize again.${
          retainerToApply > 0
            ? " Matter retainer was already reduced — verify balance in CounselFlow before re-applying."
            : ""
        }`,
      ]);
    }
  }

  function simulateDownload() {
    setSuccessNote(
      `PDF download simulated for ${invoiceNumber} (${status}). In production this would export a client-ready PDF.`,
    );
  }

  function simulateEmail() {
    if (!client) {
      setMessages(["Select a client before emailing."]);
      return;
    }
    setSuccessNote(
      `Email simulated to ${client.email} for invoice ${invoiceNumber}.`,
    );
  }

  function cancelWizard() {
    router.push(BILLING_ROUTES.dashboard);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Create invoices from completed legal work — select client and matter, pull approved time and expenses, adjust, preview, then finalize."
      >
        <p className="text-xs text-muted" role="status">
          Workflow: Step {step + 1} of {STEPS.length}
        </p>
      </PageHeader>

      <div className="billing-module">
      <div className="dashboard gi">

      <ol className="gi__steps" aria-label="Invoice generation steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === step
                ? "gi__step gi__step--current"
                : index < step
                  ? "gi__step gi__step--done"
                  : "gi__step"
            }
          >
            <span className="gi__step-num">{index + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      {messages.length > 0 ? (
        <div className="gi__alert" role="alert">
          <ul>
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {successNote ? (
        <div className="gi__success" role="status">
          <p style={{ margin: 0 }}>{successNote}</p>
          {managementLinkNumber ? (
            <p style={{ margin: "0.55rem 0 0" }}>
              <Link
                href={invoicesHref({ highlight: managementLinkNumber })}
                className="dashboard__create-btn"
                style={{ display: "inline-flex" }}
              >
                Open {managementLinkNumber} in Invoice Management
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <section className="panel gi__card" aria-labelledby="gi-step-title">
        <header className="panel__header">
          <h2 id="gi-step-title">
            Step {step + 1}: {STEPS[step]}
          </h2>
          <p>Complete this step, then continue to build the draft invoice.</p>
        </header>

        {step === 0 ? (
          <div className="gi__stack">
            <div className="gi-step1-toolbar">
              <p className="gi-muted" style={{ margin: 0, flex: 1 }}>
                Clients are loaded from the CounselFlow Clients module. Select a
                client to continue; matters for that client load on the next
                step.
              </p>
              <Link
                href="/clients"
                className="dashboard__create-btn"
                style={{ display: "inline-flex", textDecoration: "none" }}
              >
                Open Clients module
              </Link>
            </div>

            {catalogMessage ? (
              <p className="gi-muted" role="status" style={{ margin: 0 }}>
                {clientsLoading ? "Loading firm clients…" : catalogMessage}
              </p>
            ) : null}

            <div className="gi-add-client panel" aria-label="Select existing client">
              <header className="panel__header">
                <h3 className="gi-subhead" style={{ margin: 0 }}>
                  Select existing client
                </h3>
                <p>
                  Choose a client from firm CRM records. Name and Client ID fill
                  automatically. Adjust billing contact and amounts for this
                  invoice only.
                </p>
              </header>

              {selectClientErrors.length > 0 ? (
                <div className="gi__alert" role="alert">
                  <ul>
                    {selectClientErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="gi-add-client__grid">
                <label className="gi__field gi-add-client__wide">
                  <span>Client (existing)</span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => void loadClientIntoForm(e.target.value)}
                    disabled={clientsLoading || clients.length === 0}
                  >
                    <option value="">
                      {clientsLoading
                        ? "Loading clients…"
                        : clients.length === 0
                          ? "No clients available"
                          : "Choose a client…"}
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.clientId})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gi__field">
                  <span>Client Name</span>
                  <input value={autofillName} readOnly />
                </label>
                <label className="gi__field">
                  <span>Client ID</span>
                  <input value={autofillClientId} readOnly />
                </label>
                <label className="gi__field">
                  <span>Billing Contact</span>
                  <input
                    value={autofillContact}
                    disabled={!selectedClientId}
                    onChange={(e) => setAutofillContact(e.target.value)}
                    placeholder="Contact name"
                  />
                </label>
                <label className="gi__field">
                  <span>Billing Method</span>
                  <select
                    value={autofillMethod}
                    disabled={!selectedClientId}
                    onChange={(e) =>
                      setAutofillMethod(e.target.value as ClientBillingMethod)
                    }
                  >
                    <option value="Hourly">Hourly</option>
                    <option value="Fixed Fee">Fixed Fee</option>
                    <option value="Retainer">Retainer</option>
                  </select>
                </label>
                <label className="gi__field">
                  <span>Trust / Retainer (from matters)</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={completeAmount}
                    readOnly
                    disabled={!selectedClientId || retainerLoading}
                    placeholder={
                      retainerLoading
                        ? "Loading retainer…"
                        : "Loaded from matter retainers"
                    }
                    title="Sum of retainer_balance on this client's matters in CounselFlow"
                  />
                  <span className="gi-field-hint" style={{ display: "block" }}>
                    {retainerSourceNote ||
                      "Read-only total of matter retainer balances for this client."}
                  </span>
                </label>
                <label className="gi__field">
                  <span>Suggested retainer apply (optional)</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={prepaidAmount}
                    disabled={!selectedClientId}
                    onChange={(e) => setPrepaidAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="gi-field-hint" style={{ display: "block" }}>
                    Optional amount to prefill on the Adjustments step. Application
                    uses the selected matter&apos;s retainer.
                  </span>
                </label>
              </div>

              <div className="gi-actions">
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={() => void confirmExistingClient()}
                  disabled={!selectedClientId || retainerLoading}
                >
                  Confirm client &amp; amounts
                </button>
                {client ? (
                  <span className="gi-muted">
                    Selected: <strong>{client.name}</strong>
                  </span>
                ) : null}
              </div>
            </div>

          </div>
        ) : null}

        {step === 1 && client ? (
          <div className="gi__stack">
            <div className="gi-step1-toolbar">
              <p className="gi-muted" style={{ margin: 0, flex: "1 1 auto" }}>
                Matters for <strong>{client.name}</strong> — from CounselFlow
                (matters linked to this client). Selecting a matter loads
                approved unbilled time from Time &amp; Expenses.
              </p>
              <Link
                href={"/clients/" + client.id}
                className="dashboard__create-btn"
                style={{ display: "inline-flex", textDecoration: "none" }}
              >
                Open client record
              </Link>
            </div>

            {mattersLoading ? (
              <p className="gi-muted" role="status">
                Loading matters for this client…
              </p>
            ) : null}
            {mattersMessage && !mattersLoading ? (
              <p className="gi-muted" role="status">
                {mattersMessage}
              </p>
            ) : null}
            {matterWipLoading ? (
              <p className="gi-muted" role="status">
                Loading billable time and expenses for the selected matter…
              </p>
            ) : null}
            {matterWipMessage && !matterWipLoading ? (
              <p className="gi-muted" role="status">
                {matterWipMessage}
              </p>
            ) : null}

            <div className="gi__table-wrap">
              <table className="gi-table">
                <thead>
                  <tr>
                    <th>Matter Name</th>
                    <th>Matter Number</th>
                    <th>Responsible Attorney</th>
                    <th>Matter Status</th>
                    <th>Billing Period</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mattersLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="gi-muted"
                        style={{ padding: "1rem" }}
                      >
                        Loading matters…
                      </td>
                    </tr>
                  ) : matters.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="gi-muted"
                        style={{ padding: "1rem" }}
                      >
                        No matters for this client yet. Create a matter linked
                        to this client in CounselFlow, then return here.
                      </td>
                    </tr>
                  ) : (
                    matters.map((m) => (
                      <tr
                        key={m.id}
                        className={
                          matter?.id === m.id ? "gi-row--selected" : undefined
                        }
                      >
                        <td className="gi-strong">{m.matterName}</td>
                        <td>{m.matterNumber}</td>
                        <td>{m.responsibleAttorney}</td>
                        <td>{m.status}</td>
                        <td>{m.billingPeriod}</td>
                        <td>
                          <button
                            type="button"
                            className="gi-btn gi-btn--small"
                            disabled={matterWipLoading}
                            onClick={() => void selectMatter(m)}
                          >
                            {matter?.id === m.id
                              ? matterWipLoading
                                ? "Loading…"
                                : "Selected"
                              : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {step === 2 && client && matter ? (
          <div className="gi__stack">
            {matterWipLoading ? (
              <p className="gi-muted" role="status">
                Loading Time &amp; Expenses for this matter…
              </p>
            ) : null}
            {matterWipMessage && !matterWipLoading ? (
              <p className="gi-muted" role="status">
                {matterWipMessage}
              </p>
            ) : null}
            <dl className="gi-matter-strip" aria-label="Matter information">
              <div>
                <dt>Client Name</dt>
                <dd>{client.name}</dd>
              </div>
              <div>
                <dt>Matter Name</dt>
                <dd>{matter.matterName}</dd>
              </div>
              <div>
                <dt>Matter Number</dt>
                <dd>{matter.matterNumber}</dd>
              </div>
              <div>
                <dt>Responsible Attorney</dt>
                <dd>{matter.responsibleAttorney}</dd>
              </div>
              <div>
                <dt>Billing Method</dt>
                <dd>{client.billingMethod}</dd>
              </div>
              <div>
                <dt>Billing Period</dt>
                <dd>{matter.billingPeriod}</dd>
              </div>
            </dl>

            <div className="gi-time-layout">
              <div className="gi-time-layout__main">
                <div className="gi-step1-toolbar">
                  <p className="gi-muted" style={{ margin: 0, flex: 1 }}>
                    Approved entries are selected by default. Uncheck any you
                    do not want on this invoice. Hours and rates come from
                    recorded time and cannot be edited here. Pending and
                    Rejected entries are not selectable.
                  </p>
                  <div className="gi-actions" style={{ margin: 0 }}>
                    <button
                      type="button"
                      className="gi-btn gi-btn--small"
                      onClick={selectAllApprovedTime}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="gi-btn gi-btn--small"
                      onClick={clearAllSelectedTime}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {unbilledTimeEntries.length === 0 ? (
                  <p className="gi-muted">
                    No unbilled time remains for this matter.
                  </p>
                ) : (
                  <div className="gi__table-wrap">
                    <table className="gi-table">
                      <thead>
                        <tr>
                          <th>Include</th>
                          <th>Date</th>
                          <th>Attorney or Staff</th>
                          <th>Description of Work</th>
                          <th>Approval Status</th>
                          <th>Hours</th>
                          <th>Hourly Rate</th>
                          <th>Extended Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unbilledTimeEntries.map((t) => {
                          const approved = isTimeApproved(t);
                          const longNarrative =
                            t.description.length > NARRATIVE_ONE_LINE_CHARS;
                          const isExpanded = expandedTimeIds.has(t.id);
                          return (
                            <tr
                              key={t.id}
                              className={
                                selectedTimeIds.has(t.id)
                                  ? "gi-row--selected"
                                  : undefined
                              }
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={
                                    approved && selectedTimeIds.has(t.id)
                                  }
                                  disabled={!approved}
                                  onChange={() => toggleApprovedTime(t.id)}
                                  aria-label={
                                    approved
                                      ? `Include time by ${t.person}`
                                      : `Cannot include ${t.approvalStatus.toLowerCase()} entry by ${t.person}`
                                  }
                                  title={
                                    approved
                                      ? "Include on invoice"
                                      : "Only Approved entries can be included"
                                  }
                                />
                              </td>
                              <td>{t.date}</td>
                              <td>
                                {t.person}{" "}
                                <span className="gi-chip">{t.role}</span>
                              </td>
                              <td className="gi-desc-cell">
                                <p
                                  className={
                                    longNarrative && !isExpanded
                                      ? "gi-desc gi-desc--clamp"
                                      : "gi-desc"
                                  }
                                >
                                  {t.description}
                                </p>
                                {longNarrative ? (
                                  <button
                                    type="button"
                                    className="gi-desc__toggle"
                                    onClick={() => toggleTimeExpand(t.id)}
                                  >
                                    {isExpanded
                                      ? "Show less"
                                      : "Show full narrative"}
                                  </button>
                                ) : null}
                              </td>
                              <td>
                                <span
                                  className={approvalBadgeClass(
                                    t.approvalStatus,
                                  )}
                                >
                                  {t.approvalStatus}
                                </span>
                              </td>
                              <td>{t.hours.toFixed(1)}</td>
                              <td>{money(t.rate)}</td>
                              <td>
                                {money(extended(t.hours, t.rate))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div
                  className="gi-time-running"
                  aria-live="polite"
                  aria-label="Selected time summary"
                >
                  <div>
                    <span className="gi-time-running__label">
                      Selected entries
                    </span>
                    <strong>{selectedTime.length}</strong>
                  </div>
                  <div>
                    <span className="gi-time-running__label">
                      Total billable hours
                    </span>
                    <strong>{selectedTimeHours.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span className="gi-time-running__label">
                      Total billable amount
                    </span>
                    <strong>{money(timeSubtotal)}</strong>
                  </div>
                </div>

                <div className="gi-time-step-actions">
                  <button
                    type="button"
                    className="gi-btn"
                    onClick={saveDraft}
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="gi-btn"
                    onClick={goBack}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="dashboard__create-btn"
                    onClick={goNext}
                  >
                    Continue
                  </button>
                </div>
              </div>

              <aside
                className="gi-invoice-summary"
                aria-label="Invoice summary"
              >
                <h3 className="gi-subhead" style={{ marginTop: 0 }}>
                  Invoice Summary
                </h3>
                <p className="gi-muted" style={{ marginTop: 0 }}>
                  Updates live as you include approved time entries.
                </p>
                <dl className="gi-invoice-summary__list">
                  <div>
                    <dt>Billable Time</dt>
                    <dd>{money(totals.billableTime)}</dd>
                  </div>
                  <div>
                    <dt>Reimbursable Expenses</dt>
                    <dd>{money(totals.expenses)}</dd>
                  </div>
                  <div>
                    <dt>Write-Downs</dt>
                    <dd>−{money(totals.writeDowns)}</dd>
                  </div>
                  <div>
                    <dt>Retainer Applied</dt>
                    <dd>−{money(totals.retainerApplied)}</dd>
                  </div>
                  <div className="gi-invoice-summary__total">
                    <dt>Estimated Invoice Total</dt>
                    <dd>{money(totals.totalDue)}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
        ) : null}

        {step === 3 && matter ? (
          <div className="gi__stack">
            <p className="gi-muted">
              Approved reimbursable expenses for {matter.matterName}
            </p>
            {approvedExpenses.length === 0 ? (
              <p className="gi-muted">No approved expenses for this matter.</p>
            ) : (
              <div className="gi__table-wrap">
                <table className="gi-table">
                  <thead>
                    <tr>
                      <th>Include</th>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedExpenses.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedExpenseIds.has(e.id)}
                            onChange={() =>
                              toggleId(
                                selectedExpenseIds,
                                setSelectedExpenseIds,
                                e.id,
                              )
                            }
                            aria-label={`Include expense ${e.category}`}
                          />
                        </td>
                        <td>{e.date}</td>
                        <td>{e.category}</td>
                        <td>{e.description}</td>
                        <td>{money(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="gi-subtotal">
              Expense subtotal: <strong>{money(expenseSubtotal)}</strong>
            </p>
          </div>
        ) : null}

        {step === 4 && client && matter ? (
          <div className="gi__stack gi__adjust">
            <p className="gi-muted">
              Apply billing adjustments. Invoice number and dates will be
              generated on the Preview step.
            </p>

            <dl className="gi-kv">
              <div>
                <dt>Retainer available (this matter)</dt>
                <dd>{money(maxRetainer)}</dd>
              </div>
              <div>
                <dt>Approved write-downs</dt>
                <dd>
                  {money(
                    matter.writeDowns
                      .filter((w) => w.approved)
                      .reduce((s, w) => s + w.amount, 0),
                  )}
                </dd>
              </div>
              <div>
                <dt>Courtesy discount (if approved)</dt>
                <dd>{money(matter.courtesyDiscountApproved)}</dd>
              </div>
            </dl>
            {retainerSourceNote ? (
              <p className="gi-muted" style={{ margin: 0 }}>
                {retainerSourceNote}
              </p>
            ) : null}

            <label className="gi__check">
              <input
                type="checkbox"
                checked={applyWriteDowns}
                onChange={(e) => setApplyWriteDowns(e.target.checked)}
              />
              Apply approved write-downs
            </label>
            <label className="gi__check">
              <input
                type="checkbox"
                checked={applyCourtesy}
                onChange={(e) => setApplyCourtesy(e.target.checked)}
              />
              Apply approved courtesy discounts
            </label>

            <label className="gi__field">
              <span>Amount of retainer to apply</span>
              <input
                type="number"
                min={0}
                max={maxRetainer}
                step={50}
                value={retainerToApply}
                onChange={(e) => setRetainerSafe(Number(e.target.value) || 0)}
              />
              <span className="gi-hint">
                Cannot exceed retainer available ({money(maxRetainer)}) or the
                invoice total before retainer.
              </span>
            </label>

            <div className="gi-retainer-box" aria-label="Apply retainer automatically">
              <header className="gi-retainer-box__header">
                <h3 className="gi-subhead" style={{ margin: 0 }}>
                  Apply retainer to amount due
                </h3>
                <p className="gi-muted" style={{ margin: 0 }}>
                  Automatically apply trust/retainer against the invoice amount
                  after write-downs and courtesy discounts. Remaining balance is
                  shown after the application.
                </p>
              </header>

              <dl className="gi-retainer-box__stats">
                <div>
                  <dt>Amount due (before retainer)</dt>
                  <dd>{money(amountDueBeforeRetainer)}</dd>
                </div>
                <div>
                  <dt>Retainer available</dt>
                  <dd>{money(maxRetainer)}</dd>
                </div>
                <div>
                  <dt>Retainer applied</dt>
                  <dd>{money(retainerToApply)}</dd>
                </div>
                <div>
                  <dt>Remaining retainer after applying</dt>
                  <dd className="gi-retainer-box__remaining">
                    {money(remainingRetainer)}
                  </dd>
                </div>
              </dl>

              <p
                className={
                  retainerCoversAmountDue
                    ? "gi-retainer-box__status gi-retainer-box__status--ok"
                    : amountDueBeforeRetainer <= 0
                      ? "gi-retainer-box__status"
                      : "gi-retainer-box__status gi-retainer-box__status--partial"
                }
              >
                {amountDueBeforeRetainer <= 0
                  ? "No amount due after other adjustments — retainer is not required."
                  : retainerCoversAmountDue
                    ? `Retainer is sufficient to cover the full amount due (${money(amountDueBeforeRetainer)}).`
                    : `Retainer is not sufficient for the full amount due. Maximum that can be applied: ${money(maxRetainerApplicable)}.`}
              </p>

              <div className="gi-actions">
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={applyRetainerToCoverAmountDue}
                  disabled={
                    maxRetainer <= 0 || amountDueBeforeRetainer <= 0
                  }
                >
                  {retainerCoversAmountDue
                    ? "Apply retainer to cover amount due"
                    : "Apply available retainer"}
                </button>
                <button
                  type="button"
                  className="gi-btn"
                  onClick={clearRetainerApplication}
                  disabled={retainerToApply <= 0}
                >
                  Clear retainer
                </button>
              </div>
            </div>

            <div className="gi-calc">
              <p>
                Billable time <span>{money(totals.billableTime)}</span>
              </p>
              <p>
                + Reimbursable expenses <span>{money(totals.expenses)}</span>
              </p>
              <p>
                − Write-downs <span>{money(totals.writeDowns)}</span>
              </p>
              <p>
                − Courtesy discounts{" "}
                <span>{money(totals.courtesyDiscount)}</span>
              </p>
              <p>
                − Retainer applied <span>{money(totals.retainerApplied)}</span>
              </p>
              <p className="gi-calc__total">
                = Total invoice amount <span>{money(totals.totalDue)}</span>
              </p>
            </div>
          </div>
        ) : null}

        {step === 5 && client && matter ? (
          <div className="gi__stack">
            <div className="gi-grid-2">
              <label className="gi__field">
                <span>Invoice number (auto)</span>
                <input
                  value={invoiceNumber || "Assigned on preview…"}
                  readOnly
                />
              </label>
              <label className="gi__field">
                <span>Status</span>
                <input value={status} readOnly />
              </label>
              <label className="gi__field">
                <span>Invoice date</span>
                <input
                  type="date"
                  value={invoiceDate || todayIso()}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </label>
              <label className="gi__field">
                <span>Due date</span>
                <input
                  type="date"
                  value={dueDate || plusDaysIso(30)}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
            </div>

            <GenerateInvoicePreview
              client={client}
              matter={matter}
              invoiceNumber={invoiceNumber || "—"}
              invoiceDate={invoiceDate || todayIso()}
              dueDate={dueDate || plusDaysIso(30)}
              status={status}
              timeEntries={selectedTime}
              expenses={selectedExpenses}
              writeDownTotal={writeDownTotal}
              courtesyDiscount={courtesyDiscount}
              retainerApplied={retainerToApply}
              totals={totals}
            />
          </div>
        ) : null}

        {step === 6 && client && matter ? (
          <div className="gi__stack">
            <p className="gi-muted">
              Review actions for invoice{" "}
              <strong>{invoiceNumber || "(generate on preview)"}</strong>.
              Finalizing locks included time entries, records AR of{" "}
              <strong>{money(totals.totalDue)}</strong>, and sets status to{" "}
              <strong>Sent</strong>.
            </p>

            <div className="gi-actions">
              <button type="button" className="gi-btn" onClick={saveDraft}>
                Save Draft
              </button>
              <button
                type="button"
                className="gi-btn"
                onClick={simulateDownload}
              >
                Download PDF
              </button>
              <button type="button" className="gi-btn" onClick={simulateEmail}>
                Email Invoice
              </button>
              <button
                type="button"
                className="gi-btn gi-btn--ghost"
                onClick={cancelWizard}
              >
                Cancel
              </button>
            </div>

            {historySorted.length > 0 ? (
              <div>
                <h3 className="gi-subhead">Invoice history (this session)</h3>
                <div className="gi__table-wrap">
                  <table className="gi-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date created</th>
                        <th>Period</th>
                        <th>Total due</th>
                        <th>Status</th>
                        <th>Locked time entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historySorted.map((h) => (
                        <tr key={h.id}>
                          <td>{h.invoiceNumber}</td>
                          <td>{formatDateTime(h.createdAt)}</td>
                          <td>{h.billingPeriod}</td>
                          <td>{money(h.totalDue)}</td>
                          <td>{h.status}</td>
                          <td>{h.lockedTimeEntryIds.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="gi-finalize">
              <button
                type="button"
                className="gi-btn gi-btn--finalize"
                onClick={() => void finalizeInvoice()}
                disabled={finalizing}
              >
                {finalizing ? "Finalizing…" : "Finalize Invoice"}
              </button>
              <p className="gi-finalize__hint">
                Updates matter retainer (if applied), locks billable time, marks
                the invoice Sent, and adds it to Invoice Management.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="gi__nav">
        <button
          type="button"
          className="gi-btn"
          onClick={goBack}
          disabled={step === 0}
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="dashboard__create-btn"
            onClick={goNext}
          >
            Continue
          </button>
        ) : (
          <Link href={BILLING_ROUTES.dashboard} className="gi-btn gi-btn--ghost">
            Return to Dashboard
          </Link>
        )}
      </div>
    </div>
      </div>
    </div>
  );
}

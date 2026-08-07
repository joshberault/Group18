"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { pushFinalizedInvoiceToClientPortal } from "@/lib/billing/finalize-invoice-to-portal";
import { toIsoDate } from "@/lib/billing/billing-period";
import {
  BILLING_ROUTES,
  invoicesHref,
} from "@/lib/billing/routes";
import { buildReceivablesUrl } from "@/lib/pipeline/contract-to-cash";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
import { checkMatterBillable } from "@/lib/matters/matter-activation-gates";

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

function approvalBadgeVariant(
  status: TimeApprovalStatus,
): "success" | "warning" | "danger" {
  if (status === "Approved") return "success";
  if (status === "Pending") return "warning";
  return "danger";
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
  /** Process Matters → Create Invoice deep link once clients are available. */
  const deepLinkHandledRef = useRef(false);

  const reloadMattersForClient = useCallback(
    async (firmClient: GenerateClient | null) => {
      if (!firmClient) {
        setFirmMatters([]);
        setMattersMessage(null);
        setMattersLoading(false);
        return {
          matters: [] as GenerateMatter[],
          source: "empty" as CatalogSource,
          message: null as string | null,
        };
      }
      setMattersLoading(true);
      setMattersMessage(null);
      const catalog = await loadBillingMattersForClient(firmClient.id);
      setFirmMatters(catalog.matters);
      setMattersMessage(catalog.message);
      setMattersLoading(false);
      return catalog;
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

  async function selectMatter(
    base: GenerateMatter,
    options?: { attorneyOverride?: string | null },
  ) {
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
    const withAttorney =
      options?.attorneyOverride && options.attorneyOverride.trim()
        ? {
            ...base,
            responsibleAttorney: options.attorneyOverride.trim(),
          }
        : base;
    setMatter({ ...withAttorney, timeEntries: [], expenses: [] });

    const billedTime = getInvoicedTimeEntryIds();
    const billedExp = getInvoicedExpenseIds();
    setLockedTimeIds(billedTime);
    setLockedExpenseIds(billedExp);

    const [result, retainer] = await Promise.all([
      hydrateMatterWithModuleWip(withAttorney),
      fetchMatterRetainerBalance(withAttorney.id),
    ]);
    setMatterWipLoading(false);
    const hydrated =
      options?.attorneyOverride && options.attorneyOverride.trim()
        ? {
            ...result.matter,
            responsibleAttorney: options.attorneyOverride.trim(),
          }
        : result.matter;
    setMatterWipMessage(result.message);
    setMatter(hydrated);

    const unbilledCount =
      hydrated.timeEntries.filter(
        (t) => isTimeApproved(t) && !t.billed && !billedTime.has(t.id),
      ).length +
      hydrated.expenses.filter(
        (e) => e.approved && !e.billed && !billedExp.has(e.id),
      ).length;
    if (unbilledCount === 0) {
      setSuccessNote(
        result.message ||
          "There are currently no new approved unbilled time entries or expenses for this matter. You can still create a manual invoice with lines you add later, or finish with retainer/fees as needed.",
      );
    }

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

    const timeIds = hydrated.timeEntries
      .filter(
        (t) => isTimeApproved(t) && !t.billed && !billedTime.has(t.id),
      )
      .map((t) => t.id);
    const expenseIds = hydrated.expenses
      .filter((e) => e.approved && !e.billed && !billedExp.has(e.id))
      .map((e) => e.id);
    setSelectedTimeIds(new Set(timeIds));
    setSelectedExpenseIds(new Set(expenseIds));
  }

  /** Deep-link from Matters: ?clientId=&matterId=&attorney= */
  useEffect(() => {
    if (clientsLoading || deepLinkHandledRef.current || clients.length === 0) {
      return;
    }

    let cancelled = false;

    async function applyDeepLink() {
      let params: URLSearchParams;
      try {
        params = new URLSearchParams(window.location.search);
      } catch {
        deepLinkHandledRef.current = true;
        return;
      }

      const clientIdParam =
        params.get("clientId") || params.get("client_id") || params.get("client");
      const matterIdParam =
        params.get("matterId") || params.get("matter_id") || params.get("matter");
      const attorneyParam = params.get("attorney");

      if (!clientIdParam && !matterIdParam) {
        deepLinkHandledRef.current = true;
        return;
      }

      deepLinkHandledRef.current = true;

      const found = clients.find(
        (c) =>
          c.id === clientIdParam ||
          c.clientId === clientIdParam ||
          (clientIdParam &&
            c.name.toLowerCase() === clientIdParam.toLowerCase()),
      );

      if (!found) {
        setMessages([
          "Could not preselect client from the Matters deep link. Choose a client manually.",
        ]);
        return;
      }

      const enriched = await enrichClientWithRetainerBalance(found);
      if (cancelled) return;

      setClients((list) =>
        list.map((c) => (c.id === enriched.id ? enriched : c)),
      );
      setClient(enriched);
      setSelectedClientId(enriched.id);
      setAutofillName(enriched.name);
      setAutofillClientId(enriched.clientId);
      setAutofillContact(enriched.billingContact);
      setAutofillMethod(enriched.billingMethod);
      setCompleteAmount(String(enriched.trustRetainerBalance));
      setMatter(null);
      setMatterWipMessage(null);
      setMatterRetainerBalance(0);

      const catalog = await reloadMattersForClient(enriched);
      if (cancelled) return;

      if (!matterIdParam) {
        setStep(1);
        setSuccessNote(
          `${enriched.name} is selected from Matters. Choose a legal matter to continue.`,
        );
        return;
      }

      const matterMatch =
        catalog.matters.find((m) => m.id === matterIdParam) ||
        catalog.matters.find(
          (m) =>
            m.matterNumber.toLowerCase() === matterIdParam.toLowerCase() ||
            m.matterName.toLowerCase() === matterIdParam.toLowerCase(),
        );

      if (!matterMatch) {
        setStep(1);
        setMessages([
          "Matter from the deep link was not found for this client. Select a matter below.",
        ]);
        return;
      }

      await selectMatter(matterMatch, {
        attorneyOverride: attorneyParam,
      });
      if (cancelled) return;
      setStep(2);
      setSuccessNote(
        (prev) =>
          prev ||
          `${enriched.name} · ${matterMatch.matterName} preselected from Matters. Approved unbilled time and expenses are loaded (already invoiced lines stay locked).`,
      );
    }

    void applyDeepLink();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link after first client load
  }, [clientsLoading, clients, reloadMattersForClient]);

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
    if (step === 1 && matter) {
      void (async () => {
        const gate = await checkMatterBillable(matter.id);
        if (!gate.allowed) {
          setMessages([gate.reason ?? "Billing is blocked for this matter."]);
          return;
        }
        advanceStep();
      })();
      return;
    }
    advanceStep();
  }

  function advanceStep() {
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

    const gate = await checkMatterBillable(matter.id);
    if (!gate.allowed) {
      setMessages([gate.reason ?? "Billing is blocked for this matter."]);
      return;
    }

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

    const gate = await checkMatterBillable(matter.id);
    if (!gate.allowed) {
      setMessages([gate.reason ?? "Billing is blocked for this matter."]);
      return;
    }

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
      const portalPush = pushFinalizedInvoiceToClientPortal({
        invoiceNumber: number,
        invoiceDate: invDate,
        totalDue: totals.totalDue,
        client,
        matter,
      });
      setManagementLinkNumber(number);
      const retainerNote =
        retainerToApply > 0
          ? ` Applied ${money(retainerToApply)} from matter retainer (remaining ${money(remainingMatterRetainer)}).`
          : "";
      setSuccessNote(
        `${
          portalPush.chargeAdded
            ? `Invoice ${number} finalized as Sent, saved to firm Invoice Management (${saved.count} invoice${saved.count === 1 ? "" : "s"} in catalog), and charged to the client Account Summary. A client notification was sent.`
            : `Invoice ${number} finalized as Sent and saved to firm Invoice Management (${saved.count} invoice${saved.count === 1 ? "" : "s"} in catalog). Client Account Summary already had this invoice charge.`
        }${retainerNote} Use the link below to open it.`,
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

      {/* Step indicator */}
      <nav aria-label="Invoice generation steps">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, index) => {
            const current = index === step;
            const done = index < step;
            return (
              <li
                key={label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                  current &&
                    "border-navy-900 bg-navy-900 text-white shadow-sm",
                  done &&
                    !current &&
                    "border-gray-200 bg-white text-navy-900",
                  !done &&
                    !current &&
                    "border-gray-200 bg-gray-50 text-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold",
                    current && "bg-white/15 text-white",
                    done && !current && "bg-gray-100 text-navy-900",
                    !done && !current && "bg-white text-muted",
                  )}
                >
                  {index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {messages.length > 0 ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <ul className="list-disc space-y-1 pl-5">
            {messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {successNote ? (
        <PipelineHandoffBanner stage="client_billed" title={successNote}>
          {managementLinkNumber ? (
            <p className="mt-1 flex flex-wrap gap-3">
              <PipelineHandoffLink href={invoicesHref({ highlight: managementLinkNumber })}>
                Open {managementLinkNumber} in Invoice Management
              </PipelineHandoffLink>
              {matter ? (
                <PipelineHandoffLink
                  href={buildReceivablesUrl({
                    matterId: matter.id,
                    invoiceNumber: managementLinkNumber,
                  })}
                >
                  Collect payment in Accounts Receivable
                </PipelineHandoffLink>
              ) : null}
            </p>
          ) : null}
        </PipelineHandoffBanner>
      ) : null}

      <Card aria-label={`Step ${step + 1}: ${STEPS[step]}`}>
        <CardHeader>
          <CardTitle>
            Step {step + 1}: {STEPS[step]}
          </CardTitle>
          <CardDescription>
            Complete this step, then continue to build the draft invoice.
          </CardDescription>
        </CardHeader>

        {step === 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Clients are loaded from the CounselFlow Clients module. Select a
                client to continue; matters for that client load on the next
                step.
              </p>
              <Link href="/clients">
                <Button type="button" variant="secondary" size="sm">
                  Open Clients module
                </Button>
              </Link>
            </div>

            {catalogMessage ? (
              <p className="text-sm text-muted" role="status">
                {clientsLoading ? "Loading firm clients…" : catalogMessage}
              </p>
            ) : null}

            <Card className="border-gray-100 bg-gray-50/50" padding="md">
              <CardHeader>
                <CardTitle>Select existing client</CardTitle>
                <CardDescription>
                  Choose a client from firm CRM records. Name and Client ID fill
                  automatically. Adjust billing contact and amounts for this
                  invoice only.
                </CardDescription>
              </CardHeader>

              {selectClientErrors.length > 0 ? (
                <div
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  <ul className="list-disc space-y-1 pl-5">
                    {selectClientErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Select
                    label="Client (existing)"
                    value={selectedClientId}
                    onChange={(e) => void loadClientIntoForm(e.target.value)}
                    disabled={clientsLoading || clients.length === 0}
                    options={[
                      {
                        value: "",
                        label: clientsLoading
                          ? "Loading clients…"
                          : clients.length === 0
                            ? "No clients available"
                            : "Choose a client…",
                      },
                      ...clients.map((c) => ({
                        value: c.id,
                        label: `${c.name} (${c.clientId})`,
                      })),
                    ]}
                  />
                </div>
                <Input label="Client Name" value={autofillName} readOnly />
                <Input label="Client ID" value={autofillClientId} readOnly />
                <Input
                  label="Billing Contact"
                  value={autofillContact}
                  disabled={!selectedClientId}
                  onChange={(e) => setAutofillContact(e.target.value)}
                  placeholder="Contact name"
                />
                <Select
                  label="Billing Method"
                  value={autofillMethod}
                  disabled={!selectedClientId}
                  onChange={(e) =>
                    setAutofillMethod(e.target.value as ClientBillingMethod)
                  }
                  options={[
                    { value: "Hourly", label: "Hourly" },
                    { value: "Fixed Fee", label: "Fixed Fee" },
                    { value: "Retainer", label: "Retainer" },
                  ]}
                />
                <div className="space-y-1.5">
                  <Input
                    label="Trust / Retainer (from matters)"
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
                  <p className="text-xs text-muted">
                    {retainerSourceNote ||
                      "Read-only total of matter retainer balances for this client."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Input
                    label="Suggested retainer apply (optional)"
                    type="number"
                    min={0}
                    step={50}
                    value={prepaidAmount}
                    disabled={!selectedClientId}
                    onChange={(e) => setPrepaidAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted">
                    Optional amount to prefill on the Adjustments step.
                    Application uses the selected matter&apos;s retainer.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void confirmExistingClient()}
                  disabled={!selectedClientId || retainerLoading}
                >
                  Confirm client &amp; amounts
                </Button>
                {client ? (
                  <span className="text-sm text-muted">
                    Selected:{" "}
                    <span className="font-medium text-navy-900">
                      {client.name}
                    </span>
                  </span>
                ) : null}
              </div>
            </Card>
          </div>
        ) : null}

        {step === 1 && client ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Matters for{" "}
                <span className="font-medium text-navy-900">{client.name}</span>{" "}
                — from CounselFlow (matters linked to this client). Selecting a
                matter loads approved unbilled time from Time &amp; Expenses.
              </p>
              <Link href={"/clients/" + client.id}>
                <Button type="button" variant="secondary" size="sm">
                  Open client record
                </Button>
              </Link>
            </div>

            {mattersLoading ? (
              <p className="text-sm text-muted" role="status">
                Loading matters for this client…
              </p>
            ) : null}
            {mattersMessage && !mattersLoading ? (
              <p className="text-sm text-muted" role="status">
                {mattersMessage}
              </p>
            ) : null}
            {matterWipLoading ? (
              <p className="text-sm text-muted" role="status">
                Loading billable time and expenses for the selected matter…
              </p>
            ) : null}
            {matterWipMessage && !matterWipLoading ? (
              <p className="text-sm text-muted" role="status">
                {matterWipMessage}
              </p>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter Name</TableHead>
                  <TableHead>Matter Number</TableHead>
                  <TableHead>Responsible Attorney</TableHead>
                  <TableHead>Matter Status</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>
                    <span className="sr-only">Action</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mattersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted">
                      Loading matters…
                    </TableCell>
                  </TableRow>
                ) : matters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted">
                      {mattersMessage ||
                        "No matters for this client yet. Create a matter linked to this client in CounselFlow, then return here."}
                    </TableCell>
                  </TableRow>
                ) : (
                  matters.map((m) => (
                    <TableRow
                      key={m.id}
                      className={
                        matter?.id === m.id
                          ? "bg-gold-100/40 hover:bg-gold-100/50"
                          : undefined
                      }
                    >
                      <TableCell className="font-medium">
                        {m.matterName}
                      </TableCell>
                      <TableCell>{m.matterNumber}</TableCell>
                      <TableCell>{m.responsibleAttorney}</TableCell>
                      <TableCell>{m.status}</TableCell>
                      <TableCell>{m.billingPeriod}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            matter?.id === m.id ? "primary" : "secondary"
                          }
                          disabled={matterWipLoading}
                          onClick={() => void selectMatter(m)}
                        >
                          {matter?.id === m.id
                            ? matterWipLoading
                              ? "Loading…"
                              : "Selected"
                            : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {step === 2 && client && matter ? (
          <div className="space-y-4">
            {matterWipLoading ? (
              <p className="text-sm text-muted" role="status">
                Loading Time &amp; Expenses for this matter…
              </p>
            ) : null}
            {matterWipMessage && !matterWipLoading ? (
              <p className="text-sm text-muted" role="status">
                {matterWipMessage}
              </p>
            ) : null}

            <dl className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Client Name", client.name],
                ["Matter Name", matter.matterName],
                ["Matter Number", matter.matterNumber],
                ["Responsible Attorney", matter.responsibleAttorney],
                ["Billing Method", client.billingMethod],
                ["Billing Period", matter.billingPeriod],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-navy-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm text-muted">
                    Approved entries are selected by default. Uncheck any you do
                    not want on this invoice. Hours and rates come from recorded
                    time and cannot be edited here. Pending and Rejected entries
                    are not selectable.
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={selectAllApprovedTime}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={clearAllSelectedTime}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {unbilledTimeEntries.length === 0 ? (
                  <p className="text-sm text-muted">
                    No unbilled time remains for this matter.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Include</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Attorney or Staff</TableHead>
                        <TableHead>Description of Work</TableHead>
                        <TableHead>Approval Status</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                        <TableHead>Extended Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unbilledTimeEntries.map((t) => {
                        const approved = isTimeApproved(t);
                        const longNarrative =
                          t.description.length > NARRATIVE_ONE_LINE_CHARS;
                        const isExpanded = expandedTimeIds.has(t.id);
                        return (
                          <TableRow
                            key={t.id}
                            className={
                              selectedTimeIds.has(t.id)
                                ? "bg-gold-100/30"
                                : undefined
                            }
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-700"
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
                            </TableCell>
                            <TableCell>{t.date}</TableCell>
                            <TableCell>
                              <span className="mr-2">{t.person}</span>
                              <Badge variant="neutral">{t.role}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p
                                className={cn(
                                  "text-sm text-navy-900",
                                  longNarrative &&
                                    !isExpanded &&
                                    "line-clamp-2",
                                )}
                              >
                                {t.description}
                              </p>
                              {longNarrative ? (
                                <button
                                  type="button"
                                  className="mt-1 text-xs font-medium text-navy-700 hover:underline"
                                  onClick={() => toggleTimeExpand(t.id)}
                                >
                                  {isExpanded
                                    ? "Show less"
                                    : "Show full narrative"}
                                </button>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={approvalBadgeVariant(t.approvalStatus)}
                              >
                                {t.approvalStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>{t.hours.toFixed(1)}</TableCell>
                            <TableCell>{money(t.rate)}</TableCell>
                            <TableCell>
                              {money(extended(t.hours, t.rate))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

                <div
                  className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3"
                  aria-live="polite"
                  aria-label="Selected time summary"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Selected entries
                    </p>
                    <p className="mt-1 text-lg font-semibold text-navy-900">
                      {selectedTime.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Total billable hours
                    </p>
                    <p className="mt-1 text-lg font-semibold text-navy-900">
                      {selectedTimeHours.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Total billable amount
                    </p>
                    <p className="mt-1 text-lg font-semibold text-navy-900">
                      {money(timeSubtotal)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={saveDraft}>
                    Save Draft
                  </Button>
                  <Button type="button" variant="secondary" onClick={goBack}>
                    Back
                  </Button>
                  <Button type="button" onClick={goNext}>
                    Continue
                  </Button>
                </div>
              </div>

              <aside
                className="h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                aria-label="Invoice summary"
              >
                <h3 className="text-base font-semibold text-navy-900">
                  Invoice Summary
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Updates live as you include approved time entries.
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Billable Time</dt>
                    <dd className="font-medium text-navy-900">
                      {money(totals.billableTime)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Reimbursable Expenses</dt>
                    <dd className="font-medium text-navy-900">
                      {money(totals.expenses)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Write-Downs</dt>
                    <dd className="font-medium text-navy-900">
                      −{money(totals.writeDowns)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted">Retainer Applied</dt>
                    <dd className="font-medium text-navy-900">
                      −{money(totals.retainerApplied)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-gray-200 pt-3">
                    <dt className="font-semibold text-navy-900">
                      Estimated Invoice Total
                    </dt>
                    <dd className="font-semibold text-navy-900">
                      {money(totals.totalDue)}
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
        ) : null}

        {step === 3 && matter ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Approved reimbursable expenses for {matter.matterName}
            </p>
            {approvedExpenses.length === 0 ? (
              <p className="text-sm text-muted">
                No approved expenses for this matter.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Include</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-700"
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
                      </TableCell>
                      <TableCell>{e.date}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{money(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-sm text-navy-900">
              Expense subtotal:{" "}
              <span className="font-semibold">{money(expenseSubtotal)}</span>
            </p>
          </div>
        ) : null}

        {step === 4 && client && matter ? (
          <div className="space-y-6">
            <p className="text-sm text-muted">
              Apply billing adjustments. Invoice number and dates will be
              generated on the Preview step.
            </p>

            <dl className="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Retainer available (this matter)
                </dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">
                  {money(maxRetainer)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Approved write-downs
                </dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">
                  {money(
                    matter.writeDowns
                      .filter((w) => w.approved)
                      .reduce((s, w) => s + w.amount, 0),
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                  Courtesy discount (if approved)
                </dt>
                <dd className="mt-1 text-sm font-semibold text-navy-900">
                  {money(matter.courtesyDiscountApproved)}
                </dd>
              </div>
            </dl>
            {retainerSourceNote ? (
              <p className="text-sm text-muted">{retainerSourceNote}</p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-700"
                checked={applyWriteDowns}
                onChange={(e) => setApplyWriteDowns(e.target.checked)}
              />
              Apply approved write-downs
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-700"
                checked={applyCourtesy}
                onChange={(e) => setApplyCourtesy(e.target.checked)}
              />
              Apply approved courtesy discounts
            </label>

            <div className="max-w-md space-y-1.5">
              <Input
                label="Amount of retainer to apply"
                type="number"
                min={0}
                max={maxRetainer}
                step={50}
                value={retainerToApply}
                onChange={(e) => setRetainerSafe(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted">
                Cannot exceed retainer available ({money(maxRetainer)}) or the
                invoice total before retainer.
              </p>
            </div>

            <Card className="border-gray-100 bg-gray-50/50" padding="md">
              <CardHeader>
                <CardTitle>Apply retainer to amount due</CardTitle>
                <CardDescription>
                  Automatically apply trust/retainer against the invoice amount
                  after write-downs and courtesy discounts. Remaining balance is
                  shown after the application.
                </CardDescription>
              </CardHeader>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Amount due (before retainer)
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">
                    {money(amountDueBeforeRetainer)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Retainer available
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">
                    {money(maxRetainer)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Retainer applied
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">
                    {money(retainerToApply)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Remaining retainer after applying
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-navy-900">
                    {money(remainingRetainer)}
                  </dd>
                </div>
              </dl>

              <p
                className={cn(
                  "mt-4 rounded-lg border px-3 py-2 text-sm",
                  retainerCoversAmountDue
                    ? "border-green-200 bg-green-50 text-green-900"
                    : amountDueBeforeRetainer <= 0
                      ? "border-gray-200 bg-white text-muted"
                      : "border-amber-200 bg-amber-50 text-amber-900",
                )}
              >
                {amountDueBeforeRetainer <= 0
                  ? "No amount due after other adjustments — retainer is not required."
                  : retainerCoversAmountDue
                    ? `Retainer is sufficient to cover the full amount due (${money(amountDueBeforeRetainer)}).`
                    : `Retainer is not sufficient for the full amount due. Maximum that can be applied: ${money(maxRetainerApplicable)}.`}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={applyRetainerToCoverAmountDue}
                  disabled={maxRetainer <= 0 || amountDueBeforeRetainer <= 0}
                >
                  {retainerCoversAmountDue
                    ? "Apply retainer to cover amount due"
                    : "Apply available retainer"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={clearRetainerApplication}
                  disabled={retainerToApply <= 0}
                >
                  Clear retainer
                </Button>
              </div>
            </Card>

            <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted">Billable time</span>
                <span className="font-medium text-navy-900">
                  {money(totals.billableTime)}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted">+ Reimbursable expenses</span>
                <span className="font-medium text-navy-900">
                  {money(totals.expenses)}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted">− Write-downs</span>
                <span className="font-medium text-navy-900">
                  {money(totals.writeDowns)}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted">− Courtesy discounts</span>
                <span className="font-medium text-navy-900">
                  {money(totals.courtesyDiscount)}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-muted">− Retainer applied</span>
                <span className="font-medium text-navy-900">
                  {money(totals.retainerApplied)}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4 border-t border-gray-200 pt-3 text-base">
                <span className="font-semibold text-navy-900">
                  = Total invoice amount
                </span>
                <span className="font-semibold text-navy-900">
                  {money(totals.totalDue)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 && client && matter ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Invoice number (auto)"
                value={invoiceNumber || "Assigned on preview…"}
                readOnly
              />
              <Input label="Status" value={status} readOnly />
              <Input
                label="Invoice date"
                type="date"
                value={invoiceDate || todayIso()}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
              <Input
                label="Due date"
                type="date"
                value={dueDate || plusDaysIso(30)}
                onChange={(e) => setDueDate(e.target.value)}
              />
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
          <div className="space-y-6">
            <p className="text-sm text-muted">
              Review actions for invoice{" "}
              <span className="font-medium text-navy-900">
                {invoiceNumber || "(generate on preview)"}
              </span>
              . Finalizing locks included time entries, records AR of{" "}
              <span className="font-medium text-navy-900">
                {money(totals.totalDue)}
              </span>
              , and sets status to{" "}
              <span className="font-medium text-navy-900">Sent</span>.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={saveDraft}>
                Save Draft
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={simulateDownload}
              >
                Download PDF
              </Button>
              <Button type="button" variant="secondary" onClick={simulateEmail}>
                Email Invoice
              </Button>
              <Button type="button" variant="ghost" onClick={cancelWizard}>
                Cancel
              </Button>
            </div>

            {historySorted.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-navy-900">
                  Invoice history (this session)
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date created</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Total due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Locked time entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historySorted.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>{h.invoiceNumber}</TableCell>
                        <TableCell>{formatDateTime(h.createdAt)}</TableCell>
                        <TableCell>{h.billingPeriod}</TableCell>
                        <TableCell>{money(h.totalDue)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              h.status === "Sent" ? "success" : "neutral"
                            }
                          >
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{h.lockedTimeEntryIds.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <Button
                type="button"
                size="lg"
                onClick={() => void finalizeInvoice()}
                disabled={finalizing}
              >
                {finalizing ? "Finalizing…" : "Finalize Invoice"}
              </Button>
              <p className="mt-2 text-xs text-muted">
                Updates matter retainer (if applied), locks billable time, marks
                the invoice Sent, and adds it to Invoice Management.
              </p>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={goBack}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Link href={BILLING_ROUTES.dashboard}>
            <Button type="button" variant="ghost">
              Return to Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

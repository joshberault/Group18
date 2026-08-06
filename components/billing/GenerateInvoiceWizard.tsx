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
  MatterStatus,
  TimeApprovalStatus,
  UnbilledTimeEntry,
} from "@/lib/billing/generate-invoice-types";
import {
  allocateNextInvoiceNumber,
  buildManagedInvoiceFromGeneration,
  upsertGeneratedInvoice,
} from "@/lib/billing/invoice-management-store";
import {
  type CatalogSource,
  loadBillingClients,
  loadBillingMattersForClient,
} from "@/lib/billing/counselflow-catalog";
import { pushFinalizedInvoiceToClientPortal } from "@/lib/billing/finalize-invoice-to-portal";
import { toIsoDate } from "@/lib/billing/billing-period";
import {
  BILLING_ROUTES,
  invoicesHref,
} from "@/lib/billing/routes";

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

const MATTER_NAME_OPTIONS = [
  "General Corporate Counsel",
  "Mergers & Acquisitions",
  "Employment Compliance",
  "Commercial Litigation",
  "Real Estate / Leasing",
  "Intellectual Property",
  "Regulatory Defense",
  "Contract Negotiation",
  "Corporate Financing",
  "Other / write your own",
] as const;

const ATTORNEY_OPTIONS = [
  "Elena Vargas",
  "Marcus Hale",
  "Priya Shah",
  "Jonah Reed",
  "Camille Ortiz",
] as const;

function emptyMatterForm() {
  const period = new Date().toISOString().slice(0, 7);
  return {
    matterTemplate: MATTER_NAME_OPTIONS[0] as string,
    customMatterName: "",
    matterNumber: "",
    responsibleAttorney: ATTORNEY_OPTIONS[0] as string,
    status: "Open" as MatterStatus,
    billingPeriod: period,
  };
}

function createMatterWithSeed(
  clientId: string,
  matterName: string,
  matterNumber: string,
  attorney: string,
  status: MatterStatus,
  billingPeriod: string,
): GenerateMatter {
  const id = `gm-manual-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  return {
    id,
    clientId,
    matterName,
    matterNumber:
      matterNumber.trim() ||
      `NV-M-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    responsibleAttorney: attorney,
    status,
    billingPeriod,
    timeEntries: [
      {
        id: `${id}-t1`,
        date: today,
        person: attorney,
        role: "Attorney",
        description: `Work on ${matterName}`,
        hours: 2.0,
        rate: 520,
        approvalStatus: "Approved",
        billed: false,
      },
      {
        id: `${id}-t2`,
        date: today,
        person: "Alex Chen",
        role: "Staff",
        description: "Matter setup and document indexing",
        hours: 1.5,
        rate: 185,
        approvalStatus: "Approved",
        billed: false,
      },
    ],
    expenses: [
      {
        id: `${id}-e1`,
        date: today,
        category: "Legal Research Charges",
        description: "Research related to new matter",
        amount: 150,
        approved: true,
        billed: false,
      },
    ],
    writeDowns: [],
    courtesyDiscountApproved: 0,
  };
}

function emptyClientForm() {
  return {
    name: "",
    /** Digits after fixed CLT- prefix (same length as firm clients, e.g. CLT-10042) */
    clientIdBody: "",
    billingContact: "",
    billingMethod: "Hourly" as ClientBillingMethod,
    trustRetainerBalance: "0",
    email: "",
    phone: "",
    address: "",
  };
}

/** Matches seed clients such as CLT-10042 */
const CLIENT_ID_PREFIX = "CLT-";
const CLIENT_ID_BODY_LENGTH = 5;

function buildClientId(body: string): string {
  return `${CLIENT_ID_PREFIX}${body}`;
}

function sanitizeClientIdBody(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, CLIENT_ID_BODY_LENGTH);
}

function clientIdBodyFromFull(clientId: string): string {
  if (clientId.startsWith(CLIENT_ID_PREFIX)) {
    return sanitizeClientIdBody(clientId.slice(CLIENT_ID_PREFIX.length));
  }
  return sanitizeClientIdBody(clientId);
}

/** Clients created in this Generate Invoice session */
function isSessionClient(client: GenerateClient): boolean {
  return client.id.startsWith("gc-custom-");
}

/**
 * Matters created during this invoice workflow (Add legal matter or new-client starter).
 * CounselFlow / seed firm matters are never editable here.
 */
function isSessionCreatedMatter(matter: GenerateMatter): boolean {
  return (
    matter.id.startsWith("gm-manual-") || matter.id.startsWith("gm-new-")
  );
}

/** Required phone format: xxx-xxx-xxxx */
const PHONE_FORMAT = /^\d{3}-\d{3}-\d{4}$/;

/** Format digit input as xxx-xxx-xxxx while typing. */
function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidPhone(phone: string): boolean {
  return PHONE_FORMAT.test(phone.trim());
}

function createStarterMatter(clientId: string, clientName: string): GenerateMatter {
  const period = new Date().toISOString().slice(0, 7);
  return {
    id: `gm-new-${clientId}`,
    clientId,
    matterName: `${clientName} — General Counsel`,
    matterNumber: `NV-M-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    responsibleAttorney: "Elena Vargas",
    status: "Open",
    billingPeriod: period,
    timeEntries: [
      {
        id: `gt-new-${clientId}-1`,
        date: new Date().toISOString().slice(0, 10),
        person: "Elena Vargas",
        role: "Attorney",
        description: "Initial matter intake and billing setup",
        hours: 1.5,
        rate: 650,
        approvalStatus: "Approved",
        billed: false,
      },
      {
        id: `gt-new-${clientId}-2`,
        date: new Date().toISOString().slice(0, 10),
        person: "Alex Chen",
        role: "Staff",
        description: "Client file setup and retainer memorandum",
        hours: 2.0,
        rate: 185,
        approvalStatus: "Approved",
        billed: false,
      },
    ],
    expenses: [
      {
        id: `ge-new-${clientId}-1`,
        date: new Date().toISOString().slice(0, 10),
        category: "Postage",
        description: "Engagement letter courier",
        amount: 45,
        approved: true,
        billed: false,
      },
    ],
    writeDowns: [],
    courtesyDiscountApproved: 0,
  };
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
  const [extraMatters, setExtraMatters] = useState<GenerateMatter[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClientForm, setNewClientForm] = useState(emptyClientForm);
  const [addClientErrors, setAddClientErrors] = useState<string[]>([]);
  const [showAddMatter, setShowAddMatter] = useState(false);
  const [editingMatterId, setEditingMatterId] = useState<string | null>(null);
  const [newMatterForm, setNewMatterForm] = useState(emptyMatterForm);
  const [addMatterErrors, setAddMatterErrors] = useState<string[]>([]);
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
  const [lockedTimeIds, setLockedTimeIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<string[]>([]);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [managementLinkNumber, setManagementLinkNumber] = useState<string | null>(
    null,
  );
  const [expandedTimeIds, setExpandedTimeIds] = useState<Set<string>>(
    new Set(),
  );

  /** Session-only “add client” when firm directory is empty or offline seed. */
  const allowSessionClients =
    catalogSource !== "counselflow" || clients.every(isSessionClient);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setClientsLoading(true);
      const catalog = await loadBillingClients();
      if (cancelled) return;
      setClients(catalog.clients);
      setCatalogSource(catalog.source);
      setCatalogMessage(catalog.message);
      setClientsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const catalog = await loadBillingMattersForClient(firmClient.id, {
        catalogSource,
      });
      setFirmMatters(catalog.matters);
      setMattersMessage(catalog.message);
      setMattersLoading(false);
    },
    [catalogSource],
  );

  const matters = useMemo(() => {
    if (!client) return [];
    const added = extraMatters.filter((m) => m.clientId === client.id);
    // Firm/seed matters first, then session-added for this client
    const firmIds = new Set(firmMatters.map((m) => m.id));
    return [
      ...firmMatters,
      ...added.filter((m) => !firmIds.has(m.id)),
    ];
  }, [client, firmMatters, extraMatters]);

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
    return matter.expenses.filter((e) => e.approved && !e.billed);
  }, [matter]);

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

  const maxRetainer = client?.trustRetainerBalance ?? 0;

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
    setSelectedTimeIds(new Set());
    setSelectedExpenseIds(new Set());
    setRetainerToApply(0);
    setMessages([]);
    setSuccessNote(null);
    setStatus("Draft");
    setSelectClientErrors([]);
    // Invoice # and dates stay unset until preview (step 6)
    setInvoiceNumber("");
    setInvoiceDate("");
    setDueDate("");
    void reloadMattersForClient(next);
  }

  function loadClientIntoForm(clientId: string) {
    setSelectedClientId(clientId);
    setSelectClientErrors([]);
    setClient(null);
    setFirmMatters([]);
    setMattersMessage(null);
    if (!clientId) {
      setAutofillName("");
      setAutofillClientId("");
      setAutofillContact("");
      setAutofillMethod("Hourly");
      setCompleteAmount("");
      setPrepaidAmount("");
      return;
    }
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;
    setAutofillName(found.name);
    setAutofillClientId(found.clientId);
    setAutofillContact(found.billingContact);
    setAutofillMethod(found.billingMethod);
    setCompleteAmount(String(found.trustRetainerBalance));
    setPrepaidAmount("");
  }

  function confirmExistingClient() {
    const errors: string[] = [];
    if (!selectedClientId) {
      errors.push("Select an existing client from the dropdown.");
    }
    const trust = Number(completeAmount);
    const prepaid = Number(prepaidAmount || "0");
    if (completeAmount.trim() === "" || Number.isNaN(trust) || trust < 0) {
      errors.push(
        "Enter the trust / retainer balance amount (0 or greater).",
      );
    }
    if (Number.isNaN(prepaid) || prepaid < 0) {
      errors.push("Prepaid / deposit amount must be 0 or greater.");
    }
    if (errors.length) {
      setSelectClientErrors(errors);
      return;
    }

    const found = clients.find((c) => c.id === selectedClientId);
    if (!found) {
      setSelectClientErrors(["That client could not be found."]);
      return;
    }

    const contact = autofillContact.trim();
    if (!contact) {
      setSelectClientErrors(["Billing contact is required."]);
      return;
    }

    const updated: GenerateClient = {
      ...found,
      billingContact: contact,
      billingMethod: autofillMethod,
      trustRetainerBalance: trust,
    };
    setClients((list) =>
      list.map((c) => (c.id === updated.id ? updated : c)),
    );
    selectClient(updated);
    // Seed suggested retainer apply from prepaid when later on adjustments
    if (prepaid > 0) {
      setRetainerToApply(Math.min(prepaid, trust));
    }
    setSuccessNote(
      `${updated.name} is selected. Client ID, name, and billing contact were filled from the firm record. You entered trust/retainer of ${money(trust)}${prepaid > 0 ? ` and prepaid deposit of ${money(prepaid)}` : ""}.`,
    );
  }

  function closeClientForm() {
    setShowAddClient(false);
    setEditingClientId(null);
    setAddClientErrors([]);
    setNewClientForm(emptyClientForm());
  }

  function openAddClientForm() {
    if (!allowSessionClients) {
      setMessages([
        "Clients come from the CounselFlow Clients module. Add or edit clients there, then return to Generate Invoice.",
      ]);
      return;
    }
    setEditingClientId(null);
    setNewClientForm(emptyClientForm());
    setAddClientErrors([]);
    setShowAddClient(true);
    setSuccessNote(null);
  }

  function openEditClientForm(target: GenerateClient) {
    if (!isSessionClient(target)) {
      setMessages([
        "Firm directory clients are edited via Billing Contact and amounts when selected above. Full profile edit is available for clients you added during this invoice.",
      ]);
      return;
    }
    setEditingClientId(target.id);
    setNewClientForm({
      name: target.name,
      clientIdBody: clientIdBodyFromFull(target.clientId),
      billingContact: target.billingContact,
      billingMethod: target.billingMethod,
      trustRetainerBalance: String(target.trustRetainerBalance),
      email: target.email,
      phone: formatPhoneInput(target.phone),
      address: target.address,
    });
    setAddClientErrors([]);
    setShowAddClient(true);
    setSuccessNote(null);
    setMessages([]);
  }

  function submitNewClient() {
    const errors: string[] = [];
    const name = newClientForm.name.trim();
    const clientIdBody = sanitizeClientIdBody(newClientForm.clientIdBody);
    const clientId = buildClientId(clientIdBody);
    const billingContact = newClientForm.billingContact.trim();
    const email = newClientForm.email.trim();
    const phone = newClientForm.phone.trim();
    const address = newClientForm.address.trim();
    const trust = Number(newClientForm.trustRetainerBalance);
    const isEdit = Boolean(editingClientId);

    if (!name) errors.push("Client name is required.");
    if (clientIdBody.length !== CLIENT_ID_BODY_LENGTH) {
      errors.push(
        `Client ID must be ${CLIENT_ID_PREFIX} followed by exactly ${CLIENT_ID_BODY_LENGTH} digits (e.g. ${CLIENT_ID_PREFIX}10200).`,
      );
    }
    if (!billingContact) errors.push("Billing contact is required.");
    if (!phone) {
      errors.push("Phone number is required.");
    } else if (!isValidPhone(phone)) {
      errors.push("Phone number must be in the format xxx-xxx-xxxx.");
    }
    if (!newClientForm.billingMethod) {
      errors.push("Billing method is required.");
    }
    if (Number.isNaN(trust) || trust < 0) {
      errors.push("Trust/retainer balance must be zero or a positive amount.");
    }
    if (
      clientIdBody.length === CLIENT_ID_BODY_LENGTH &&
      clients.some(
        (c) =>
          c.clientId.toLowerCase() === clientId.toLowerCase() &&
          c.id !== editingClientId,
      )
    ) {
      errors.push("That Client ID is already in use.");
    }

    if (errors.length) {
      setAddClientErrors(errors);
      return;
    }

    if (isEdit && editingClientId) {
      const previous = clients.find((c) => c.id === editingClientId);
      if (!previous || !isSessionClient(previous)) {
        setAddClientErrors(["This client can no longer be edited here."]);
        return;
      }
      const updated: GenerateClient = {
        ...previous,
        clientId,
        name,
        billingContact,
        billingMethod: newClientForm.billingMethod,
        trustRetainerBalance: trust,
        email: email || previous.email,
        phone,
        address: address || previous.address,
      };
      setClients((list) =>
        list.map((c) => (c.id === updated.id ? updated : c)),
      );
      if (client?.id === updated.id || selectedClientId === updated.id) {
        selectClient(updated);
        setCompleteAmount(String(trust));
      }
      closeClientForm();
      setSuccessNote(
        `${name} was updated. Changes apply to this invoice workflow.`,
      );
      return;
    }

    const id = `gc-custom-${Date.now()}`;
    const created: GenerateClient = {
      id,
      clientId,
      name,
      billingContact,
      billingMethod: newClientForm.billingMethod,
      trustRetainerBalance: trust,
      email: email || "billing@client.example",
      phone,
      address: address || "Address on file",
    };

    setClients((list) => [created, ...list]);
    setExtraMatters((list) => [
      createStarterMatter(id, name),
      ...list,
    ]);
    selectClient(created);
    setCompleteAmount(String(trust));
    closeClientForm();
    setSuccessNote(
      `${name} was added and selected. A starter open matter with unbilled time was created so you can continue the invoice workflow. You can return to this step anytime to edit the client.`,
    );
  }

  function closeMatterForm() {
    setShowAddMatter(false);
    setEditingMatterId(null);
    setAddMatterErrors([]);
    setNewMatterForm(emptyMatterForm());
  }

  function openAddMatterForm() {
    setEditingMatterId(null);
    setNewMatterForm(emptyMatterForm());
    setAddMatterErrors([]);
    setShowAddMatter(true);
    setSuccessNote(null);
  }

  function openEditMatterForm(target: GenerateMatter) {
    // Existing firm / seed matters cannot be edited — only session-created ones
    if (
      !isSessionCreatedMatter(target) ||
      !extraMatters.some((m) => m.id === target.id)
    ) {
      setMessages([
        "Existing firm legal matters cannot be edited. Select the matter to use it on this invoice, or use Add legal matter to create a new one.",
      ]);
      setSuccessNote(null);
      return;
    }
    const knownTemplate = MATTER_NAME_OPTIONS.find(
      (opt) =>
        opt !== "Other / write your own" && opt === target.matterName,
    );
    setEditingMatterId(target.id);
    setNewMatterForm({
      matterTemplate: knownTemplate ?? "Other / write your own",
      customMatterName: knownTemplate ? "" : target.matterName,
      matterNumber: target.matterNumber,
      responsibleAttorney: (ATTORNEY_OPTIONS as readonly string[]).includes(
        target.responsibleAttorney,
      )
        ? target.responsibleAttorney
        : ATTORNEY_OPTIONS[0],
      status: target.status,
      billingPeriod: target.billingPeriod,
    });
    setAddMatterErrors([]);
    setShowAddMatter(true);
    setSuccessNote(null);
    setMessages([]);
  }

  function applyMatterUpdate(updated: GenerateMatter) {
    setExtraMatters((list) =>
      list.map((m) => (m.id === updated.id ? updated : m)),
    );
    if (matter?.id === updated.id) {
      setMatter(updated);
      // Keep selections that still exist on the matter
      setSelectedTimeIds((prev) => {
        const valid = new Set(
          updated.timeEntries
            .filter(
              (t) =>
                isTimeApproved(t) &&
                !t.billed &&
                !lockedTimeIds.has(t.id) &&
                prev.has(t.id),
            )
            .map((t) => t.id),
        );
        return valid.size > 0
          ? valid
          : new Set(
              updated.timeEntries
                .filter(
                  (t) =>
                    isTimeApproved(t) &&
                    !t.billed &&
                    !lockedTimeIds.has(t.id),
                )
                .map((t) => t.id),
            );
      });
      setSelectedExpenseIds((prev) => {
        const valid = new Set(
          updated.expenses
            .filter((e) => e.approved && !e.billed && prev.has(e.id))
            .map((e) => e.id),
        );
        return valid.size > 0
          ? valid
          : new Set(
              updated.expenses
                .filter((e) => e.approved && !e.billed)
                .map((e) => e.id),
            );
      });
    } else {
      selectMatter(updated);
    }
  }

  function submitNewMatter() {
    if (!client) {
      setAddMatterErrors(["Select a client in Step 1 before adding a matter."]);
      return;
    }

    const isOther =
      newMatterForm.matterTemplate === "Other / write your own";
    const matterName = isOther
      ? newMatterForm.customMatterName.trim()
      : newMatterForm.matterTemplate.trim();
    const errors: string[] = [];

    if (!matterName) {
      errors.push(
        isOther
          ? "Enter a custom matter name, or choose a template from the dropdown."
          : "Select a matter type from the dropdown.",
      );
    }
    if (!newMatterForm.responsibleAttorney) {
      errors.push("Responsible attorney is required.");
    }
    if (!newMatterForm.billingPeriod.trim()) {
      errors.push("Billing period is required (YYYY-MM).");
    }
    if (
      !/^\d{4}-\d{2}$/.test(newMatterForm.billingPeriod.trim()) &&
      newMatterForm.billingPeriod.trim()
    ) {
      errors.push("Billing period should look like 2026-07.");
    }

    const resolvedNumber =
      newMatterForm.matterNumber.trim() ||
      `NV-M-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    if (
      matters.some(
        (m) =>
          m.id !== editingMatterId &&
          (m.matterNumber.toLowerCase() === resolvedNumber.toLowerCase() ||
            (m.matterName.toLowerCase() === matterName.toLowerCase() &&
              m.billingPeriod === newMatterForm.billingPeriod.trim())),
      )
    ) {
      errors.push(
        "A matter with this number or the same name and billing period already exists for this client.",
      );
    }

    if (errors.length) {
      setAddMatterErrors(errors);
      return;
    }

    if (editingMatterId) {
      const existing = extraMatters.find((m) => m.id === editingMatterId);
      if (!existing || !isSessionCreatedMatter(existing)) {
        setAddMatterErrors([
          "Existing firm legal matters cannot be edited. Cancel and select the matter as-is, or add a new legal matter.",
        ]);
        return;
      }
      const updated: GenerateMatter = {
        ...existing,
        matterName,
        matterNumber: resolvedNumber,
        responsibleAttorney: newMatterForm.responsibleAttorney,
        status: newMatterForm.status,
        billingPeriod: newMatterForm.billingPeriod.trim(),
      };
      applyMatterUpdate(updated);
      closeMatterForm();
      setSuccessNote(
        `Matter “${matterName}” was updated. You can continue this invoice or revise further on any prior step.`,
      );
      return;
    }

    const created = createMatterWithSeed(
      client.id,
      matterName,
      resolvedNumber,
      newMatterForm.responsibleAttorney,
      newMatterForm.status,
      newMatterForm.billingPeriod.trim(),
    );

    setExtraMatters((list) => [created, ...list]);
    selectMatter(created);
    closeMatterForm();
    setSuccessNote(
      `Matter “${matterName}” was added for ${client.name} and selected for this invoice. You can return and edit it anytime before finalizing.`,
    );
  }

  function selectMatter(next: GenerateMatter) {
    setMatter(next);
    setExpandedTimeIds(new Set());
    const timeIds = next.timeEntries
      .filter(
        (t) =>
          isTimeApproved(t) && !t.billed && !lockedTimeIds.has(t.id),
      )
      .map((t) => t.id);
    const expenseIds = next.expenses
      .filter((e) => e.approved && !e.billed)
      .map((e) => e.id);
    setSelectedTimeIds(new Set(timeIds));
    setSelectedExpenseIds(new Set(expenseIds));
    setRetainerToApply(0);
    setApplyWriteDowns(true);
    setApplyCourtesy(true);
    setMessages([]);
    setSuccessNote(null);
    setStatus("Draft");
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
    if (step === 2 && selectedTime.length === 0) {
      setMessages([
        "Include at least one approved billable time entry, or return to pick a matter with unbilled time.",
      ]);
      return;
    }
    // Step 5 (index 4) → Preview Step 6: generate invoice # and dates for the first time
    if (step === 4) {
      if (!invoiceDate) setInvoiceDate(todayIso());
      if (!dueDate) setDueDate(plusDaysIso(30));
      if (!invoiceNumber) {
        setInvoiceNumber(allocateNextInvoiceNumber());
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

  function saveDraft() {
    const errs = validateForPreviewOrLater();
    if (errs.length) {
      setMessages(errs);
      return;
    }
    if (!client || !matter) return;

    const number = invoiceNumber || allocateNextInvoiceNumber();
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

    const saved = upsertGeneratedInvoice(
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
        `Draft ${number} saved to Invoice Management (${saved.count} generated invoice${saved.count === 1 ? "" : "s"} stored). Time entries remain billable until finalized.`,
      );
      setMessages([]);
    } else {
      setManagementLinkNumber(null);
      setMessages([
        `Could not save draft ${number} to Invoice Management: ${saved.error || "unknown error"}. Try again or check browser storage settings.`,
      ]);
      setSuccessNote(null);
    }
  }

  function finalizeInvoice() {
    const errs = validateForPreviewOrLater();
    if (errs.length) {
      setMessages(errs);
      return;
    }
    if (!client || !matter) return;

    // Resolve identities before any state clears — avoids empty/ stale dates
    const number = invoiceNumber || allocateNextInvoiceNumber();
    const invDate = invoiceDate || todayIso();
    const due = dueDate || plusDaysIso(30);

    const locked = selectedTime.map((t) => t.id);
    setLockedTimeIds((prev) => new Set([...prev, ...locked]));

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

    const managed = buildManagedInvoiceFromGeneration({
      id: record.id,
      invoiceNumber: number,
      invoiceDate: invDate,
      dueDate: due,
      status: "Sent",
      client,
      matter,
      timeEntries: selectedTime,
      expenses: selectedExpenses,
      applyWriteDowns,
      courtesyDiscount,
      totals,
    });

    const saved = upsertGeneratedInvoice(managed);

    setInvoiceHistory((h) => {
      const without = h.filter((row) => row.invoiceNumber !== number);
      return [...without, record];
    });
    setStatus("Sent");
    setInvoiceNumber(number);
    setInvoiceDate(invDate);
    setDueDate(due);

    if (saved.ok) {
      const portalPush = pushFinalizedInvoiceToClientPortal({
        invoiceNumber: number,
        invoiceDate: invDate,
        totalDue: totals.totalDue,
        client,
        matter,
      });
      setManagementLinkNumber(number);
      setSuccessNote(
        portalPush.chargeAdded
          ? `Invoice ${number} finalized as Sent, added to Invoice Management, and charged to the client Account Summary (${saved.count} generated invoice${saved.count === 1 ? "" : "s"} stored). A client notification was sent.`
          : `Invoice ${number} finalized as Sent and added to Invoice Management (${saved.count} generated invoice${saved.count === 1 ? "" : "s"} stored). Client Account Summary already had this invoice charge.`,
      );
      setMessages([]);
    } else {
      setManagementLinkNumber(null);
      setSuccessNote(null);
      setMessages([
        `Invoice ${number} finalized in this session, but could not be written to Invoice Management storage: ${saved.error || "unknown error"}. Check browser privacy/storage settings and try Finalize again.`,
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
    <div className="dashboard gi">
      <header className="dashboard__hero">
        <div className="dashboard__brand-block">
          <p className="dashboard__firm">North &amp; Vale LLP · Billing</p>
          <p className="page-back">
            <Link href={BILLING_ROUTES.dashboard}>← Billing Dashboard</Link>
          </p>
          <h1 className="dashboard__title">Generate Invoice</h1>
          <p className="dashboard__lede">
            Create invoices from completed legal work — select client and
            matter, pull approved time and expenses, adjust, preview, then
            finalize.
          </p>
        </div>
        <p className="dashboard__source" role="status">
          Workflow:{" "}
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
        </p>
      </header>

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
                {catalogSource === "counselflow"
                  ? "Clients are loaded from the CounselFlow Clients module. Select a client to continue; matters for that client load on the next step."
                  : "Select an existing client to autofill basic details, then complete the invoice amounts. Invoice number and dates appear only on the Preview step."}
              </p>
              {allowSessionClients ? (
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={() => {
                    if (showAddClient) {
                      closeClientForm();
                    } else {
                      openAddClientForm();
                    }
                  }}
                >
                  {showAddClient ? "Close form" : "Add client"}
                </button>
              ) : (
                <Link
                  href="/clients"
                  className="dashboard__create-btn"
                  style={{ display: "inline-flex", textDecoration: "none" }}
                >
                  Open Clients module
                </Link>
              )}
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
                  {catalogSource === "counselflow"
                    ? "Choose a client from firm CRM records. Name and Client ID fill automatically. Adjust billing contact and amounts for this invoice only."
                    : "Choose a client from the list. Name and Client ID fill automatically. Edit Billing Contact if needed, then complete the money amounts for this invoice."}
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
                    onChange={(e) => loadClientIntoForm(e.target.value)}
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
                  <span>Trust / Retainer Balance</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={completeAmount}
                    disabled={!selectedClientId}
                    onChange={(e) => setCompleteAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </label>
                <label className="gi__field">
                  <span>Prepaid / Deposit for this invoice</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={prepaidAmount}
                    disabled={!selectedClientId}
                    onChange={(e) => setPrepaidAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div className="gi-actions">
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={confirmExistingClient}
                  disabled={!selectedClientId}
                >
                  Confirm client &amp; amounts
                </button>
                {selectedClientId &&
                clients.some(
                  (c) => c.id === selectedClientId && isSessionClient(c),
                ) ? (
                  <button
                    type="button"
                    className="gi-btn"
                    onClick={() => {
                      const target = clients.find(
                        (c) => c.id === selectedClientId,
                      );
                      if (target) openEditClientForm(target);
                    }}
                  >
                    Edit client details
                  </button>
                ) : null}
                {client ? (
                  <span className="gi-muted">
                    Selected: <strong>{client.name}</strong>
                    {isSessionClient(client) ? " (added this session)" : ""}
                  </span>
                ) : null}
              </div>
            </div>

            {showAddClient ? (
              <div
                className="gi-add-client panel"
                aria-label={
                  editingClientId ? "Edit client" : "Add new client"
                }
              >
                <header className="panel__header">
                  <h3 className="gi-subhead" style={{ margin: 0 }}>
                    {editingClientId ? "Edit client" : "Add client"}
                  </h3>
                  <p>
                    {editingClientId
                      ? "Update billing details for this client. Changes apply immediately to the rest of this invoice."
                      : "Enter billing details for a client not already in the firm list. You can return later in this workflow to edit them."}
                  </p>
                </header>

                {addClientErrors.length > 0 ? (
                  <div className="gi__alert" role="alert">
                    <ul>
                      {addClientErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="gi-add-client__grid">
                  <label className="gi__field">
                    <span>Client Name</span>
                    <input
                      value={newClientForm.name}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Summit Holdings LLC"
                    />
                  </label>
                  <label className="gi__field">
                    <span>Client ID</span>
                    <div className="gi-client-id">
                      <span className="gi-client-id__prefix" aria-hidden="true">
                        {CLIENT_ID_PREFIX}
                      </span>
                      <input
                        className="gi-client-id__body"
                        value={newClientForm.clientIdBody}
                        onChange={(e) =>
                          setNewClientForm((f) => ({
                            ...f,
                            clientIdBody: sanitizeClientIdBody(e.target.value),
                          }))
                        }
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={CLIENT_ID_BODY_LENGTH}
                        placeholder="10200"
                        aria-label={`Client ID digits after ${CLIENT_ID_PREFIX}`}
                      />
                    </div>
                    <span className="gi-field-hint">
                      Prefix {CLIENT_ID_PREFIX} is fixed. Enter exactly{" "}
                      {CLIENT_ID_BODY_LENGTH} digits (e.g. CLT-10200).
                    </span>
                  </label>
                  <label className="gi__field">
                    <span>Billing Contact</span>
                    <input
                      value={newClientForm.billingContact}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          billingContact: e.target.value,
                        }))
                      }
                      placeholder="e.g. Pat Rivera, GC"
                    />
                  </label>
                  <label className="gi__field">
                    <span>Billing Method</span>
                    <select
                      value={newClientForm.billingMethod}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          billingMethod: e.target
                            .value as ClientBillingMethod,
                        }))
                      }
                    >
                      <option value="Hourly">Hourly</option>
                      <option value="Fixed Fee">Fixed Fee</option>
                      <option value="Retainer">Retainer</option>
                    </select>
                  </label>
                  <label className="gi__field">
                    <span>Current Trust / Retainer Balance</span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={newClientForm.trustRetainerBalance}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          trustRetainerBalance: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="gi__field">
                    <span>Billing email</span>
                    <input
                      type="email"
                      value={newClientForm.email}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          email: e.target.value,
                        }))
                      }
                      placeholder="ap@client.com"
                    />
                  </label>
                  <label className="gi__field">
                    <span>Phone (required)</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={newClientForm.phone}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          phone: formatPhoneInput(e.target.value),
                        }))
                      }
                      placeholder="xxx-xxx-xxxx"
                      maxLength={12}
                      pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                      required
                      aria-required="true"
                    />
                    <span className="gi-field-hint">
                      Format: xxx-xxx-xxxx (10 digits)
                    </span>
                  </label>
                  <label className="gi__field gi-add-client__wide">
                    <span>Billing address</span>
                    <input
                      value={newClientForm.address}
                      onChange={(e) =>
                        setNewClientForm((f) => ({
                          ...f,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Street, city, state, ZIP"
                    />
                  </label>
                </div>

                <div className="gi-actions">
                  <button
                    type="button"
                    className="dashboard__create-btn"
                    onClick={submitNewClient}
                  >
                    {editingClientId
                      ? "Save client changes"
                      : "Save & select client"}
                  </button>
                  <button
                    type="button"
                    className="gi-btn"
                    onClick={closeClientForm}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 1 && client ? (
          <div className="gi__stack">
            <div className="gi-step1-toolbar">
              <p className="gi-muted" style={{ margin: 0, flex: "1 1 auto" }}>
                Matters for <strong>{client.name}</strong>
                {isSessionClient(client)
                  ? " — you can edit this client on Step 1 anytime."
                  : catalogSource === "counselflow"
                    ? " — from CounselFlow (matters linked to this client)."
                    : ""}
              </p>
              <div className="gi-actions" style={{ margin: 0 }}>
                {isSessionClient(client) ? (
                  <button
                    type="button"
                    className="gi-btn"
                    onClick={() => {
                      setStep(0);
                      openEditClientForm(client);
                    }}
                  >
                    Edit client
                  </button>
                ) : null}
                <button
                  type="button"
                  className="dashboard__create-btn"
                  onClick={() => {
                    if (showAddMatter) {
                      closeMatterForm();
                    } else {
                      openAddMatterForm();
                    }
                  }}
                >
                  {showAddMatter ? "Close form" : "Add legal matter"}
                </button>
              </div>
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

            {showAddMatter ? (
              <div
                className="gi-add-client panel"
                aria-label={
                  editingMatterId ? "Edit legal matter" : "Add legal matter"
                }
              >
                <header className="panel__header">
                  <h3 className="gi-subhead" style={{ margin: 0 }}>
                    {editingMatterId ? "Edit legal matter" : "Add legal matter"}
                  </h3>
                  <p>
                    {editingMatterId
                      ? "Update matter details. Billable time already on this matter is kept."
                      : (
                        <>
                          Choose a standard matter type from the dropdown, or
                          select <strong>Other / write your own</strong> to
                          enter a custom name. You can return and edit matters
                          you add before finalizing.
                        </>
                      )}
                  </p>
                </header>

                {addMatterErrors.length > 0 ? (
                  <div className="gi__alert" role="alert">
                    <ul>
                      {addMatterErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="gi-add-client__grid">
                  <label className="gi__field gi-add-client__wide">
                    <span>Matter type / name</span>
                    <select
                      value={newMatterForm.matterTemplate}
                      onChange={(e) =>
                        setNewMatterForm((f) => ({
                          ...f,
                          matterTemplate: e.target.value,
                          customMatterName:
                            e.target.value === "Other / write your own"
                              ? f.customMatterName
                              : "",
                        }))
                      }
                    >
                      {MATTER_NAME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  {newMatterForm.matterTemplate === "Other / write your own" ? (
                    <label className="gi__field gi-add-client__wide">
                      <span>Custom matter name</span>
                      <input
                        value={newMatterForm.customMatterName}
                        onChange={(e) =>
                          setNewMatterForm((f) => ({
                            ...f,
                            customMatterName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Data Center Expansion Dispute"
                      />
                    </label>
                  ) : null}

                  <label className="gi__field">
                    <span>Matter Number (optional)</span>
                    <input
                      value={newMatterForm.matterNumber}
                      onChange={(e) =>
                        setNewMatterForm((f) => ({
                          ...f,
                          matterNumber: e.target.value,
                        }))
                      }
                      placeholder="Auto-generated if left blank"
                    />
                  </label>
                  <label className="gi__field">
                    <span>Responsible Attorney</span>
                    <select
                      value={newMatterForm.responsibleAttorney}
                      onChange={(e) =>
                        setNewMatterForm((f) => ({
                          ...f,
                          responsibleAttorney: e.target.value,
                        }))
                      }
                    >
                      {ATTORNEY_OPTIONS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="gi__field">
                    <span>Matter Status</span>
                    <select
                      value={newMatterForm.status}
                      onChange={(e) =>
                        setNewMatterForm((f) => ({
                          ...f,
                          status: e.target.value as MatterStatus,
                        }))
                      }
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </label>
                  <label className="gi__field">
                    <span>Billing Period</span>
                    <input
                      value={newMatterForm.billingPeriod}
                      onChange={(e) =>
                        setNewMatterForm((f) => ({
                          ...f,
                          billingPeriod: e.target.value,
                        }))
                      }
                      placeholder="YYYY-MM"
                    />
                  </label>
                </div>

                <div className="gi-actions">
                  <button
                    type="button"
                    className="dashboard__create-btn"
                    onClick={submitNewMatter}
                  >
                    {editingMatterId
                      ? "Save matter changes"
                      : "Save & select matter"}
                  </button>
                  <button
                    type="button"
                    className="gi-btn"
                    onClick={closeMatterForm}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <p className="gi-muted" style={{ margin: 0 }}>
              Existing firm legal matters can only be selected — not edited.
              Edit is available only for matters you create with{" "}
              <strong>Add legal matter</strong> during this invoice.
            </p>

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
                        No matters for this client yet. Open the Clients module
                        to add matters, or use Add legal matter for this invoice
                        only.
                      </td>
                    </tr>
                  ) : (
                    matters.map((m) => {
                      const canEdit =
                        isSessionCreatedMatter(m) &&
                        extraMatters.some((em) => em.id === m.id);
                      return (
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
                          <div className="gi-actions" style={{ margin: 0 }}>
                            <button
                              type="button"
                              className="gi-btn gi-btn--small"
                              onClick={() => selectMatter(m)}
                            >
                              {matter?.id === m.id ? "Selected" : "Select"}
                            </button>
                            {canEdit ? (
                              <button
                                type="button"
                                className="gi-btn gi-btn--small"
                                onClick={() => openEditMatterForm(m)}
                              >
                                Edit
                              </button>
                            ) : (
                              <span
                                className="gi-muted"
                                style={{ fontSize: "0.78rem" }}
                                title="Existing firm matters cannot be edited"
                              >
                                (firm matter)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {step === 2 && client && matter ? (
          <div className="gi__stack">
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
                <dt>Retainer available</dt>
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
                onClick={finalizeInvoice}
              >
                Finalize Invoice
              </button>
              <p className="gi-finalize__hint">
                Locks billable time, records this invoice as Sent, and adds it to
                Invoice Management.
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
  );
}

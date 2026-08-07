import { createJournalEntry } from "@/lib/accounting/mutations";
import { asNumber } from "@/lib/accounting/db";
import { createClientSafe } from "@/lib/supabase/client";

export const REVENUE_LEDGER_UPDATE_EVENT = "counselflow-revenue-ledger-updated";

function notifyRevenueLedgerUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REVENUE_LEDGER_UPDATE_EVENT));
  }
}

const SYSTEM_ACTOR = { name: "CounselFlow", role: "system" };

const ACCOUNTS = {
  cash: { code: "1010", name: "Cash – Operating" },
  ar: { code: "1200", name: "Accounts Receivable" },
  revenue: { code: "4100", name: "Legal Services Revenue" },
} as const;

function periodLabelFromDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date());
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

async function resolveCreatedByName(profileId: string | null): Promise<string> {
  const supabase = createClientSafe();
  if (!supabase || !profileId) return "CounselFlow Automation";
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", profileId)
    .maybeSingle();
  return (data?.full_name as string | undefined)?.trim() || "CounselFlow Automation";
}

async function journalEntryExists(
  sourceType: string,
  sourceId: string,
): Promise<boolean> {
  const supabase = createClientSafe();
  if (!supabase) return false;
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

export type InvoiceGlPostInput = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  clientId: string;
  matterId: string;
  totalAmount: number;
  billingType: "hourly" | "fixed_fee" | "retainer" | "contingency";
  createdByProfileId: string;
};

/** Post AR / revenue JE and revenue recognition row when an invoice is issued. */
export async function postInvoiceBillingToGl(
  input: InvoiceGlPostInput,
): Promise<{ ok: boolean; error?: string }> {
  const amount = asNumber(input.totalAmount);
  if (amount <= 0) return { ok: true };

  if (await journalEntryExists("invoice", input.invoiceId)) {
    return { ok: true };
  }

  const createdBy = await resolveCreatedByName(input.createdByProfileId);
  const description = `Invoice billing — ${input.invoiceNumber}`;
  const lineDescription = `${input.invoiceNumber} legal services`;

  const result = await createJournalEntry({
    entryDate: input.invoiceDate,
    description,
    createdBy,
    sourceType: "invoice",
    sourceId: input.invoiceId,
    postImmediately: true,
    actor: SYSTEM_ACTOR,
    lines: [
      {
        accountCode: ACCOUNTS.ar.code,
        accountName: ACCOUNTS.ar.name,
        description: lineDescription,
        debit: amount,
        credit: 0,
      },
      {
        accountCode: ACCOUNTS.revenue.code,
        accountName: ACCOUNTS.revenue.name,
        description: lineDescription,
        debit: 0,
        credit: amount,
      },
    ],
  });

  if (!result.ok) {
    console.warn("Invoice GL posting failed:", result.error);
    return { ok: false, error: result.error };
  }

  await upsertRevenueRecognitionForInvoice(input);
  notifyRevenueLedgerUpdated();
  return { ok: true };
}

async function upsertRevenueRecognitionForInvoice(
  input: InvoiceGlPostInput,
): Promise<void> {
  const supabase = createClientSafe();
  if (!supabase) return;

  const amount = asNumber(input.totalAmount);
  const isRetainer = input.billingType === "retainer";
  const payload = {
    client_id: input.clientId,
    matter_id: input.matterId,
    invoice_id: input.invoiceId,
    invoice_number: input.invoiceNumber,
    invoice_date: input.invoiceDate,
    total_amount: amount,
    recognized_amount: isRetainer ? 0 : amount,
    deferred_amount: isRetainer ? amount : 0,
    recognition_method: isRetainer ? "Milestone" : "Accrual",
    status: isRetainer ? "Deferred" : "Recognized",
    period_label: periodLabelFromDate(input.invoiceDate),
  };

  const { data: existing } = await supabase
    .from("revenue_recognition_items")
    .select("id")
    .eq("invoice_id", input.invoiceId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("revenue_recognition_items")
      .update(payload)
      .eq("id", existing.id);
    return;
  }

  await supabase.from("revenue_recognition_items").insert(payload);
}

export type PaymentGlPostInput = {
  paymentId: string;
  invoiceNumber: string;
  paymentDate: string;
  amount: number;
  referenceNumber?: string | null;
  createdByProfileId: string;
};

/** Post cash / AR JE when a client payment is recorded against an invoice. */
export async function postPaymentToGl(
  input: PaymentGlPostInput,
): Promise<{ ok: boolean; error?: string }> {
  const amount = asNumber(input.amount);
  if (amount <= 0) return { ok: true };

  if (await journalEntryExists("payment", input.paymentId)) {
    return { ok: true };
  }

  const createdBy = await resolveCreatedByName(input.createdByProfileId);
  const ref = input.referenceNumber?.trim();
  const paymentLabel = ref
    ? `${input.invoiceNumber} (${ref})`
    : input.invoiceNumber;
  const description = `Client payment — ${paymentLabel}`;

  const result = await createJournalEntry({
    entryDate: input.paymentDate,
    description,
    createdBy,
    sourceType: "payment",
    sourceId: input.paymentId,
    postImmediately: true,
    actor: SYSTEM_ACTOR,
    lines: [
      {
        accountCode: ACCOUNTS.cash.code,
        accountName: ACCOUNTS.cash.name,
        description: `Payment ${paymentLabel}`,
        debit: amount,
        credit: 0,
      },
      {
        accountCode: ACCOUNTS.ar.code,
        accountName: ACCOUNTS.ar.name,
        description: `Payment ${paymentLabel}`,
        debit: 0,
        credit: amount,
      },
    ],
  });

  if (!result.ok) {
    console.warn("Payment GL posting failed:", result.error);
    return { ok: false, error: result.error };
  }

  notifyRevenueLedgerUpdated();
  return { ok: true };
}

export function isIssuedInvoiceStatus(
  status: "draft" | "sent" | "partial" | "paid" | "overdue" | "disputed" | "cancelled",
): boolean {
  return status === "sent" || status === "partial" || status === "paid";
}

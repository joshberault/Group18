import { createClientSafe } from "@/lib/supabase/client";
import { normalizeBillingDate } from "@/lib/billing/billing-period";
import type {
  BillingMethod,
  ClientInfo,
  ExpenseEntry,
  Invoice,
  InvoiceStatus,
  PaymentEntry,
  ReminderStatus,
  TimeEntry,
  WriteDown,
} from "@/lib/billing/invoice-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InvoicePersistResult = {
  ok: boolean;
  count: number;
  invoice?: Invoice;
  error?: string;
};

type InvoiceNotesPayload = {
  clientInfo?: ClientInfo;
  legalMatter?: string;
  attorney?: string;
  billingMethod?: BillingMethod;
  matterDescription?: string;
  reminderStatus?: ReminderStatus;
};

function money(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapDbStatusToUi(status: string): InvoiceStatus {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "partial":
      return "Partially Paid";
    case "paid":
      return "Paid";
    case "overdue":
      return "Overdue";
    case "disputed":
      return "Disputed";
    case "void":
    case "cancelled":
      return "Cancelled";
    default:
      return "Draft";
  }
}

function mapUiStatusToDb(
  status: InvoiceStatus,
):
  | "draft"
  | "sent"
  | "partial"
  | "paid"
  | "overdue"
  | "disputed"
  | "cancelled" {
  switch (status) {
    case "Draft":
      return "draft";
    case "Sent":
      return "sent";
    case "Partially Paid":
      return "partial";
    case "Paid":
      return "paid";
    case "Overdue":
      return "overdue";
    case "Disputed":
      return "disputed";
    case "Cancelled":
      return "cancelled";
    default:
      return "draft";
  }
}

function mapUiBillingToDb(
  method: BillingMethod | string,
): "hourly" | "fixed_fee" | "retainer" | "contingency" {
  switch (method) {
    case "Fixed Fee":
      return "fixed_fee";
    case "Retainer":
      return "retainer";
    case "Hourly":
    case "Reimbursable":
    default:
      return "hourly";
  }
}

function mapDbBillingToUi(value: string | null | undefined): BillingMethod {
  switch (value) {
    case "fixed_fee":
      return "Fixed Fee";
    case "retainer":
      return "Retainer";
    default:
      return "Hourly";
  }
}

function mapPaymentMethodToDb(
  method: string | undefined,
):
  | "check"
  | "ach"
  | "wire"
  | "credit_card"
  | "trust_transfer"
  | "cash"
  | "other" {
  const m = (method || "check").toLowerCase();
  if (m.includes("ach")) return "ach";
  if (m.includes("wire")) return "wire";
  if (m.includes("credit")) return "credit_card";
  if (m.includes("trust")) return "trust_transfer";
  if (m.includes("cash")) return "cash";
  if (m.includes("check")) return "check";
  return "other";
}

function mapPaymentMethodToUi(method: string | null | undefined): string {
  switch (method) {
    case "ach":
      return "ACH";
    case "wire":
      return "Wire Transfer";
    case "credit_card":
      return "Credit Card";
    case "trust_transfer":
      return "Trust Transfer";
    case "cash":
      return "Cash";
    case "check":
      return "Check";
    default:
      return method || "Other";
  }
}

function parseNotes(raw: string | null | undefined): InvoiceNotesPayload {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as InvoiceNotesPayload;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return { matterDescription: raw };
  }
}

function serializeNotes(invoice: Invoice): string {
  const payload: InvoiceNotesPayload = {
    clientInfo: invoice.clientInfo,
    legalMatter: invoice.legalMatter,
    attorney: invoice.attorney,
    billingMethod: invoice.billingMethod,
    matterDescription: invoice.matterDescription,
    reminderStatus: invoice.reminderStatus,
  };
  return JSON.stringify(payload);
}

type DbTimeLine = {
  id: string;
  time_entry_id: string | null;
  source_entry_key: string | null;
  work_date: string | null;
  attorney_name: string;
  description: string;
  hours: number | string;
  rate: number | string;
  amount: number | string;
  sort_order: number;
};

type DbExpenseLine = {
  id: string;
  source_expense_id: string | null;
  expense_date: string | null;
  description: string;
  amount: number | string;
  sort_order: number;
};

type DbWriteDownLine = {
  id: string;
  source_entry_key: string | null;
  write_down_date: string | null;
  reason: string;
  amount: number | string;
  sort_order: number;
};

type DbPayment = {
  id: string;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  reference_number: string | null;
  status: string;
};

type DbMatterEmbed = {
  id?: string;
  title?: string | null;
  status?: string | null;
} | null;

type DbInvoiceRow = {
  id: string;
  matter_id: string;
  client_id: string;
  invoice_number: string;
  status: string;
  billing_type: string;
  invoice_date: string;
  due_date: string;
  subtotal_time: number | string;
  subtotal_expenses: number | string;
  subtotal_fees: number | string;
  retainer_applied: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  amount_written_down: number | string;
  balance_due: number | string;
  notes: string | null;
  source_key: string | null;
  last_reminder_sent: string | null;
  reminder_count: number | null;
  /** Join alias: matter:matters(...) */
  matter?: DbMatterEmbed | DbMatterEmbed[] | null;
  invoice_time_lines?: DbTimeLine[] | null;
  invoice_expense_lines?: DbExpenseLine[] | null;
  invoice_write_down_lines?: DbWriteDownLine[] | null;
  payments?: DbPayment[] | null;
};

function embedMatter(row: DbInvoiceRow): DbMatterEmbed {
  const raw = row.matter;
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function mapRowToInvoice(row: DbInvoiceRow): Invoice {
  const notes = parseNotes(row.notes);
  const linkedMatter = embedMatter(row);
  const matterTitle = (linkedMatter?.title || "").trim();
  const legalMatter = matterTitle || (notes.legalMatter || "").trim() || "";
  const totalAmount = money(
    asNumber(row.total_amount) - asNumber(row.amount_written_down),
  );
  const amountPaid = money(asNumber(row.amount_paid));
  const remainingBalance = money(asNumber(row.balance_due));

  const timeEntries: TimeEntry[] = (row.invoice_time_lines ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((line) => ({
      id:
        line.source_entry_key ||
        line.time_entry_id ||
        line.id,
      date: line.work_date ?? "",
      attorney: line.attorney_name || "",
      description: line.description || "",
      hours: asNumber(line.hours),
      rate: asNumber(line.rate),
      amount: asNumber(line.amount),
    }));

  const reimbursableExpenses: ExpenseEntry[] = (row.invoice_expense_lines ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((line) => ({
      id: line.source_expense_id || line.id,
      date: line.expense_date ?? "",
      description: line.description || "",
      amount: asNumber(line.amount),
    }));

  const writeDowns: WriteDown[] = (row.invoice_write_down_lines ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((line) => ({
      id: line.source_entry_key || line.id,
      date: line.write_down_date ?? "",
      reason: line.reason || "",
      amount: asNumber(line.amount),
    }));

  const paymentHistory: PaymentEntry[] = (row.payments ?? [])
    .slice()
    .sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)))
    .filter((p) => p.status !== "reversed" && p.status !== "refunded")
    .map((p) => ({
      id: p.id,
      date: p.payment_date,
      method: mapPaymentMethodToUi(p.payment_method),
      reference: p.reference_number || "",
      amount: asNumber(p.amount),
    }));

  const reminderCount = Number(row.reminder_count) || 0;
  const clientName =
    notes.clientInfo?.name ||
    legalMatter /* fallback filled below */ ||
    "";

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    client: notes.clientInfo?.name || clientName || "Client",
    legalMatter,
    attorney: notes.attorney || "",
    billingMethod: notes.billingMethod || mapDbBillingToUi(row.billing_type),
    invoiceDate:
      normalizeBillingDate(row.invoice_date) ??
      String(row.invoice_date ?? "").slice(0, 10),
    dueDate:
      normalizeBillingDate(row.due_date) ??
      String(row.due_date ?? "").slice(0, 10),
    totalAmount,
    amountPaid,
    remainingBalance,
    status: mapDbStatusToUi(row.status),
    clientId: row.client_id,
    matterId: row.matter_id,
    sourceKey: row.source_key,
    clientInfo: notes.clientInfo ?? {
      name: clientName || "Client",
      contact: "",
      email: "",
      phone: "",
      billingAddress: "",
    },
    matterDescription:
      notes.matterDescription || legalMatter || notes.legalMatter || "",
    timeEntries,
    reimbursableExpenses,
    writeDowns,
    retainerApplied: money(asNumber(row.retainer_applied)),
    paymentHistory,
    lastReminderSent: row.last_reminder_sent,
    reminderCount,
    reminderStatus:
      notes.reminderStatus ||
      (reminderCount > 0 ? "Reminder Sent" : "None"),
  };
}

async function resolveActorId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<string | null> {
  try {
    const session = await supabase.auth.getUser();
    const uid = session?.data?.user?.id;
    if (isUuid(uid)) return uid;
  } catch {
    /* demo mode without auth */
  }
  const { data } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
  return data?.id && isUuid(data.id) ? data.id : null;
}

async function resolveClientAndMatterIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  invoice: Invoice,
): Promise<{ clientId: string | null; matterId: string | null; error?: string }> {
  let clientId = invoice.clientId && isUuid(invoice.clientId) ? invoice.clientId : null;
  let matterId = invoice.matterId && isUuid(invoice.matterId) ? invoice.matterId : null;

  if (!clientId && invoice.client) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", invoice.client)
      .limit(1)
      .maybeSingle();
    if (data?.id) clientId = data.id;
  }

  if (!matterId && clientId) {
    const query = supabase
      .from("matters")
      .select("id")
      .eq("client_id", clientId)
      .limit(1);
    if (invoice.legalMatter) {
      const { data } = await supabase
        .from("matters")
        .select("id")
        .eq("client_id", clientId)
        .ilike("title", `%${invoice.legalMatter}%`)
        .limit(1)
        .maybeSingle();
      if (data?.id) matterId = data.id;
    }
    if (!matterId) {
      const { data } = await query.maybeSingle();
      if (data?.id) matterId = data.id;
    }
  }

  if (!matterId && invoice.legalMatter) {
    const { data } = await supabase
      .from("matters")
      .select("id, client_id")
      .or(`title.ilike.%${invoice.legalMatter}%`)
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      matterId = data.id;
      if (!clientId) clientId = data.client_id;
    }
  }

  if (!clientId || !matterId) {
    return {
      clientId,
      matterId,
      error:
        "Invoice requires linked firm client and matter UUIDs. Select a CounselFlow client/matter before saving.",
    };
  }

  return { clientId, matterId };
}

function computeMoneyFields(invoice: Invoice) {
  const subtotalTime = money(
    (invoice.timeEntries ?? []).reduce((s, t) => s + (t.amount || 0), 0),
  );
  const subtotalExpenses = money(
    (invoice.reimbursableExpenses ?? []).reduce((s, e) => s + (e.amount || 0), 0),
  );
  const amountWrittenDown = money(
    (invoice.writeDowns ?? []).reduce((s, w) => s + (w.amount || 0), 0),
  );
  const retainerApplied = money(invoice.retainerApplied || 0);
  const taxAmount = 0;
  const subtotalFees = 0;
  const totalAmount = money(
    subtotalTime + subtotalExpenses + subtotalFees + taxAmount - retainerApplied,
  );
  const amountPaid = money(invoice.amountPaid || 0);
  const balanceDue = money(Math.max(0, totalAmount - amountPaid - amountWrittenDown));
  return {
    subtotalTime,
    subtotalExpenses,
    subtotalFees,
    amountWrittenDown,
    retainerApplied,
    taxAmount,
    totalAmount,
    amountPaid,
    balanceDue,
  };
}

function sourceKeyFor(invoice: Invoice): string | null {
  if (invoice.sourceKey) return invoice.sourceKey;
  // Legacy generated ids (approved-time-…) used as business keys before DB UUIDs
  if (invoice.id && !isUuid(invoice.id) && !invoice.id.startsWith("draft-") && !invoice.id.startsWith("gen-") && !invoice.id.startsWith("fin-")) {
    return invoice.id;
  }
  return null;
}

async function replaceLineItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  invoiceId: string,
  invoice: Invoice,
): Promise<string | null> {
  const delTime = await supabase
    .from("invoice_time_lines")
    .delete()
    .eq("invoice_id", invoiceId);
  if (delTime.error) return delTime.error.message;

  const delExp = await supabase
    .from("invoice_expense_lines")
    .delete()
    .eq("invoice_id", invoiceId);
  if (delExp.error) return delExp.error.message;

  const delWd = await supabase
    .from("invoice_write_down_lines")
    .delete()
    .eq("invoice_id", invoiceId);
  if (delWd.error) return delWd.error.message;

  const timeRows = (invoice.timeEntries ?? []).map((t, index) => ({
    invoice_id: invoiceId,
    time_entry_id: isUuid(t.id) ? t.id : null,
    source_entry_key: t.id || null,
    work_date: t.date || null,
    attorney_name: t.attorney || "",
    description: t.description || "",
    hours: money(t.hours),
    rate: money(t.rate),
    amount: money(t.amount),
    sort_order: index,
  }));
  if (timeRows.length) {
    const { error } = await supabase.from("invoice_time_lines").insert(timeRows);
    if (error) return error.message;
  }

  const expRows = (invoice.reimbursableExpenses ?? []).map((e, index) => ({
    invoice_id: invoiceId,
    source_expense_id: e.id || null,
    expense_date: e.date || null,
    description: e.description || "",
    amount: money(e.amount),
    sort_order: index,
  }));
  if (expRows.length) {
    const { error } = await supabase.from("invoice_expense_lines").insert(expRows);
    if (error) return error.message;
  }

  const wdRows = (invoice.writeDowns ?? []).map((w, index) => ({
    invoice_id: invoiceId,
    source_entry_key: w.id || null,
    write_down_date: w.date || null,
    reason: w.reason || "",
    amount: money(w.amount),
    sort_order: index,
  }));
  if (wdRows.length) {
    const { error } = await supabase
      .from("invoice_write_down_lines")
      .insert(wdRows);
    if (error) return error.message;
  }

  return null;
}

async function syncNewPayments(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  invoiceId: string,
  clientId: string,
  matterId: string,
  recordedBy: string,
  previous: PaymentEntry[],
  next: PaymentEntry[],
): Promise<string | null> {
  const prevIds = new Set(previous.map((p) => p.id));
  const added = next.filter((p) => p.id && !prevIds.has(p.id));
  // Also detect amount-only appends without stable ids
  if (added.length === 0 && next.length > previous.length) {
    const tail = next.slice(previous.length);
    for (const p of tail) {
      const { error } = await supabase.from("payments").insert({
        invoice_id: invoiceId,
        client_id: clientId,
        matter_id: matterId,
        recorded_by: recordedBy,
        payment_date: p.date || new Date().toISOString().slice(0, 10),
        amount: money(p.amount),
        payment_method: mapPaymentMethodToDb(p.method),
        status: "completed",
        reference_number: p.reference || null,
      });
      if (error) return error.message;
    }
    return null;
  }

  for (const p of added) {
    // Skip re-insert of existing DB payment UUIDs already present
    if (isUuid(p.id) && prevIds.has(p.id)) continue;
    const { error } = await supabase.from("payments").insert({
      invoice_id: invoiceId,
      client_id: clientId,
      matter_id: matterId,
      recorded_by: recordedBy,
      payment_date: p.date || new Date().toISOString().slice(0, 10),
      amount: money(p.amount),
      payment_method: mapPaymentMethodToDb(p.method),
      status: "completed",
      reference_number: p.reference || null,
    });
    if (error) return error.message;
  }
  return null;
}

const SELECT_FULL = `
  *,
  matter:matters(id, title, status),
  invoice_time_lines(*),
  invoice_expense_lines(*),
  invoice_write_down_lines(*),
  payments(*)
`;

export async function fetchInvoicesFromSupabase(): Promise<{
  data: Invoice[];
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      data: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    };
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(SELECT_FULL)
    .order("invoice_date", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data ?? []) as DbInvoiceRow[];
  const invoices = rows
    .map(mapRowToInvoice)
    .sort((a, b) => {
      const byNumber = b.invoiceNumber.localeCompare(a.invoiceNumber, undefined, {
        numeric: true,
      });
      if (byNumber !== 0) return byNumber;
      return b.invoiceDate.localeCompare(a.invoiceDate);
    });

  return { data: invoices, error: null };
}

export async function upsertInvoiceInSupabase(
  invoice: Invoice,
): Promise<InvoicePersistResult> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      ok: false,
      count: 0,
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    };
  }

  const actorId = await resolveActorId(supabase);
  if (!actorId) {
    return {
      ok: false,
      count: 0,
      error: "No profiles row available for invoice created_by / recorded_by.",
    };
  }

  const resolved = await resolveClientAndMatterIds(supabase, invoice);
  if (!resolved.clientId || !resolved.matterId) {
    return { ok: false, count: 0, error: resolved.error };
  }

  const moneyFields = computeMoneyFields(invoice);
  const sourceKey = sourceKeyFor(invoice);
  const dbStatus = mapUiStatusToDb(invoice.status);
  let billingType = mapUiBillingToDb(invoice.billingMethod);
  if (moneyFields.retainerApplied > 0 && billingType !== "retainer") {
    billingType = "hourly"; // constraint allows retainer_applied on hourly or retainer
  }

  // Locate existing by uuid, invoice_number, or source_key
  let existingId: string | null = isUuid(invoice.id) ? invoice.id : null;
  let previousPayments: PaymentEntry[] = [];

  if (!existingId) {
    const { data: byNumber } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoice.invoiceNumber)
      .maybeSingle();
    if (byNumber?.id) existingId = byNumber.id;
  }
  if (!existingId && sourceKey) {
    const { data: byKey } = await supabase
      .from("invoices")
      .select("id")
      .eq("source_key", sourceKey)
      .maybeSingle();
    if (byKey?.id) existingId = byKey.id;
  }

  if (existingId) {
    const loaded = await supabase
      .from("invoices")
      .select(SELECT_FULL)
      .eq("id", existingId)
      .maybeSingle();
    if (loaded.data) {
      previousPayments = mapRowToInvoice(loaded.data as DbInvoiceRow).paymentHistory;
    }
  }

  const rowPayload = {
    matter_id: resolved.matterId,
    client_id: resolved.clientId,
    created_by: actorId,
    invoice_number: invoice.invoiceNumber,
    status: dbStatus,
    billing_type: billingType,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate,
    subtotal_time: moneyFields.subtotalTime,
    subtotal_expenses: moneyFields.subtotalExpenses,
    subtotal_fees: moneyFields.subtotalFees,
    retainer_applied: moneyFields.retainerApplied,
    tax_amount: moneyFields.taxAmount,
    total_amount: moneyFields.totalAmount,
    amount_paid: moneyFields.amountPaid,
    amount_written_down: moneyFields.amountWrittenDown,
    balance_due: moneyFields.balanceDue,
    notes: serializeNotes(invoice),
    source_key: sourceKey,
    last_reminder_sent: invoice.lastReminderSent || null,
    reminder_count: invoice.reminderCount ?? 0,
    sent_at:
      dbStatus === "sent" || dbStatus === "partial" || dbStatus === "paid"
        ? new Date().toISOString()
        : null,
    paid_at: dbStatus === "paid" ? new Date().toISOString() : null,
  };

  let invoiceId = existingId;
  if (existingId) {
    const { error } = await supabase
      .from("invoices")
      .update(rowPayload)
      .eq("id", existingId);
    if (error) return { ok: false, count: 0, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("invoices")
      .insert(rowPayload)
      .select("id")
      .single();
    if (error) return { ok: false, count: 0, error: error.message };
    invoiceId = data.id;
  }

  if (!invoiceId) {
    return { ok: false, count: 0, error: "Invoice id missing after save." };
  }

  const lineError = await replaceLineItems(supabase, invoiceId, invoice);
  if (lineError) return { ok: false, count: 0, error: lineError };

  const payError = await syncNewPayments(
    supabase,
    invoiceId,
    resolved.clientId,
    resolved.matterId,
    actorId,
    previousPayments,
    invoice.paymentHistory ?? [],
  );
  if (payError) return { ok: false, count: 0, error: payError };

  const { data: full, error: reloadError } = await supabase
    .from("invoices")
    .select(SELECT_FULL)
    .eq("id", invoiceId)
    .single();

  if (reloadError || !full) {
    return {
      ok: false,
      count: 0,
      error: reloadError?.message || "Saved but could not reload invoice.",
    };
  }

  const mapped = mapRowToInvoice(full as DbInvoiceRow);
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  return {
    ok: true,
    count: count ?? 0,
    invoice: mapped,
  };
}

export async function deleteInvoiceInSupabase(
  invoiceNumber: string,
): Promise<InvoicePersistResult> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      ok: false,
      count: 0,
      error: "Supabase is not configured.",
    };
  }

  const number = invoiceNumber.trim();
  if (!number) {
    return { ok: false, count: 0, error: "Invoice number is required." };
  }

  // Resolve id so we can remove children that previously blocked RESTRICT FKs,
  // then hard-delete the invoice row. Line tables cascade; payments/write_downs
  // also cascade after migration, but explicit deletes keep demos working either way.
  const { data: existing, error: findError } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("invoice_number", number)
    .maybeSingle();

  if (findError) {
    return { ok: false, count: 0, error: findError.message };
  }
  if (!existing?.id) {
    return {
      ok: false,
      count: 0,
      error: `Invoice ${number} was not found in Supabase.`,
    };
  }

  const invoiceId = existing.id as string;

  // expenses.invoice_id is SET NULL on invoice delete, but check constraint
  // expenses_billed_requires_invoice requires billed rows to keep an invoice_id.
  const { error: expenseError } = await supabase
    .from("expenses")
    .update({ invoice_id: null, status: "approved" })
    .eq("invoice_id", invoiceId);
  if (
    expenseError &&
    !/relation|does not exist|schema cache|column/i.test(expenseError.message)
  ) {
    return {
      ok: false,
      count: 0,
      error: `Could not detach expenses for ${number}: ${expenseError.message}`,
    };
  }

  const childDeletes: Array<{
    table: string;
    run: () => PromiseLike<{ error: { message: string } | null }>;
  }> = [
    {
      table: "payments",
      run: () =>
        supabase.from("payments").delete().eq("invoice_id", invoiceId),
    },
    {
      table: "write_downs",
      run: () =>
        supabase.from("write_downs").delete().eq("invoice_id", invoiceId),
    },
    {
      table: "invoice_time_lines",
      run: () =>
        supabase.from("invoice_time_lines").delete().eq("invoice_id", invoiceId),
    },
    {
      table: "invoice_expense_lines",
      run: () =>
        supabase
          .from("invoice_expense_lines")
          .delete()
          .eq("invoice_id", invoiceId),
    },
    {
      table: "invoice_write_down_lines",
      run: () =>
        supabase
          .from("invoice_write_down_lines")
          .delete()
          .eq("invoice_id", invoiceId),
    },
  ];

  for (const step of childDeletes) {
    const { error } = await step.run();
    // Ignore missing-table / RLS soft failures only when message says table not found.
    // Surface real FK/RLS errors so the UI can report them.
    if (error && !/relation|does not exist|schema cache/i.test(error.message)) {
      return {
        ok: false,
        count: 0,
        error: `Could not remove ${step.table} for ${number}: ${error.message}`,
      };
    }
  }

  const { data: deletedRows, error: deleteError } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .select("id");

  if (deleteError) {
    return { ok: false, count: 0, error: deleteError.message };
  }
  if (!deletedRows?.length) {
    return {
      ok: false,
      count: 0,
      error: `Delete did not remove invoice ${number} (check RLS/delete policies).`,
    };
  }

  // Confirm gone so metrics/dashboards never keep a stale row from a partial delete.
  const { data: stillThere } = await supabase
    .from("invoices")
    .select("id")
    .eq("invoice_number", number)
    .maybeSingle();

  if (stillThere?.id) {
    return {
      ok: false,
      count: 0,
      error: `Invoice ${number} still exists after delete.`,
    };
  }

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });

  return { ok: true, count: count ?? 0 };
}

export async function allocateNextInvoiceNumberFromDb(
  year = 2026,
  cached: Invoice[] = [],
): Promise<string> {
  let max = 1100;
  const re = /NV-\d{4}-(\d+)/i;
  for (const inv of cached) {
    const match = inv.invoiceNumber.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }

  const supabase = createClientSafe();
  if (supabase) {
    const { data } = await supabase
      .from("invoices")
      .select("invoice_number")
      .ilike("invoice_number", `NV-${year}-%`);
    for (const row of data ?? []) {
      const match = String(row.invoice_number).match(re);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }

  return `NV-${year}-${String(max + 1).padStart(4, "0")}`;
}

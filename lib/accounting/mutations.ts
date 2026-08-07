import { getAccountingSupabase, logAuditEvent, asNumber } from "./db";
import { postPaymentToGl } from "@/lib/accounting/billing-gl-posting";

type Actor = { name: string; role: string };

export async function recordPayment(input: {
  invoiceId: string;
  clientId: string;
  matterId?: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("balance_due, amount_paid, total_amount")
    .eq("id", input.invoiceId)
    .single();
  if (invErr || !inv) return { ok: false, error: invErr?.message ?? "Invoice not found" };

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      invoice_id: input.invoiceId,
      client_id: input.clientId,
      matter_id: input.matterId ?? null,
      amount: input.amount,
      payment_method: input.paymentMethod,
      reference_number: input.referenceNumber ?? null,
      allocated_amount: input.amount,
      status: "completed",
      payment_date: new Date().toISOString().slice(0, 10),
    })
    .select("id, payment_date, amount, reference_number")
    .single();
  if (payErr) return { ok: false, error: payErr.message };

  const { data: invoiceRow } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("id", input.invoiceId)
    .maybeSingle();

  const glResult = await postPaymentToGl({
    paymentId: String(payment.id),
    invoiceNumber: String(invoiceRow?.invoice_number ?? input.invoiceId),
    paymentDate: String(payment.payment_date).slice(0, 10),
    amount: asNumber(payment.amount),
    referenceNumber: payment.reference_number,
    createdByProfileId: input.clientId,
  });
  if (!glResult.ok) {
    console.warn(`GL post skipped for payment ${payment.id}:`, glResult.error);
  }

  await supabase.from("payment_allocations").insert({
    payment_id: payment.id,
    invoice_id: input.invoiceId,
    amount: input.amount,
  });

  const newPaid = asNumber(inv.amount_paid) + input.amount;
  const newBalance = Math.max(0, asNumber(inv.balance_due) - input.amount);
  const status =
    newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "sent";

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      amount_paid: newPaid,
      balance_due: newBalance,
      status,
      paid_at: newBalance <= 0 ? new Date().toISOString() : null,
    })
    .eq("id", input.invoiceId);
  if (updErr) return { ok: false, error: updErr.message };

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "Accounts Receivable",
    action: "Record Payment",
    recordType: "payment",
    recordId: payment.id,
    description: `Recorded $${input.amount.toLocaleString()} payment`,
    afterValue: String(newBalance),
  });

  return { ok: true };
}

export async function decideWriteOff(input: {
  requestId: string;
  approve: boolean;
  reviewer: Actor;
  rejectionReason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { data: req, error: reqErr } = await supabase
    .from("write_off_requests")
    .select("*")
    .eq("id", input.requestId)
    .single();
  if (reqErr || !req) return { ok: false, error: reqErr?.message ?? "Not found" };

  const status = input.approve ? "approved" : "rejected";
  const { error } = await supabase
    .from("write_off_requests")
    .update({
      status,
      reviewed_by: input.reviewer.name,
      rejection_reason: input.rejectionReason ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);
  if (error) return { ok: false, error: error.message };

  if (input.approve) {
    const amount = asNumber(req.amount);
    const { data: inv } = await supabase
      .from("invoices")
      .select("balance_due, amount_written_down")
      .eq("id", req.invoice_id)
      .single();
    if (inv) {
      await supabase
        .from("invoices")
        .update({
          balance_due: Math.max(0, asNumber(inv.balance_due) - amount),
          amount_written_down: asNumber(inv.amount_written_down) + amount,
        })
        .eq("id", req.invoice_id);
    }
  }

  await logAuditEvent({
    actorName: input.reviewer.name,
    actorRole: input.reviewer.role,
    module: "Accounts Receivable",
    action: input.approve ? "Approve Write-Off" : "Reject Write-Off",
    recordType: "write_off_request",
    recordId: input.requestId,
    description: `${status} write-off for $${asNumber(req.amount).toLocaleString()}`,
    riskLevel: "Medium",
  });

  return { ok: true };
}

type JournalLineInput = {
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
};

export async function createJournalEntry(input: {
  entryDate: string;
  description: string;
  createdBy: string;
  lines: JournalLineInput[];
  sourceType?: string;
  sourceId?: string;
  postImmediately?: boolean;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string; entryId?: string; entryNumber?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);
  if (totalDebit <= 0 || totalDebit !== totalCredit) {
    return { ok: false, error: "Journal entry must balance with debits greater than zero." };
  }

  const { data: latest } = await supabase
    .from("journal_entries")
    .select("entry_number")
    .order("entry_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestNumber = String(latest?.entry_number ?? "JE-2026-0842");
  const suffix = Number(latestNumber.replace(/\D/g, "")) || 842;
  const entryNumber = `JE-2026-${String(suffix + 1).padStart(4, "0")}`;
  const postNow = input.postImmediately ?? false;

  const { data: header, error: headerError } = await supabase
    .from("journal_entries")
    .insert({
      entry_number: entryNumber,
      entry_date: input.entryDate,
      description: input.description.trim(),
      status: postNow ? "Posted" : "Draft",
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: input.createdBy,
      posted_at: postNow ? new Date().toISOString() : null,
      source_type: input.sourceType ?? null,
      source_id: input.sourceId ?? null,
    })
    .select("id, entry_number")
    .single();

  if (headerError || !header) {
    return { ok: false, error: headerError?.message ?? "Failed to create journal entry." };
  }

  const lineRows = input.lines.map((line, index) => ({
    journal_entry_id: header.id,
    account_code: line.accountCode,
    account_name: line.accountName,
    description: line.description.trim() || input.description.trim(),
    debit: line.debit,
    credit: line.credit,
    sort_order: index + 1,
  }));

  const { error: lineError } = await supabase.from("journal_entry_lines").insert(lineRows);
  if (lineError) {
    await supabase.from("journal_entries").delete().eq("id", header.id);
    return { ok: false, error: lineError.message };
  }

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "General Ledger",
    action: postNow ? "Create and Post Journal Entry" : "Create Journal Entry",
    recordType: "journal_entry",
    recordId: header.id,
    description: `${postNow ? "Posted" : "Drafted"} ${entryNumber} — ${input.description.trim()}`,
    afterValue: String(totalDebit),
    riskLevel: postNow ? "Medium" : "Low",
  });

  return {
    ok: true,
    entryId: header.id,
    entryNumber: header.entry_number as string,
  };
}

export async function completeCloseTask(input: {
  taskId: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { data: task, error } = await supabase
    .from("month_end_close_tasks")
    .update({ status: "Complete" })
    .eq("id", input.taskId)
    .select("task")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "General Ledger",
    action: "Complete Close Task",
    recordType: "month_end_close_task",
    recordId: input.taskId,
    description: `Completed "${task.task}"`,
  });

  return { ok: true };
}

export async function postJournalEntry(input: {
  entryId: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { data: existing, error: readError } = await supabase
    .from("journal_entries")
    .select("status, total_debit, total_credit")
    .eq("id", input.entryId)
    .single();
  if (readError || !existing) {
    return { ok: false, error: readError?.message ?? "Journal entry not found." };
  }
  if (existing.status === "Posted") {
    return { ok: false, error: "Journal entry is already posted." };
  }
  if (asNumber(existing.total_debit) !== asNumber(existing.total_credit)) {
    return { ok: false, error: "Cannot post an unbalanced journal entry." };
  }

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .update({ status: "Posted", posted_at: new Date().toISOString() })
    .eq("id", input.entryId)
    .select("entry_number")
    .single();
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "General Ledger",
    action: "Post Journal Entry",
    recordType: "journal_entry",
    recordId: input.entryId,
    description: `Posted ${entry.entry_number}`,
    riskLevel: "Medium",
  });

  return { ok: true };
}

export async function resolveTrustException(input: {
  exceptionId: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { error } = await supabase
    .from("trust_exceptions")
    .update({ status: "Resolved" })
    .eq("id", input.exceptionId);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "Trust Accounting",
    action: "Resolve Exception",
    recordType: "trust_exception",
    recordId: input.exceptionId,
    description: "Trust exception marked resolved",
  });

  return { ok: true };
}

export async function recordTrustTransfer(input: {
  trustAccountId: string;
  fromClientId?: string;
  toClientId?: string;
  matterId?: string;
  amount: number;
  description: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };
  const db = supabase;

  const clientId = input.toClientId ?? input.fromClientId;
  if (!clientId) {
    return { ok: false, error: "Client is required for trust transfers." };
  }
  if (!input.description.trim()) {
    return { ok: false, error: "Description is required for trust transfers." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Transfer amount must be greater than zero." };
  }

  if (input.fromClientId) {
    const { data: ledger } = await db
      .from("trust_client_ledgers")
      .select("balance")
      .eq("trust_account_id", input.trustAccountId)
      .eq("client_id", input.fromClientId)
      .maybeSingle();
    const balance = asNumber(ledger?.balance);
    if (ledger && input.amount > balance) {
      return {
        ok: false,
        error: `Transfer would overdraw the client ledger (balance ${balance.toLocaleString()}).`,
      };
    }
  }

  const { error: txErr } = await db.from("trust_transactions").insert({
    trust_account_id: input.trustAccountId,
    client_id: clientId,
    matter_id: input.matterId ?? null,
    transaction_type: "Transfer",
    description: input.description.trim(),
    amount: input.amount,
    status: "Posted",
  });
  if (txErr) return { ok: false, error: txErr.message };

  async function adjustLedgerBalance(
    ledgerClientId: string,
    delta: number,
  ): Promise<string | null> {
    const { data: ledger } = await db
      .from("trust_client_ledgers")
      .select("id, balance")
      .eq("trust_account_id", input.trustAccountId)
      .eq("client_id", ledgerClientId)
      .maybeSingle();

    if (ledger?.id) {
      const nextBalance = asNumber(ledger.balance) + delta;
      const { error: ledgerErr } = await db
        .from("trust_client_ledgers")
        .update({ balance: nextBalance })
        .eq("id", ledger.id);
      return ledgerErr?.message ?? null;
    }

    if (delta > 0) {
      const { error: insertErr } = await db
        .from("trust_client_ledgers")
        .insert({
          trust_account_id: input.trustAccountId,
          client_id: ledgerClientId,
          balance: delta,
        });
      return insertErr?.message ?? null;
    }

    return null;
  }

  if (input.fromClientId && input.toClientId) {
    const fromError = await adjustLedgerBalance(input.fromClientId, -input.amount);
    if (fromError) return { ok: false, error: fromError };
    const toError = await adjustLedgerBalance(input.toClientId, input.amount);
    if (toError) return { ok: false, error: toError };
  } else if (input.toClientId) {
    const ledgerError = await adjustLedgerBalance(input.toClientId, input.amount);
    if (ledgerError) return { ok: false, error: ledgerError };
  } else if (input.fromClientId) {
    const ledgerError = await adjustLedgerBalance(input.fromClientId, -input.amount);
    if (ledgerError) return { ok: false, error: ledgerError };
  }

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "Trust Accounting",
    action: "Trust Transfer",
    recordType: "trust_transaction",
    recordId: input.trustAccountId,
    description: input.description,
    afterValue: String(input.amount),
    riskLevel: "High",
  });

  return { ok: true };
}

export async function voidTrustTransaction(input: {
  transactionId: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { error } = await supabase
    .from("trust_transactions")
    .update({ status: "Voided" })
    .eq("id", input.transactionId);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "Trust Accounting",
    action: "Void Transaction",
    recordType: "trust_transaction",
    recordId: input.transactionId,
    description: "Trust transaction voided",
    riskLevel: "High",
  });

  return { ok: true };
}

const ESCALATION_STAGES = [
  "reminder",
  "internal_review",
  "write_off_requested",
  "external_collections",
] as const;

export async function escalateCollectionStage(input: {
  invoiceId: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string; nextStage?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select(
      "escalation_stage, invoice_number, client_id, matter_id, balance_due",
    )
    .eq("id", input.invoiceId)
    .single();
  if (invErr || !inv) {
    return { ok: false, error: invErr?.message ?? "Invoice not found" };
  }

  const current = String(inv.escalation_stage ?? "reminder");
  const idx = ESCALATION_STAGES.indexOf(
    current as typeof ESCALATION_STAGES[number],
  );
  if (idx < 0 || idx >= ESCALATION_STAGES.length - 1) {
    return {
      ok: false,
      error: "Invoice is already at the final escalation stage.",
    };
  }

  const nextStage = ESCALATION_STAGES[idx + 1];
  if (nextStage === "external_collections") {
    return {
      ok: false,
      error:
        "External collections require Managing Partner approval after write-off review.",
    };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ escalation_stage: nextStage })
    .eq("id", input.invoiceId);
  if (error) return { ok: false, error: error.message };

  if (nextStage === "write_off_requested") {
    await supabase.from("write_off_requests").insert({
      invoice_id: input.invoiceId,
      client_id: inv.client_id,
      matter_id: inv.matter_id,
      amount: asNumber(inv.balance_due),
      reason: "Collections escalation — write-off requested",
      status: "pending",
      requested_by: input.actor.name,
    });
  }

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "Accounts Receivable",
    action: "Escalate Collection",
    recordType: "invoice",
    recordId: input.invoiceId,
    description: `Escalated ${inv.invoice_number} to ${nextStage.replace(/_/g, " ")}`,
    riskLevel: "Medium",
  });

  return { ok: true, nextStage };
}

export async function approveExternalCollections(input: {
  invoiceId: string;
  approver: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  if (input.approver.role !== "managing_partner") {
    return {
      ok: false,
      error: "Only the Managing Partner can approve external collections.",
    };
  }

  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("escalation_stage, invoice_number")
    .eq("id", input.invoiceId)
    .single();
  if (invErr || !inv) {
    return { ok: false, error: invErr?.message ?? "Invoice not found" };
  }

  if (String(inv.escalation_stage) !== "write_off_requested") {
    return {
      ok: false,
      error:
        "External collections approval requires write-off requested stage.",
    };
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      escalation_stage: "external_collections",
      external_collections_approved: true,
      external_collections_approved_by: input.approver.name,
      external_collections_approved_at: new Date().toISOString(),
    })
    .eq("id", input.invoiceId);
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actorName: input.approver.name,
    actorRole: input.approver.role,
    module: "Accounts Receivable",
    action: "Approve External Collections",
    recordType: "invoice",
    recordId: input.invoiceId,
    description: `Managing Partner approved external collections for ${inv.invoice_number}`,
    riskLevel: "High",
  });

  return { ok: true };
}

export async function releaseMatterBillingHold(input: {
  matterId: string;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = getAccountingSupabase();
  if (!supabase) return { ok: false, error: "Supabase unavailable" };

  const { error } = await supabase.from("matter_accounting_profiles").upsert(
    {
      matter_id: input.matterId,
      billing_hold: false,
      financial_status: "On Track",
    },
    { onConflict: "matter_id" },
  );
  if (error) return { ok: false, error: error.message };

  await logAuditEvent({
    actorName: input.actor.name,
    actorRole: input.actor.role,
    module: "Matter Financials",
    action: "Release Billing Hold",
    recordType: "matter",
    recordId: input.matterId,
    description: "Billing hold released",
  });

  return { ok: true };
}

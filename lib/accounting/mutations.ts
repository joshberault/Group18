import { getAccountingSupabase, logAuditEvent, asNumber } from "./db";

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
    })
    .select("id")
    .single();
  if (payErr) return { ok: false, error: payErr.message };

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

  const { error: txErr } = await supabase.from("trust_transactions").insert({
    trust_account_id: input.trustAccountId,
    client_id: input.toClientId ?? input.fromClientId ?? null,
    matter_id: input.matterId ?? null,
    transaction_type: "Transfer",
    description: input.description,
    amount: input.amount,
    status: "Posted",
  });
  if (txErr) return { ok: false, error: txErr.message };

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

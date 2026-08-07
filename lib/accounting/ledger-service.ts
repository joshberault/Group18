import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";
import type {
  CloseTask,
  GlLine,
  GlSummaryKpi,
  JournalEntry,
  JournalEntryLine,
  RevenueRecognitionItem,
  TrialBalanceRow,
} from "@/lib/mock-data/accounting-manager/gl";

export async function fetchRevenueLedgerWorkspace(): Promise<
  QueryResult<{
    kpis: GlSummaryKpi[];
    journalEntries: JournalEntry[];
    revenueItems: RevenueRecognitionItem[];
    glLines: GlLine[];
    trialBalance: TrialBalanceRow[];
    closeTasks: CloseTask[];
    chartOfAccounts: { code: string; name: string }[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = {
    kpis: [],
    journalEntries: [],
    revenueItems: [],
    glLines: [],
    trialBalance: [],
    closeTasks: [],
    chartOfAccounts: [] as { code: string; name: string }[],
  };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [entriesRes, linesRes, revRes, coaRes, tasksRes, clientsRes, mattersRes] =
    await Promise.all([
      supabase.from("journal_entries").select("*").order("entry_date", { ascending: false }),
      supabase.from("journal_entry_lines").select("*"),
      supabase.from("revenue_recognition_items").select("*"),
      supabase.from("chart_of_accounts").select("*").eq("is_active", true),
      supabase.from("month_end_close_tasks").select("*"),
      supabase.from("clients").select("id, name"),
      supabase.from("matters").select("id, title"),
    ]);

  if (entriesRes.error) {
    return { data: empty, error: entriesRes.error.message, empty: true };
  }

  const linesByEntry = new Map<string, JournalEntryLine[]>();
  for (const line of linesRes.data ?? []) {
    const eid = line.journal_entry_id as string;
    const arr = linesByEntry.get(eid) ?? [];
    arr.push({
      id: line.id as string,
      accountCode: line.account_code as string,
      accountName: line.account_name as string,
      description: line.description as string,
      debit: asNumber(line.debit),
      credit: asNumber(line.credit),
    });
    linesByEntry.set(eid, arr);
  }

  const clientNames = new Map(
    (clientsRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );
  const matterNames = new Map(
    (mattersRes.data ?? []).map((m) => [m.id as string, m.title as string]),
  );

  const journalEntries: JournalEntry[] = (entriesRes.data ?? []).map((e) => ({
    id: e.id as string,
    entryNumber: e.entry_number as string,
    date: e.entry_date as string,
    description: e.description as string,
    status: e.status as JournalEntry["status"],
    totalDebit: asNumber(e.total_debit),
    totalCredit: asNumber(e.total_credit),
    createdBy: (e.created_by as string) ?? "",
    postedDate: e.posted_at ? String(e.posted_at).slice(0, 10) : undefined,
    lines: linesByEntry.get(e.id as string) ?? [],
  }));

  const revenueItems: RevenueRecognitionItem[] = (revRes.data ?? []).map((r) => ({
    id: r.id as string,
    client: r.client_id ? clientNames.get(r.client_id as string) ?? "" : "",
    matter: r.matter_id ? matterNames.get(r.matter_id as string) ?? "" : "",
    matterNumber: "",
    invoiceNumber: (r.invoice_number as string) ?? "",
    invoiceDate: (r.invoice_date as string) ?? "",
    totalAmount: asNumber(r.total_amount),
    recognizedAmount: asNumber(r.recognized_amount),
    deferredAmount: asNumber(r.deferred_amount),
    recognitionMethod: r.recognition_method as RevenueRecognitionItem["recognitionMethod"],
    status: r.status as RevenueRecognitionItem["status"],
    period: (r.period_label as string) ?? "",
  }));

  const trialBalanceSeed: TrialBalanceRow[] = (coaRes.data ?? []).map((a) => ({
    id: a.id as string,
    accountCode: a.account_code as string,
    accountName: a.account_name as string,
    accountType: a.account_type as TrialBalanceRow["accountType"],
    debit: 0,
    credit: 0,
  }));

  const postedEntries = journalEntries.filter((entry) => entry.status === "Posted");
  const glLines = buildGeneralLedgerLines(postedEntries);
  const trialBalance = applyTrialBalanceTotals(trialBalanceSeed, postedEntries);

  const closeTasks: CloseTask[] = (tasksRes.data ?? []).map((t) => ({
    id: t.id as string,
    task: t.task as string,
    category: t.category as string,
    assignee: (t.assignee as string) ?? "",
    dueDate: (t.due_date as string) ?? "",
    status: t.status as CloseTask["status"],
    dependencies: (t.dependencies as string[]) ?? [],
  }));

  const pendingJe = journalEntries.filter((j) => j.status === "Draft").length;
  const kpis: GlSummaryKpi[] = [
    {
      id: "pending-je",
      title: "Pending Journal Entries",
      value: String(pendingJe),
      supportingText: "Awaiting approval or posting",
      warning: pendingJe > 0,
    },
    {
      id: "close-tasks",
      title: "Month-End Tasks",
      value: String(closeTasks.filter((t) => t.status !== "Complete").length),
      supportingText: "Incomplete close checklist items",
      warning: true,
    },
  ];

  const chartOfAccounts = (coaRes.data ?? []).map((a) => ({
    code: a.account_code as string,
    name: a.account_name as string,
  }));

  return {
    data: {
      kpis,
      journalEntries,
      revenueItems,
      glLines,
      trialBalance,
      closeTasks,
      chartOfAccounts,
    },
    error: null,
    empty: journalEntries.length === 0 && closeTasks.length === 0,
  };
}

function buildGeneralLedgerLines(postedEntries: JournalEntry[]): GlLine[] {
  const chronological = [...postedEntries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.entryNumber.localeCompare(b.entryNumber),
  );
  const balanceByAccount = new Map<string, number>();
  const lines: GlLine[] = [];

  for (const entry of chronological) {
    for (const line of entry.lines) {
      const previous = balanceByAccount.get(line.accountCode) ?? 0;
      const next = previous + line.debit - line.credit;
      balanceByAccount.set(line.accountCode, next);
      lines.push({
        id: `${entry.id}-${line.id}`,
        date: entry.date,
        entryNumber: entry.entryNumber,
        accountCode: line.accountCode,
        accountName: line.accountName,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        balance: next,
      });
    }
  }

  return lines.reverse();
}

function applyTrialBalanceTotals(
  rows: TrialBalanceRow[],
  postedEntries: JournalEntry[],
): TrialBalanceRow[] {
  const totals = new Map<string, { debit: number; credit: number }>();

  for (const entry of postedEntries) {
    for (const line of entry.lines) {
      const current = totals.get(line.accountCode) ?? { debit: 0, credit: 0 };
      current.debit += line.debit;
      current.credit += line.credit;
      totals.set(line.accountCode, current);
    }
  }

  return rows.map((row) => {
    const accountTotals = totals.get(row.accountCode);
    if (!accountTotals) return row;
    return {
      ...row,
      debit: accountTotals.debit,
      credit: accountTotals.credit,
    };
  });
}

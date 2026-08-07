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
      supabase.from("month_end_close_tasks").select("*").order("due_date"),
      supabase.from("clients").select("id, name"),
      supabase.from("matters").select("id, title"),
    ]);

  if (entriesRes.error) {
    return { data: empty, error: entriesRes.error.message, empty: true };
  }

  const linesByEntry = new Map<string, JournalEntryLine[]>();
  const rawLines = [...(linesRes.data ?? [])].sort(
    (a, b) => asNumber(a.sort_order) - asNumber(b.sort_order),
  );
  for (const line of rawLines) {
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

  const postedLines = journalEntries
    .filter((e) => e.status === "Posted")
    .flatMap((e) =>
      e.lines.map((line) => ({
        entryDate: e.date,
        entryNumber: e.entryNumber,
        line,
      })),
    )
    .sort((a, b) => {
      const dateCmp = a.entryDate.localeCompare(b.entryDate);
      if (dateCmp !== 0) return dateCmp;
      return a.entryNumber.localeCompare(b.entryNumber);
    });

  const balanceByAccount = new Map<string, number>();
  const glLines: GlLine[] = postedLines.map((row, index) => {
    const { line, entryDate, entryNumber } = row;
    const prior = balanceByAccount.get(line.accountCode) ?? 0;
    const balance = prior + line.debit - line.credit;
    balanceByAccount.set(line.accountCode, balance);
    return {
      id: `gl-${line.id}-${index}`,
      date: entryDate,
      entryNumber,
      accountCode: line.accountCode,
      accountName: line.accountName,
      description: line.description,
      debit: line.debit,
      credit: line.credit,
      balance,
    };
  });

  const trialTotalsByAccount = new Map<string, { debit: number; credit: number }>();
  for (const row of postedLines) {
    const current = trialTotalsByAccount.get(row.line.accountCode) ?? {
      debit: 0,
      credit: 0,
    };
    current.debit += row.line.debit;
    current.credit += row.line.credit;
    trialTotalsByAccount.set(row.line.accountCode, current);
  }

  const trialBalance: TrialBalanceRow[] = (coaRes.data ?? []).map((a) => {
    const code = a.account_code as string;
    const totals = trialTotalsByAccount.get(code) ?? { debit: 0, credit: 0 };
    return {
      id: a.id as string,
      accountCode: code,
      accountName: a.account_name as string,
      accountType: a.account_type as TrialBalanceRow["accountType"],
      debit: totals.debit,
      credit: totals.credit,
    };
  });

  const closeTasks: CloseTask[] = (tasksRes.data ?? []).map((t) => ({
    id: t.id as string,
    task: t.task as string,
    category: t.category as string,
    assignee: (t.assignee as string) ?? "",
    dueDate: (t.due_date as string) ?? "",
    status: t.status as CloseTask["status"],
    dependencies: (t.dependencies as string[]) ?? [],
  }));

  const draftJe = journalEntries.filter((j) => j.status === "Draft").length;
  const deferredRevenue = revenueItems.reduce((sum, item) => sum + item.deferredAmount, 0);
  const recognizedRevenue = revenueItems.reduce(
    (sum, item) => sum + item.recognizedAmount,
    0,
  );
  const incompleteCloseTasks = closeTasks.filter((t) => t.status !== "Complete").length;
  const completeCloseTasks = closeTasks.filter((t) => t.status === "Complete").length;
  const closeProgress =
    closeTasks.length > 0
      ? Math.round((completeCloseTasks / closeTasks.length) * 100)
      : 0;
  const trialDebitTotal = trialBalance.reduce((sum, row) => sum + row.debit, 0);
  const trialCreditTotal = trialBalance.reduce((sum, row) => sum + row.credit, 0);
  const trialBalanced = trialDebitTotal === trialCreditTotal && trialDebitTotal > 0;

  const kpis: GlSummaryKpi[] = [
    {
      id: "revenue-mtd",
      title: "Revenue MTD",
      value: `$${recognizedRevenue.toLocaleString()}`,
      supportingText: "August 2026",
    },
    {
      id: "deferred-revenue",
      title: "Deferred Revenue",
      value: `$${deferredRevenue.toLocaleString()}`,
      supportingText: `${revenueItems.filter((item) => item.deferredAmount > 0).length} matters with unearned fees`,
      warning: deferredRevenue > 0,
    },
    {
      id: "draft-entries",
      title: "Draft Journal Entries",
      value: String(draftJe),
      supportingText: "Awaiting review",
      warning: draftJe > 0,
    },
    {
      id: "close-progress",
      title: "Month-End Close",
      value: `${closeProgress}%`,
      supportingText: `${completeCloseTasks} of ${closeTasks.length} tasks complete`,
      warning: incompleteCloseTasks > 0,
    },
    {
      id: "trial-balance",
      title: "Trial Balance",
      value: trialBalanced ? "Balanced" : "Out of Balance",
      supportingText: trialBalanced ? "Debits = Credits" : "Review posted entries",
      warning: !trialBalanced,
    },
    {
      id: "pending-je",
      title: "Posted Journal Entries",
      value: String(journalEntries.filter((j) => j.status === "Posted").length),
      supportingText: "Posted to general ledger",
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

import type {
  ApprovalSummary,
  CashMetric,
  ControlStatus,
  FinancialActivity,
  HotItem,
  WorkQueueItem,
} from "@/lib/accounting-manager/dashboard-data";
import {
  accountingUnavailableMessage,
  asNumber,
  getAccountingSupabase,
  type QueryResult,
} from "./db";

export async function fetchAccountingDashboard(): Promise<
  QueryResult<{
    hotItems: HotItem[];
    workQueue: WorkQueueItem[];
    controlStatuses: ControlStatus[];
    approvalSummaries: ApprovalSummary[];
    cashMetrics: CashMetric[];
    recentActivity: FinancialActivity[];
  }>
> {
  const supabase = getAccountingSupabase();
  const empty = {
    hotItems: [],
    workQueue: [],
    controlStatuses: [],
    approvalSummaries: [],
    cashMetrics: [],
    recentActivity: [],
  };
  if (!supabase) {
    return { data: empty, error: accountingUnavailableMessage(), empty: true };
  }

  const [
    writeOffsRes,
    trustExRes,
    closeTasksRes,
    apApprovalsRes,
    trustAccountsRes,
    bankAccountsRes,
    auditRes,
    invoicesRes,
  ] = await Promise.all([
    supabase
      .from("write_off_requests")
      .select("id, amount, status, created_at")
      .in("status", ["pending", "under_review"]),
    supabase
      .from("trust_exceptions")
      .select("id, severity, status, created_at")
      .eq("status", "Open"),
    supabase
      .from("month_end_close_tasks")
      .select("id, task, status, due_date, assignee")
      .neq("status", "Complete"),
    supabase
      .from("ap_payment_approvals")
      .select("id, amount, status")
      .eq("status", "Pending"),
    supabase.from("trust_accounts").select("balance, reconciliation_status"),
    supabase.from("bank_accounts").select("balance, name"),
    supabase
      .from("audit_events")
      .select("id, description, event_timestamp, module")
      .order("event_timestamp", { ascending: false })
      .limit(8),
    supabase
      .from("invoices")
      .select("balance_due, due_date")
      .gt("balance_due", 0),
  ]);

  const pendingWriteOffs = writeOffsRes.data ?? [];
  const writeOffTotal = pendingWriteOffs.reduce(
    (s, w) => s + asNumber(w.amount),
    0,
  );
  const trustExceptions = trustExRes.data ?? [];
  const closeTasks = closeTasksRes.data ?? [];
  const apPending = apApprovalsRes.data ?? [];

  const hotItems: HotItem[] = [];
  if (pendingWriteOffs.length > 0) {
    hotItems.push({
      id: "write-offs",
      title: "Write-off requests awaiting approval",
      amountOrCount: `${pendingWriteOffs.length} · $${writeOffTotal.toLocaleString()}`,
      urgency: "high",
      dueOrAge: "Review queue",
      module: "Accounts Receivable",
      href: "/receivables?section=write-offs",
    });
  }
  if (trustExceptions.length > 0) {
    hotItems.push({
      id: "trust-ex",
      title: "Trust exceptions requiring review",
      amountOrCount: `${trustExceptions.length} exceptions`,
      urgency: "critical",
      dueOrAge: "Open items",
      module: "Trust Accounting",
      href: "/accounting/trust?focus=exceptions",
    });
  }

  const workQueue: WorkQueueItem[] = closeTasks.slice(0, 6).map((t) => ({
    id: t.id as string,
    priority: "medium" as const,
    task: t.task as string,
    action: "Close" as const,
    module: "Month-End Close",
    record: t.task as string,
    dueDate: (t.due_date as string) ?? "",
    owner: (t.assignee as string) ?? "Accounting",
    href: "/accounting/ledger?tab=month-end-close",
  }));

  const trustTotal = (trustAccountsRes.data ?? []).reduce(
    (s, a) => s + asNumber(a.balance),
    0,
  );
  const bankTotal = (bankAccountsRes.data ?? []).reduce(
    (s, a) => s + asNumber(a.balance),
    0,
  );

  let pastDueAr = 0;
  const now = Date.now();
  for (const inv of invoicesRes.data ?? []) {
    const due = new Date(inv.due_date as string).getTime();
    if (due < now) pastDueAr += asNumber(inv.balance_due);
  }

  const cashMetrics: CashMetric[] = [
    {
      id: "trust",
      label: "Trust Cash",
      value: `$${trustTotal.toLocaleString()}`,
      href: "/accounting/trust",
    },
    {
      id: "operating",
      label: "Operating Cash",
      value: `$${bankTotal.toLocaleString()}`,
      href: "/accounting/banking",
    },
    {
      id: "ar",
      label: "Past Due AR",
      value: `$${pastDueAr.toLocaleString()}`,
      href: "/receivables",
    },
  ];

  const approvalSummaries: ApprovalSummary[] = [
    {
      id: "write-offs",
      label: "Write-Offs",
      count: pendingWriteOffs.length,
      value: `$${writeOffTotal.toLocaleString()}`,
      href: "/receivables?section=write-offs",
    },
    {
      id: "ap",
      label: "AP Payments",
      count: apPending.length,
      value: `$${apPending.reduce((s, a) => s + asNumber(a.amount), 0).toLocaleString()}`,
      href: "/accounting/ap",
    },
  ];

  const controlStatuses: ControlStatus[] = [
    {
      id: "trust-recon",
      label: "Trust Reconciliation",
      status: trustExceptions.length > 0 ? "At Risk" : "On Track",
      detail:
        trustExceptions.length > 0
          ? `${trustExceptions.length} open exceptions`
          : "No open exceptions",
      href: "/accounting/trust",
    },
    {
      id: "close",
      label: "Month-End Close",
      status: closeTasks.length > 3 ? "In Progress" : "On Track",
      detail: `${closeTasks.length} tasks remaining`,
      href: "/accounting/ledger?tab=month-end-close",
    },
  ];

  const recentActivity: FinancialActivity[] = (auditRes.data ?? []).map(
    (e) => ({
      id: e.id as string,
      title: e.description as string,
      detail: e.module as string,
      timestamp: String(e.event_timestamp),
      href: "/accounting/audit",
    }),
  );

  return {
    data: {
      hotItems,
      workQueue,
      controlStatuses,
      approvalSummaries,
      cashMetrics,
      recentActivity,
    },
    error: null,
    empty: hotItems.length === 0 && workQueue.length === 0,
  };
}

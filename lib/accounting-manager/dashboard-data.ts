/**
 * Accounting Manager dashboard — hot items, work queue, and deep-link targets.
 */

export type Urgency = "critical" | "high" | "medium" | "low";

export interface HotItem {
  id: string;
  title: string;
  amountOrCount: string;
  urgency: Urgency;
  dueOrAge: string;
  owner?: string;
  module: string;
  href: string;
}

export interface WorkQueueItem {
  id: string;
  priority: Urgency;
  task: string;
  action: "Review" | "Approve" | "Reconcile" | "Follow Up" | "Resolve" | "Prepare" | "Close";
  module: string;
  record: string;
  dueDate: string;
  owner: string;
  href: string;
}

export interface ControlStatus {
  id: string;
  label: string;
  status: "On Track" | "At Risk" | "Overdue" | "In Progress";
  detail: string;
  href: string;
}

export interface ApprovalSummary {
  id: string;
  label: string;
  count: number;
  value: string;
  href: string;
}

export interface CashMetric {
  id: string;
  label: string;
  value: string;
  href: string;
}

export interface FinancialActivity {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  href: string;
}

export const AM_HOT_ITEMS: HotItem[] = [
  {
    id: "hi-1",
    title: "Write-off requests awaiting approval",
    amountOrCount: "6 · $24,300",
    urgency: "high",
    dueOrAge: "Oldest 12 days",
    owner: "Alex Morgan",
    module: "Accounts Receivable",
    href: "/receivables?section=write-offs",
  },
  {
    id: "hi-2",
    title: "Trust exceptions requiring review",
    amountOrCount: "5 exceptions",
    urgency: "critical",
    dueOrAge: "Due today",
    module: "Trust Accounting",
    href: "/accounting/trust?focus=exceptions",
  },
  {
    id: "hi-3",
    title: "Three-way reconciliation out of balance",
    amountOrCount: "$250 variance",
    urgency: "critical",
    dueOrAge: "Due today",
    module: "Trust Accounting",
    href: "/accounting/trust?focus=reconciliation",
  },
  {
    id: "hi-4",
    title: "Attorney billing approvals pending",
    amountOrCount: "18 prebills",
    urgency: "high",
    dueOrAge: "5 overdue",
    module: "Billing",
    href: "/billing?status=awaiting-approval",
  },
  {
    id: "hi-5",
    title: "Invoices with no collection activity (30+ days)",
    amountOrCount: "12 invoices",
    urgency: "medium",
    dueOrAge: "30–45 days idle",
    module: "Accounts Receivable",
    href: "/receivables?kpi=stale",
  },
  {
    id: "hi-6",
    title: "Unapplied payments",
    amountOrCount: "9 · $18,650",
    urgency: "high",
    dueOrAge: "Oldest 8 days",
    module: "Accounts Receivable",
    href: "/receivables?section=payment-exceptions&filter=unapplied",
  },
  {
    id: "hi-7",
    title: "Failed payments",
    amountOrCount: "3 · $9,200",
    urgency: "high",
    dueOrAge: "This week",
    module: "Accounts Receivable",
    href: "/receivables?section=payment-exceptions&filter=failed",
  },
  {
    id: "hi-8",
    title: "Vendor bills due within 3 days",
    amountOrCount: "4 bills · $31,400",
    urgency: "high",
    dueOrAge: "Due Aug 8",
    module: "Expenses & AP",
    href: "/accounting/accounts-payable?tab=approvals",
  },
  {
    id: "hi-9",
    title: "Bank reconciliations overdue",
    amountOrCount: "2 accounts",
    urgency: "critical",
    dueOrAge: "3 days overdue",
    module: "Banking",
    href: "/accounting/banking?tab=reconciliation",
  },
  {
    id: "hi-10",
    title: "Journal entries awaiting approval",
    amountOrCount: "4 entries",
    urgency: "medium",
    dueOrAge: "Due Aug 10",
    module: "Revenue & GL",
    href: "/accounting/revenue-ledger?tab=journal&status=pending",
  },
  {
    id: "hi-11",
    title: "Matters over budget",
    amountOrCount: "3 matters",
    urgency: "medium",
    dueOrAge: "Review this week",
    module: "Matters",
    href: "/matters?filter=over-budget",
  },
  {
    id: "hi-12",
    title: "Matters below minimum retainer",
    amountOrCount: "7 matters",
    urgency: "medium",
    dueOrAge: "Replenishment needed",
    module: "Matters",
    href: "/matters?filter=low-retainer",
  },
  {
    id: "hi-13",
    title: "Month-end close tasks incomplete",
    amountOrCount: "5 tasks",
    urgency: "high",
    dueOrAge: "Close Aug 31",
    module: "Revenue & GL",
    href: "/accounting/revenue-ledger?tab=close",
  },
];

export const AM_WORK_QUEUE: WorkQueueItem[] = [
  {
    id: "wq-1",
    priority: "critical",
    task: "Reconcile IOLTA three-way variance",
    action: "Reconcile",
    module: "Trust Accounting",
    record: "IOLTA Operating",
    dueDate: "2026-08-05",
    owner: "Alex Morgan",
    href: "/accounting/trust?focus=reconciliation",
  },
  {
    id: "wq-2",
    priority: "high",
    task: "Approve write-off batch — Meridian Capital",
    action: "Approve",
    module: "Accounts Receivable",
    record: "WO-2026-0142",
    dueDate: "2026-08-06",
    owner: "Alex Morgan",
    href: "/receivables?section=write-offs",
  },
  {
    id: "wq-3",
    priority: "high",
    task: "Review operating bank reconciliation",
    action: "Reconcile",
    module: "Banking",
    record: "Operating · July",
    dueDate: "2026-08-07",
    owner: "Alex Morgan",
    href: "/accounting/banking?tab=reconciliation",
  },
  {
    id: "wq-4",
    priority: "medium",
    task: "Follow up on unapplied cash — Northwind",
    action: "Follow Up",
    module: "Accounts Receivable",
    record: "PAY-8842",
    dueDate: "2026-08-06",
    owner: "Collections",
    href: "/receivables?section=payment-exceptions&filter=unapplied",
  },
  {
    id: "wq-5",
    priority: "medium",
    task: "Approve vendor payment — Westlake Legal Supplies",
    action: "Approve",
    module: "Expenses & AP",
    record: "BILL-9031",
    dueDate: "2026-08-08",
    owner: "Alex Morgan",
    href: "/accounting/accounts-payable?tab=approvals",
  },
  {
    id: "wq-6",
    priority: "medium",
    task: "Post revenue recognition entries",
    action: "Prepare",
    module: "Revenue & GL",
    record: "JE-2026-081",
    dueDate: "2026-08-09",
    owner: "Alex Morgan",
    href: "/accounting/revenue-ledger?tab=journal",
  },
  {
    id: "wq-7",
    priority: "low",
    task: "Close July accounting period",
    action: "Close",
    module: "Revenue & GL",
    record: "Period 2026-07",
    dueDate: "2026-08-15",
    owner: "Alex Morgan",
    href: "/accounting/revenue-ledger?tab=close",
  },
];

export const AM_CONTROL_STATUSES: ControlStatus[] = [
  {
    id: "cs-1",
    label: "Billing Cycle Progress",
    status: "In Progress",
    detail: "68% of August cycle complete",
    href: "/billing",
  },
  {
    id: "cs-2",
    label: "A/R Collection Health",
    status: "At Risk",
    detail: "$142K past due · 18% of AR",
    href: "/receivables",
  },
  {
    id: "cs-3",
    label: "Trust Reconciliation",
    status: "Overdue",
    detail: "1 exception open",
    href: "/accounting/trust?focus=reconciliation",
  },
  {
    id: "cs-4",
    label: "Bank Reconciliation",
    status: "At Risk",
    detail: "Operating account due Aug 8",
    href: "/accounting/banking?tab=reconciliation",
  },
  {
    id: "cs-5",
    label: "Revenue Recognition",
    status: "On Track",
    detail: "4 entries pending approval",
    href: "/accounting/revenue-ledger?tab=journal",
  },
  {
    id: "cs-6",
    label: "Accounts Payable",
    status: "In Progress",
    detail: "$31K due within 3 days",
    href: "/accounting/accounts-payable",
  },
  {
    id: "cs-7",
    label: "Month-End Close",
    status: "In Progress",
    detail: "5 of 12 tasks complete",
    href: "/accounting/revenue-ledger?tab=close",
  },
];

export const AM_APPROVAL_SUMMARIES: ApprovalSummary[] = [
  { id: "ap-1", label: "Write-offs", count: 6, value: "$24,300", href: "/receivables?section=write-offs" },
  { id: "ap-2", label: "Journal entries", count: 4, value: "$186,420", href: "/accounting/revenue-ledger?tab=journal&status=pending" },
  { id: "ap-3", label: "Vendor bills", count: 4, value: "$31,400", href: "/accounting/accounts-payable?tab=approvals" },
  { id: "ap-4", label: "Payments", count: 2, value: "$12,800", href: "/accounting/accounts-payable?tab=payments" },
  { id: "ap-5", label: "Credit memos", count: 1, value: "$2,400", href: "/receivables?section=write-offs" },
  { id: "ap-6", label: "Trust withdrawals", count: 2, value: "$8,500", href: "/accounting/trust?focus=withdrawals" },
];

export const AM_CASH_METRICS: CashMetric[] = [
  { id: "cm-1", label: "Operating Cash", value: "$842,600", href: "/accounting/banking" },
  { id: "cm-2", label: "Trust Funds Held", value: "$1,284,200", href: "/accounting/trust" },
  { id: "cm-3", label: "Outstanding A/R", value: "$486,350", href: "/receivables" },
  { id: "cm-4", label: "90+ Day A/R", value: "$68,400", href: "/receivables?kpi=90plus" },
  { id: "cm-5", label: "Unapplied Cash", value: "$18,650", href: "/receivables?section=payment-exceptions&filter=unapplied" },
  { id: "cm-6", label: "Open Payables", value: "$94,200", href: "/accounting/accounts-payable" },
  { id: "cm-7", label: "Pending Revenue Recognition", value: "$42,800", href: "/accounting/revenue-ledger?tab=journal" },
];

export const AM_RECENT_ACTIVITY: FinancialActivity[] = [
  {
    id: "ra-1",
    title: "Payment applied",
    detail: "Summit Retail Group — $12,400 applied to INV-2026-0881",
    timestamp: "2026-08-05T14:22:00Z",
    href: "/receivables",
  },
  {
    id: "ra-2",
    title: "Write-off approved",
    detail: "Harborview LLC — $3,200 approved by Alex Morgan",
    timestamp: "2026-08-05T11:05:00Z",
    href: "/receivables?section=write-offs",
  },
  {
    id: "ra-3",
    title: "Trust exception resolved",
    detail: "IOLTA variance cleared — Northwind retainer",
    timestamp: "2026-08-04T16:40:00Z",
    href: "/accounting/trust",
  },
  {
    id: "ra-4",
    title: "Journal entry posted",
    detail: "JE-2026-079 — August revenue accrual $28,600",
    timestamp: "2026-08-04T10:15:00Z",
    href: "/accounting/revenue-ledger?tab=journal",
  },
  {
    id: "ra-5",
    title: "Bank reconciliation completed",
    detail: "Operating account — July 2026",
    timestamp: "2026-08-03T15:30:00Z",
    href: "/accounting/banking?tab=reconciliation",
  },
  {
    id: "ra-6",
    title: "Vendor payment approved",
    detail: "Westlake Legal Supplies — $4,820",
    timestamp: "2026-08-03T09:00:00Z",
    href: "/accounting/accounts-payable",
  },
];

const URGENCY_ORDER: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortHotItems(items: HotItem[]): HotItem[] {
  return [...items].sort(
    (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency],
  );
}

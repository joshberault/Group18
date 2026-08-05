import type { UserRole } from "@/lib/types";

export const ROLE_WELCOME_MESSAGES: Record<UserRole, string> = {
  managing_partner:
    "Firm-wide revenue, collections, and profitability at a glance.",
  attorney: "Your matters, deadlines, and unbilled time for the week.",
  paralegal: "Assigned tasks, matter deadlines, and document workflows.",
  billing_specialist:
    "Billing queues, invoice status, and accounts receivable aging.",
  accounting_manager:
    "Trust accounting, revenue recognition, and financial controls.",
  firm_administrator:
    "Operational oversight across clients, staff, and firm settings.",
  client: "Your matters, invoices, and trust balance summary.",
};

export const ROLE_SUMMARY_TITLES: Record<UserRole, string> = {
  managing_partner: "Managing Partner Summary",
  attorney: "Attorney Workload Summary",
  paralegal: "Paralegal Task Summary",
  billing_specialist: "Billing Operations Summary",
  accounting_manager: "Accounting Operations Summary",
  firm_administrator: "Firm Administration Summary",
  client: "Client Portal Preview",
};

export const ROLE_SUMMARY_CONTENT: Record<UserRole, string> = {
  managing_partner:
    "12 active matters require partner review. Collections are 8% above last month. Two matters show declining profitability.",
  attorney:
    "You have 6 open matters, 14.5 unbilled hours this week, and 3 deadlines in the next 7 days.",
  paralegal:
    "8 tasks assigned across 4 matters. 2 filing deadlines are due within 48 hours.",
  billing_specialist:
    "18 invoices in draft, 7 awaiting approval, and $142,400 in outstanding receivables.",
  accounting_manager:
    "Trust balances reconciled through July. 4 invoices pending revenue recognition. 2 write-off requests awaiting review.",
  firm_administrator:
    "User access reviews due this month. 3 new client onboarding requests pending assignment.",
  client:
    "2 open matters, 1 outstanding invoice, and $12,500 in trust funds on account.",
};

export const dashboardKpis = {
  activeMatters: 48,
  unbilledTimeHours: 312.5,
  outstandingAR: 428750,
  trustFundsHeld: 892400,
  monthlyCollections: 312500,
};

export const upcomingDeadlines = [
  {
    id: "dl-1",
    matter: "Meridian Acquisition",
    task: "File amended complaint",
    dueDate: "2026-08-08",
    priority: "high" as const,
  },
  {
    id: "dl-2",
    matter: "Hartwell IP Portfolio",
    task: "Patent response deadline",
    dueDate: "2026-08-10",
    priority: "critical" as const,
  },
  {
    id: "dl-3",
    matter: "Summit Employment Dispute",
    task: "Discovery production",
    dueDate: "2026-08-12",
    priority: "medium" as const,
  },
  {
    id: "dl-4",
    matter: "Northgate Regulatory Review",
    task: "Compliance filing",
    dueDate: "2026-08-15",
    priority: "high" as const,
  },
];

export const recentActivity = [
  {
    id: "act-1",
    action: "Invoice sent",
    detail: "INV-2026-0842 to Hartwell Industries — $18,400",
    timestamp: "2 hours ago",
  },
  {
    id: "act-2",
    action: "Time approved",
    detail: "6.5 hours approved on Meridian Acquisition",
    timestamp: "4 hours ago",
  },
  {
    id: "act-3",
    action: "Payment received",
    detail: "$45,000 ACH from Summit Holdings",
    timestamp: "Yesterday",
  },
  {
    id: "act-4",
    action: "Matter opened",
    detail: "Northgate Regulatory Review — Matter 2026-014",
    timestamp: "Yesterday",
  },
  {
    id: "act-5",
    action: "Trust deposit",
    detail: "$25,000 retainer posted for Hartwell Industries",
    timestamp: "2 days ago",
  },
];

export const matterProfitability = [
  { matter: "Meridian Acquisition", revenue: 185000, costs: 98000, margin: 47 },
  { matter: "Hartwell IP Portfolio", revenue: 142000, costs: 72000, margin: 49 },
  { matter: "Summit Employment", revenue: 98000, costs: 61000, margin: 38 },
  { matter: "Northgate Regulatory", revenue: 76000, costs: 52000, margin: 32 },
  { matter: "Crestview Litigation", revenue: 54000, costs: 48000, margin: 11 },
];

export const invoiceStatusSummary = [
  { status: "Draft", count: 18, amount: 124500 },
  { status: "Sent", count: 24, amount: 198750 },
  { status: "Partial", count: 6, amount: 45200 },
  { status: "Paid", count: 42, amount: 312500 },
  { status: "Written Off", count: 2, amount: 8500 },
];

export const monthlyCollectionsChart = [
  { month: "Mar", amount: 245000 },
  { month: "Apr", amount: 268000 },
  { month: "May", amount: 289500 },
  { month: "Jun", amount: 275200 },
  { month: "Jul", amount: 298400 },
  { month: "Aug", amount: 312500 },
];

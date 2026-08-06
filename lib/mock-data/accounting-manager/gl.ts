import { amClients, amMatters } from "./entities";

export type JournalEntryStatus = "Draft" | "Posted" | "Reversed";
export type RevenueRecognitionStatus =
  | "Recognized"
  | "Deferred"
  | "Partial"
  | "Pending";
export type CloseTaskStatus = "Not Started" | "In Progress" | "Complete" | "Blocked";

export interface GlSummaryKpi {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  warning?: boolean;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: JournalEntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  postedDate?: string;
  lines: JournalEntryLine[];
}

export interface RevenueRecognitionItem {
  id: string;
  client: string;
  matter: string;
  matterNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  recognizedAmount: number;
  deferredAmount: number;
  recognitionMethod: "Accrual" | "Cash" | "Milestone" | "Flat Fee";
  status: RevenueRecognitionStatus;
  period: string;
}

export interface GlLine {
  id: string;
  date: string;
  entryNumber: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceRow {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  debit: number;
  credit: number;
}

export interface CloseTask {
  id: string;
  task: string;
  category: string;
  assignee: string;
  dueDate: string;
  status: CloseTaskStatus;
  dependencies: string[];
}

export const glSummaryKpis: GlSummaryKpi[] = [
  {
    id: "revenue-mtd",
    title: "Revenue MTD",
    value: "$428,600",
    supportingText: "August 2026",
  },
  {
    id: "deferred-revenue",
    title: "Deferred Revenue",
    value: "$86,400",
    supportingText: "12 matters with unearned fees",
    warning: true,
  },
  {
    id: "draft-entries",
    title: "Draft Journal Entries",
    value: "3",
    supportingText: "Awaiting review",
  },
  {
    id: "close-progress",
    title: "Month-End Close",
    value: "62%",
    supportingText: "8 of 13 tasks complete",
  },
  {
    id: "trial-balance",
    title: "Trial Balance",
    value: "Balanced",
    supportingText: "Debits = Credits",
  },
  {
    id: "unposted-wip",
    title: "Unposted WIP Accrual",
    value: "$74,200",
    supportingText: "Scheduled for close",
    warning: true,
  },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "je-001",
    entryNumber: "JE-2026-0842",
    date: "2026-08-04",
    description: "August client receipt – Northwind Holdings",
    status: "Posted",
    totalDebit: 22400,
    totalCredit: 22400,
    createdBy: "Alex Morgan",
    postedDate: "2026-08-04",
    lines: [
      {
        id: "jel-001",
        accountCode: "1010",
        accountName: "Cash – Operating",
        description: "Client payment received",
        debit: 22400,
        credit: 0,
      },
      {
        id: "jel-002",
        accountCode: "1200",
        accountName: "Accounts Receivable",
        description: "Apply to INV-2847",
        debit: 0,
        credit: 22400,
      },
    ],
  },
  {
    id: "je-002",
    entryNumber: "JE-2026-0841",
    date: "2026-08-03",
    description: "WIP accrual – Beacon Medical flat fee",
    status: "Posted",
    totalDebit: 8400,
    totalCredit: 8400,
    createdBy: "Alex Morgan",
    postedDate: "2026-08-03",
    lines: [
      {
        id: "jel-003",
        accountCode: "1350",
        accountName: "Work in Process",
        description: "Unbilled WIP accrual",
        debit: 8400,
        credit: 0,
      },
      {
        id: "jel-004",
        accountCode: "4100",
        accountName: "Legal Services Revenue",
        description: "Revenue recognition",
        debit: 0,
        credit: 8400,
      },
    ],
  },
  {
    id: "je-003",
    entryNumber: "JE-2026-0840",
    date: "2026-08-02",
    description: "Office supplies expense allocation",
    status: "Draft",
    totalDebit: 1250,
    totalCredit: 1250,
    createdBy: "Alex Morgan",
    lines: [
      {
        id: "jel-005",
        accountCode: "6200",
        accountName: "Office Supplies",
        description: "Q3 supply order",
        debit: 1250,
        credit: 0,
      },
      {
        id: "jel-006",
        accountCode: "2010",
        accountName: "Accounts Payable",
        description: "Vendor invoice pending",
        debit: 0,
        credit: 1250,
      },
    ],
  },
  {
    id: "je-004",
    entryNumber: "JE-2026-0839",
    date: "2026-08-01",
    description: "Trust transfer to operating",
    status: "Posted",
    totalDebit: 2200,
    totalCredit: 2200,
    createdBy: "Alex Morgan",
    postedDate: "2026-08-01",
    lines: [
      {
        id: "jel-007",
        accountCode: "1010",
        accountName: "Cash – Operating",
        description: "Trust fee transfer",
        debit: 2200,
        credit: 0,
      },
      {
        id: "jel-008",
        accountCode: "2100",
        accountName: "Client Trust Liability",
        description: "Reduce trust liability",
        debit: 0,
        credit: 2200,
      },
    ],
  },
];

export const revenueRecognitionItems: RevenueRecognitionItem[] = [
  {
    id: "rr-001",
    client: "Beacon Medical Partners",
    matter: "Healthcare Compliance Audit",
    matterNumber: "2026-HC-0012",
    invoiceNumber: "INV-2890",
    invoiceDate: "2026-07-15",
    totalAmount: 45000,
    recognizedAmount: 29400,
    deferredAmount: 15600,
    recognitionMethod: "Flat Fee",
    status: "Partial",
    period: "August 2026",
  },
  {
    id: "rr-002",
    client: "Northwind Holdings LLC",
    matter: "Commercial Lease Dispute",
    matterNumber: "2025-CL-0412",
    invoiceNumber: "INV-2847",
    invoiceDate: "2026-06-20",
    totalAmount: 48200,
    recognizedAmount: 48200,
    deferredAmount: 0,
    recognitionMethod: "Accrual",
    status: "Recognized",
    period: "August 2026",
  },
  {
    id: "rr-003",
    client: "Summit Retail Group",
    matter: "Employment Litigation",
    matterNumber: "2025-EL-0298",
    invoiceNumber: "INV-2901",
    invoiceDate: "2026-07-28",
    totalAmount: 36850,
    recognizedAmount: 14200,
    deferredAmount: 22650,
    recognitionMethod: "Accrual",
    status: "Deferred",
    period: "August 2026",
  },
  {
    id: "rr-004",
    client: "Atlas Construction Co.",
    matter: "Surety Bond Claim",
    matterNumber: "2026-SB-0004",
    invoiceNumber: "INV-2918",
    invoiceDate: "2026-08-01",
    totalAmount: 22800,
    recognizedAmount: 0,
    deferredAmount: 22800,
    recognitionMethod: "Milestone",
    status: "Pending",
    period: "August 2026",
  },
  {
    id: "rr-005",
    client: "Greenfield Energy Corp.",
    matter: "Environmental Permitting",
    matterNumber: "2025-EP-0189",
    invoiceNumber: "INV-2915",
    invoiceDate: "2026-07-22",
    totalAmount: 18400,
    recognizedAmount: 18400,
    deferredAmount: 0,
    recognitionMethod: "Cash",
    status: "Recognized",
    period: "August 2026",
  },
];

export const glLines: GlLine[] = [
  {
    id: "gl-001",
    date: "2026-08-04",
    entryNumber: "JE-2026-0842",
    accountCode: "1010",
    accountName: "Cash – Operating",
    description: "Client payment – Northwind",
    debit: 22400,
    credit: 0,
    balance: 524800,
  },
  {
    id: "gl-002",
    date: "2026-08-04",
    entryNumber: "JE-2026-0842",
    accountCode: "1200",
    accountName: "Accounts Receivable",
    description: "Apply to INV-2847",
    debit: 0,
    credit: 22400,
    balance: 186400,
  },
  {
    id: "gl-003",
    date: "2026-08-03",
    entryNumber: "JE-2026-0841",
    accountCode: "1350",
    accountName: "Work in Process",
    description: "WIP accrual",
    debit: 8400,
    credit: 0,
    balance: 74200,
  },
  {
    id: "gl-004",
    date: "2026-08-03",
    entryNumber: "JE-2026-0841",
    accountCode: "4100",
    accountName: "Legal Services Revenue",
    description: "Revenue recognition",
    debit: 0,
    credit: 8400,
    balance: 428600,
  },
  {
    id: "gl-005",
    date: "2026-08-01",
    entryNumber: "JE-2026-0839",
    accountCode: "2100",
    accountName: "Client Trust Liability",
    description: "Trust fee transfer",
    debit: 0,
    credit: 2200,
    balance: 107500,
  },
  {
    id: "gl-006",
    date: "2026-08-01",
    entryNumber: "JE-2026-0839",
    accountCode: "1010",
    accountName: "Cash – Operating",
    description: "Trust transfer received",
    debit: 2200,
    credit: 0,
    balance: 502400,
  },
];

export const trialBalance: TrialBalanceRow[] = [
  { id: "tb-001", accountCode: "1010", accountName: "Cash – Operating", accountType: "Asset", debit: 524800, credit: 0 },
  { id: "tb-002", accountCode: "1050", accountName: "Cash – Trust (IOLTA)", accountType: "Asset", debit: 107500, credit: 0 },
  { id: "tb-003", accountCode: "1200", accountName: "Accounts Receivable", accountType: "Asset", debit: 186400, credit: 0 },
  { id: "tb-004", accountCode: "1350", accountName: "Work in Process", accountType: "Asset", debit: 74200, credit: 0 },
  { id: "tb-005", accountCode: "2010", accountName: "Accounts Payable", accountType: "Liability", debit: 0, credit: 42800 },
  { id: "tb-006", accountCode: "2100", accountName: "Client Trust Liability", accountType: "Liability", debit: 0, credit: 107500 },
  { id: "tb-007", accountCode: "2300", accountName: "Deferred Revenue", accountType: "Liability", debit: 0, credit: 86400 },
  { id: "tb-008", accountCode: "3000", accountName: "Partner Equity", accountType: "Equity", debit: 0, credit: 520000 },
  { id: "tb-009", accountCode: "4100", accountName: "Legal Services Revenue", accountType: "Revenue", debit: 0, credit: 428600 },
  { id: "tb-010", accountCode: "6200", accountName: "Office Supplies", accountType: "Expense", debit: 18400, credit: 0 },
  { id: "tb-011", accountCode: "6300", accountName: "Professional Services", accountType: "Expense", debit: 28600, credit: 0 },
  { id: "tb-012", accountCode: "6400", accountName: "Payroll Expense", accountType: "Expense", debit: 372800, credit: 0 },
];

export const closeTasks: CloseTask[] = [
  { id: "ct-001", task: "Reconcile all trust accounts", category: "Trust", assignee: "Alex Morgan", dueDate: "2026-08-05", status: "Complete", dependencies: [] },
  { id: "ct-002", task: "Reconcile operating bank accounts", category: "Banking", assignee: "Alex Morgan", dueDate: "2026-08-05", status: "In Progress", dependencies: [] },
  { id: "ct-003", task: "Post WIP accrual entries", category: "Revenue", assignee: "Alex Morgan", dueDate: "2026-08-06", status: "In Progress", dependencies: ["ct-002"] },
  { id: "ct-004", task: "Review deferred revenue schedule", category: "Revenue", assignee: "Alex Morgan", dueDate: "2026-08-06", status: "Not Started", dependencies: ["ct-003"] },
  { id: "ct-005", task: "Accrue unbilled expenses", category: "Expenses", assignee: "Alex Morgan", dueDate: "2026-08-07", status: "Not Started", dependencies: [] },
  { id: "ct-006", task: "Run trial balance", category: "GL", assignee: "Alex Morgan", dueDate: "2026-08-07", status: "Blocked", dependencies: ["ct-003", "ct-004", "ct-005"] },
  { id: "ct-007", task: "Partner equity allocation", category: "GL", assignee: "Robert Morgan", dueDate: "2026-08-08", status: "Not Started", dependencies: ["ct-006"] },
  { id: "ct-008", task: "Generate P&L draft", category: "Reporting", assignee: "Alex Morgan", dueDate: "2026-08-08", status: "Not Started", dependencies: ["ct-006"] },
  { id: "ct-009", task: "Generate balance sheet draft", category: "Reporting", assignee: "Alex Morgan", dueDate: "2026-08-08", status: "Not Started", dependencies: ["ct-006"] },
  { id: "ct-010", task: "Review AP aging", category: "AP", assignee: "Alex Morgan", dueDate: "2026-08-06", status: "Complete", dependencies: [] },
  { id: "ct-011", task: "Lock accounting period", category: "Administration", assignee: "Alex Morgan", dueDate: "2026-08-09", status: "Not Started", dependencies: ["ct-007", "ct-008", "ct-009"] },
  { id: "ct-012", task: "Archive close documentation", category: "Administration", assignee: "Alex Morgan", dueDate: "2026-08-09", status: "Not Started", dependencies: ["ct-011"] },
  { id: "ct-013", task: "Notify partners of close completion", category: "Administration", assignee: "Alex Morgan", dueDate: "2026-08-10", status: "Not Started", dependencies: ["ct-011"] },
];

export const chartOfAccounts = [
  { code: "1010", name: "Cash – Operating" },
  { code: "1050", name: "Cash – Trust (IOLTA)" },
  { code: "1200", name: "Accounts Receivable" },
  { code: "1350", name: "Work in Process" },
  { code: "2010", name: "Accounts Payable" },
  { code: "2100", name: "Client Trust Liability" },
  { code: "2300", name: "Deferred Revenue" },
  { code: "3000", name: "Partner Equity" },
  { code: "4100", name: "Legal Services Revenue" },
  { code: "6200", name: "Office Supplies" },
  { code: "6300", name: "Professional Services" },
  { code: "6400", name: "Payroll Expense" },
];

export const glClients = amClients.map((c) => c.name);
export const glMatters = amMatters.map((m) => ({
  id: m.id,
  name: m.matterName,
  number: m.matterNumber,
  client: m.client,
}));

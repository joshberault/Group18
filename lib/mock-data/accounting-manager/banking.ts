import { AM_OFFICES } from "./entities";

export type BankAccountType = "Operating" | "Payroll" | "Savings" | "Trust";
export type BankTransactionType =
  | "Deposit"
  | "Withdrawal"
  | "ACH"
  | "Wire"
  | "Check"
  | "Transfer"
  | "Fee";
export type BankReconciliationStatus = "Reconciled" | "In Progress" | "Not Started";

export interface BankingSummaryKpi {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  warning?: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  office: string;
  balance: number;
  availableBalance: number;
  lastReconciled: string;
  reconciliationStatus: BankReconciliationStatus;
  unreconciledCount: number;
}

export interface BankTransaction {
  id: string;
  date: string;
  bankAccountId: string;
  type: BankTransactionType;
  payee: string;
  reference: string;
  description: string;
  amount: number;
  cleared: boolean;
  category: string;
}

export interface BankReconciliation {
  id: string;
  bankAccountId: string;
  accountName: string;
  period: string;
  statementBalance: number;
  bookBalance: number;
  clearedDeposits: number;
  clearedWithdrawals: number;
  outstandingChecks: number;
  outstandingDeposits: number;
  variance: number;
  status: BankReconciliationStatus;
  lastUpdated: string;
}

export const bankingSummaryKpis: BankingSummaryKpi[] = [
  {
    id: "total-cash",
    title: "Total Cash Position",
    value: "$1,284,600",
    supportingText: "All operating accounts",
  },
  {
    id: "unreconciled",
    title: "Unreconciled Items",
    value: "18",
    supportingText: "Across 4 accounts",
    warning: true,
  },
  {
    id: "pending-ach",
    title: "Pending ACH",
    value: "$42,800",
    supportingText: "6 batches scheduled",
  },
  {
    id: "outstanding-checks",
    title: "Outstanding Checks",
    value: "$8,450",
    supportingText: "12 checks not cleared",
  },
  {
    id: "wire-queue",
    title: "Wire Transfers Pending",
    value: "2",
    supportingText: "Awaiting dual approval",
    warning: true,
  },
  {
    id: "last-feed",
    title: "Last Bank Feed",
    value: "Today",
    supportingText: "All feeds current",
  },
];

export const bankAccounts: BankAccount[] = [
  {
    id: "ba-001",
    name: "Operating – Chicago",
    bankName: "First National Bank",
    accountNumber: "****2104",
    accountType: "Operating",
    office: "Chicago",
    balance: 524800,
    availableBalance: 518200,
    lastReconciled: "2026-08-01",
    reconciliationStatus: "Reconciled",
    unreconciledCount: 3,
  },
  {
    id: "ba-002",
    name: "Operating – New York",
    bankName: "Metropolitan Trust",
    accountNumber: "****8834",
    accountType: "Operating",
    office: "New York",
    balance: 412600,
    availableBalance: 405100,
    lastReconciled: "2026-07-31",
    reconciliationStatus: "In Progress",
    unreconciledCount: 8,
  },
  {
    id: "ba-003",
    name: "Operating – Los Angeles",
    bankName: "Pacific Coast Bank",
    accountNumber: "****5567",
    accountType: "Operating",
    office: "Los Angeles",
    balance: 218400,
    availableBalance: 218400,
    lastReconciled: "2026-08-02",
    reconciliationStatus: "Reconciled",
    unreconciledCount: 2,
  },
  {
    id: "ba-004",
    name: "Payroll – Firmwide",
    bankName: "First National Bank",
    accountNumber: "****9921",
    accountType: "Payroll",
    office: "Chicago",
    balance: 128800,
    availableBalance: 128800,
    lastReconciled: "2026-08-01",
    reconciliationStatus: "Reconciled",
    unreconciledCount: 0,
  },
];

export const bankTransactions: BankTransaction[] = [
  {
    id: "bt-001",
    date: "2026-08-04",
    bankAccountId: "ba-001",
    type: "Deposit",
    payee: "Northwind Holdings LLC",
    reference: "DEP-44201",
    description: "Client payment – invoice INV-2847",
    amount: 22400,
    cleared: true,
    category: "Client Receipts",
  },
  {
    id: "bt-002",
    date: "2026-08-04",
    bankAccountId: "ba-002",
    type: "ACH",
    payee: "Westlake Court Reporting",
    reference: "ACH-8821",
    description: "Vendor payment – deposition services",
    amount: -1850,
    cleared: false,
    category: "Vendor Payments",
  },
  {
    id: "bt-003",
    date: "2026-08-03",
    bankAccountId: "ba-001",
    type: "Wire",
    payee: "Beacon Medical Partners",
    reference: "WIR-1102",
    description: "Trust refund to client",
    amount: -12000,
    cleared: true,
    category: "Trust Transfers",
  },
  {
    id: "bt-004",
    date: "2026-08-03",
    bankAccountId: "ba-003",
    type: "Check",
    payee: "Superior Copy Services",
    reference: "CHK-8842",
    description: "Copy and scan services",
    amount: -420,
    cleared: false,
    category: "Office Expenses",
  },
  {
    id: "bt-005",
    date: "2026-08-02",
    bankAccountId: "ba-002",
    type: "Deposit",
    payee: "Summit Retail Group",
    reference: "DEP-44188",
    description: "Partial payment – INV-2901",
    amount: 14200,
    cleared: true,
    category: "Client Receipts",
  },
  {
    id: "bt-006",
    date: "2026-08-01",
    bankAccountId: "ba-004",
    type: "ACH",
    payee: "ADP Payroll",
    reference: "ACH-8805",
    description: "Bi-weekly payroll disbursement",
    amount: -186400,
    cleared: true,
    category: "Payroll",
  },
  {
    id: "bt-007",
    date: "2026-07-31",
    bankAccountId: "ba-001",
    type: "Fee",
    payee: "First National Bank",
    reference: "SVC-0092",
    description: "Monthly account service fee",
    amount: -35,
    cleared: true,
    category: "Bank Fees",
  },
  {
    id: "bt-008",
    date: "2026-07-30",
    bankAccountId: "ba-002",
    type: "Transfer",
    payee: "Operating – Chicago",
    reference: "TRF-5501",
    description: "Inter-office transfer",
    amount: -25000,
    cleared: true,
    category: "Transfers",
  },
  {
    id: "bt-009",
    date: "2026-07-29",
    bankAccountId: "ba-003",
    type: "Deposit",
    payee: "Greenfield Energy Corp.",
    reference: "DEP-44172",
    description: "Invoice payment – INV-2915",
    amount: 8900,
    cleared: true,
    category: "Client Receipts",
  },
  {
    id: "bt-010",
    date: "2026-07-28",
    bankAccountId: "ba-001",
    type: "Check",
    payee: "City of Chicago",
    reference: "CHK-8835",
    description: "Business license renewal",
    amount: -1250,
    cleared: false,
    category: "Licenses & Permits",
  },
];

export const bankReconciliations: BankReconciliation[] = bankAccounts.map(
  (account, i) => ({
    id: `br-${String(i + 1).padStart(3, "0")}`,
    bankAccountId: account.id,
    accountName: account.name,
    period: "July 2026",
    statementBalance: account.balance,
    bookBalance: account.balance - (account.unreconciledCount > 0 ? 1250 : 0),
    clearedDeposits: 186400 + i * 12000,
    clearedWithdrawals: 142800 + i * 8000,
    outstandingChecks: account.unreconciledCount > 0 ? 8450 : 2100,
    outstandingDeposits: account.unreconciledCount > 0 ? 3200 : 0,
    variance: account.unreconciledCount > 0 ? 1250 : 0,
    status: account.reconciliationStatus,
    lastUpdated: account.lastReconciled,
  }),
);

export const bankOffices = [...AM_OFFICES];

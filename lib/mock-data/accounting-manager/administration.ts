/** Accounting administration mock data for Accounting Manager workspace */

export type PeriodStatus = "Open" | "Closing" | "Closed";

export interface AccountingPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closeDate?: string;
  closedBy?: string;
  blockingTasks: number;
}

export type AccountType =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Revenue"
  | "Expense";

export type NormalBalance = "Debit" | "Credit";

export interface ChartOfAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  active: boolean;
  restricted: boolean;
  isDraft?: boolean;
}

export interface ApprovalRule {
  id: string;
  transactionType: string;
  threshold: number;
  requiredRole: string;
  secondaryApproval: string | null;
  active: boolean;
}

export interface BillingPaymentSettings {
  defaultPaymentTerms: string;
  lateFeeEnabled: boolean;
  lateFeePercent: number;
  lateFeeGraceDays: number;
  billingCycleDefault: string;
  invoiceNumberFormat: string;
  acceptedPaymentMethods: string[];
  writeOffReasonCodes: string[];
  creditMemoReasonCodes: string[];
}

export interface OfficeEntity {
  id: string;
  office: string;
  legalName: string;
  taxIdMasked: string;
  baseCurrency: string;
  defaultBankAccount: string;
  accountingStatus: "Active" | "Inactive";
}

export type IntegrationStatus = "Connected" | "Degraded" | "Disconnected" | "Not Configured";

export interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  lastSync?: string;
  enabled: boolean;
}

export interface AccountingPermissionRow {
  role: string;
  viewFirmWideAr: boolean;
  approveWriteOffs: boolean;
  approveJournalEntries: boolean;
  approvePayments: boolean;
  reconcileTrust: boolean;
  closeAccountingPeriods: boolean;
  editFinancialSettings: boolean;
  exportFinancialRecords: boolean;
}

export const amAccountingPeriods: AccountingPeriod[] = [
  {
    id: "per-2026-08",
    period: "August 2026",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    status: "Open",
    blockingTasks: 0,
  },
  {
    id: "per-2026-07",
    period: "July 2026",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    status: "Closed",
    closeDate: "2026-08-03",
    closedBy: "Alex Morgan",
    blockingTasks: 0,
  },
  {
    id: "per-2026-06",
    period: "June 2026",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    status: "Closed",
    closeDate: "2026-07-05",
    closedBy: "Alex Morgan",
    blockingTasks: 0,
  },
  {
    id: "per-2026-05",
    period: "May 2026",
    startDate: "2026-05-01",
    endDate: "2026-05-31",
    status: "Closed",
    closeDate: "2026-06-04",
    closedBy: "Alex Morgan",
    blockingTasks: 0,
  },
];

export const amChartOfAccounts: ChartOfAccount[] = [
  {
    id: "coa-1000",
    accountNumber: "1000",
    accountName: "Operating Cash",
    accountType: "Asset",
    normalBalance: "Debit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-1100",
    accountNumber: "1100",
    accountName: "Accounts Receivable",
    accountType: "Asset",
    normalBalance: "Debit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-1200",
    accountNumber: "1200",
    accountName: "Client Trust Liability",
    accountType: "Liability",
    normalBalance: "Credit",
    active: true,
    restricted: true,
  },
  {
    id: "coa-1300",
    accountNumber: "1300",
    accountName: "Prepaid Expenses",
    accountType: "Asset",
    normalBalance: "Debit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-2000",
    accountNumber: "2000",
    accountName: "Accounts Payable",
    accountType: "Liability",
    normalBalance: "Credit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-2100",
    accountNumber: "2100",
    accountName: "Accrued Expenses",
    accountType: "Liability",
    normalBalance: "Credit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-3000",
    accountNumber: "3000",
    accountName: "Partner Capital",
    accountType: "Equity",
    normalBalance: "Credit",
    active: true,
    restricted: true,
  },
  {
    id: "coa-4100",
    accountNumber: "4100",
    accountName: "Legal Services Revenue",
    accountType: "Revenue",
    normalBalance: "Credit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-4200",
    accountNumber: "4200",
    accountName: "Reimbursable Cost Recovery",
    accountType: "Revenue",
    normalBalance: "Credit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-5100",
    accountNumber: "5100",
    accountName: "Salaries & Wages",
    accountType: "Expense",
    normalBalance: "Debit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-5200",
    accountNumber: "5200",
    accountName: "Occupancy Expense",
    accountType: "Expense",
    normalBalance: "Debit",
    active: true,
    restricted: false,
  },
  {
    id: "coa-5300",
    accountNumber: "5300",
    accountName: "Professional Services",
    accountType: "Expense",
    normalBalance: "Debit",
    active: true,
    restricted: false,
  },
];

export const amApprovalRules: ApprovalRule[] = [
  {
    id: "ar-wo",
    transactionType: "Write-Offs",
    threshold: 5000,
    requiredRole: "Managing Partner",
    secondaryApproval: "Accounting Manager",
    active: true,
  },
  {
    id: "ar-je",
    transactionType: "Journal Entries",
    threshold: 10000,
    requiredRole: "Accounting Manager",
    secondaryApproval: "Managing Partner",
    active: true,
  },
  {
    id: "ar-vb",
    transactionType: "Vendor Bills",
    threshold: 2500,
    requiredRole: "Accounting Manager",
    secondaryApproval: null,
    active: true,
  },
  {
    id: "ar-pay",
    transactionType: "Payments",
    threshold: 15000,
    requiredRole: "Accounting Manager",
    secondaryApproval: "Managing Partner",
    active: true,
  },
  {
    id: "ar-tw",
    transactionType: "Trust Withdrawals",
    threshold: 0,
    requiredRole: "Accounting Manager",
    secondaryApproval: null,
    active: true,
  },
  {
    id: "ar-cm",
    transactionType: "Credit Memos",
    threshold: 1000,
    requiredRole: "Billing Specialist",
    secondaryApproval: "Accounting Manager",
    active: true,
  },
];

export const amBillingSettings: BillingPaymentSettings = {
  defaultPaymentTerms: "Net 30",
  lateFeeEnabled: true,
  lateFeePercent: 1.5,
  lateFeeGraceDays: 10,
  billingCycleDefault: "Monthly",
  invoiceNumberFormat: "INV-{YYYY}-{SEQ:4}",
  acceptedPaymentMethods: [
    "ACH",
    "Wire Transfer",
    "Check",
    "Credit Card",
    "Trust Transfer",
  ],
  writeOffReasonCodes: [
    "Uncollectible",
    "Client Bankruptcy",
    "Billing Error",
    "Goodwill Adjustment",
    "Settlement Agreement",
  ],
  creditMemoReasonCodes: [
    "Billing Correction",
    "Fee Adjustment",
    "Duplicate Charge",
    "Service Credit",
    "Promotional Discount",
  ],
};

export const amOfficeEntities: OfficeEntity[] = [
  {
    id: "off-chi",
    office: "Chicago",
    legalName: "CounselFlow LLP — Chicago Office",
    taxIdMasked: "••-•••4521",
    baseCurrency: "USD",
    defaultBankAccount: "CHASE-OP-4401",
    accountingStatus: "Active",
  },
  {
    id: "off-ny",
    office: "New York",
    legalName: "CounselFlow LLP — New York Office",
    taxIdMasked: "••-•••4521",
    baseCurrency: "USD",
    defaultBankAccount: "CHASE-OP-4402",
    accountingStatus: "Active",
  },
  {
    id: "off-la",
    office: "Los Angeles",
    legalName: "CounselFlow LLP — Los Angeles Office",
    taxIdMasked: "••-•••4521",
    baseCurrency: "USD",
    defaultBankAccount: "BOA-OP-8801",
    accountingStatus: "Active",
  },
  {
    id: "off-dal",
    office: "Dallas",
    legalName: "CounselFlow LLP — Dallas Office",
    taxIdMasked: "••-•••4521",
    baseCurrency: "USD",
    defaultBankAccount: "CHASE-OP-4403",
    accountingStatus: "Active",
  },
];

export const amIntegrations: IntegrationConfig[] = [
  {
    id: "int-supabase",
    name: "Supabase",
    description: "Authentication and database backend",
    status: "Connected",
    lastSync: "2026-08-05T14:00:00Z",
    enabled: true,
  },
  {
    id: "int-payment",
    name: "Payment Processor",
    description: "Client portal and invoice payments",
    status: "Connected",
    lastSync: "2026-08-05T12:30:00Z",
    enabled: true,
  },
  {
    id: "int-bank",
    name: "Bank Feed",
    description: "Operating and trust account transaction import",
    status: "Degraded",
    lastSync: "2026-08-04T18:00:00Z",
    enabled: true,
  },
  {
    id: "int-tax",
    name: "Tax Service",
    description: "1099 reporting and sales tax calculations",
    status: "Connected",
    lastSync: "2026-08-01T09:00:00Z",
    enabled: true,
  },
  {
    id: "int-docs",
    name: "Document Storage",
    description: "Invoice PDFs, receipts, and supporting documents",
    status: "Connected",
    lastSync: "2026-08-05T11:00:00Z",
    enabled: true,
  },
  {
    id: "int-email",
    name: "Email Delivery",
    description: "Invoice delivery and payment reminders",
    status: "Connected",
    lastSync: "2026-08-05T13:45:00Z",
    enabled: true,
  },
];

export const amPermissionsMatrix: AccountingPermissionRow[] = [
  {
    role: "Accounting Manager",
    viewFirmWideAr: true,
    approveWriteOffs: true,
    approveJournalEntries: true,
    approvePayments: true,
    reconcileTrust: true,
    closeAccountingPeriods: true,
    editFinancialSettings: true,
    exportFinancialRecords: true,
  },
  {
    role: "Managing Partner",
    viewFirmWideAr: true,
    approveWriteOffs: true,
    approveJournalEntries: true,
    approvePayments: true,
    reconcileTrust: false,
    closeAccountingPeriods: true,
    editFinancialSettings: false,
    exportFinancialRecords: true,
  },
  {
    role: "Billing Specialist",
    viewFirmWideAr: true,
    approveWriteOffs: false,
    approveJournalEntries: false,
    approvePayments: false,
    reconcileTrust: false,
    closeAccountingPeriods: false,
    editFinancialSettings: false,
    exportFinancialRecords: true,
  },
  {
    role: "Attorney",
    viewFirmWideAr: false,
    approveWriteOffs: false,
    approveJournalEntries: false,
    approvePayments: false,
    reconcileTrust: false,
    closeAccountingPeriods: false,
    editFinancialSettings: false,
    exportFinancialRecords: false,
  },
  {
    role: "Firm Administrator",
    viewFirmWideAr: true,
    approveWriteOffs: false,
    approveJournalEntries: false,
    approvePayments: false,
    reconcileTrust: false,
    closeAccountingPeriods: false,
    editFinancialSettings: false,
    exportFinancialRecords: true,
  },
];

export const accountTypeOptions: AccountType[] = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
];

export const normalBalanceOptions: NormalBalance[] = ["Debit", "Credit"];

export type TrustAccountStatus = "Active" | "Inactive" | "Reconciling";
export type TrustTransactionType =
  | "Deposit"
  | "Withdrawal"
  | "Transfer"
  | "Fee"
  | "Interest";
export type TrustExceptionSeverity = "High" | "Medium" | "Low";
export type ReconciliationStatus = "Balanced" | "Variance" | "Pending Review";

export interface TrustSummaryKpi {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  warning?: boolean;
}

export interface TrustAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: "IOLTA" | "Trust" | "Escrow";
  office: string;
  balance: number;
  ledgerBalance: number;
  clientBalance: number;
  status: TrustAccountStatus;
  lastReconciled: string;
  reconciliationStatus: ReconciliationStatus;
  variance: number;
}

export interface TrustClientLedger {
  id: string;
  clientId: string;
  client: string;
  matterId: string;
  matter: string;
  matterNumber: string;
  trustAccountId: string;
  balance: number;
  minimumRetainer: number;
  retainerStatus: "Sufficient" | "Low" | "Critical";
  lastActivity: string;
  attorney: string;
}

export interface TrustTransaction {
  id: string;
  date: string;
  trustAccountId: string;
  client: string;
  matter: string;
  type: TrustTransactionType;
  reference: string;
  description: string;
  amount: number;
  runningBalance: number;
  status: "Posted" | "Pending" | "Void";
}

export interface TrustException {
  id: string;
  type: string;
  client: string;
  matter: string;
  description: string;
  amount: number;
  severity: TrustExceptionSeverity;
  daysOpen: number;
  assignedTo: string;
}

export interface TrustReconciliation {
  id: string;
  trustAccountId: string;
  accountName: string;
  period: string;
  bankBalance: number;
  ledgerBalance: number;
  clientSubledgerTotal: number;
  variance: number;
  status: ReconciliationStatus;
  lastUpdated: string;
  preparedBy: string;
}

export const trustSummaryKpis: TrustSummaryKpi[] = [];

export const trustAccounts: TrustAccount[] = [];

export const trustClientLedgers: TrustClientLedger[] = [];

export const trustTransactions: TrustTransaction[] = [];

export const trustExceptions: TrustException[] = [];

export const trustReconciliations: TrustReconciliation[] = [];

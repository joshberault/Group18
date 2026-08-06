import { amMatters } from "./entities";

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

export const trustSummaryKpis: TrustSummaryKpi[] = [
  {
    id: "total-trust",
    title: "Total Trust Held",
    value: "$107,500",
    supportingText: "Across 3 IOLTA accounts",
  },
  {
    id: "client-ledgers",
    title: "Client Ledgers",
    value: "8",
    supportingText: "Active sub-ledgers",
  },
  {
    id: "low-retainer",
    title: "Low Retainer Alerts",
    value: "2",
    supportingText: "Below minimum threshold",
    warning: true,
  },
  {
    id: "exceptions",
    title: "Open Exceptions",
    value: "4",
    supportingText: "Requiring review",
    warning: true,
  },
  {
    id: "recon-variance",
    title: "Reconciliation Variance",
    value: "$1,250",
    supportingText: "1 account out of balance",
    warning: true,
  },
  {
    id: "pending-transfers",
    title: "Pending Transfers",
    value: "3",
    supportingText: "Awaiting approval",
  },
];

export const trustAccounts: TrustAccount[] = [
  {
    id: "ta-001",
    name: "IOLTA – Chicago Operating",
    bankName: "First National Bank",
    accountNumber: "****4821",
    accountType: "IOLTA",
    office: "Chicago",
    balance: 42500,
    ledgerBalance: 42500,
    clientBalance: 42500,
    status: "Active",
    lastReconciled: "2026-08-01",
    reconciliationStatus: "Balanced",
    variance: 0,
  },
  {
    id: "ta-002",
    name: "IOLTA – New York",
    bankName: "Metropolitan Trust",
    accountNumber: "****7392",
    accountType: "IOLTA",
    office: "New York",
    balance: 38250,
    ledgerBalance: 37000,
    clientBalance: 37000,
    status: "Reconciling",
    lastReconciled: "2026-07-31",
    reconciliationStatus: "Variance",
    variance: 1250,
  },
  {
    id: "ta-003",
    name: "IOLTA – Los Angeles",
    bankName: "Pacific Coast Bank",
    accountNumber: "****1056",
    accountType: "IOLTA",
    office: "Los Angeles",
    balance: 26750,
    ledgerBalance: 26750,
    clientBalance: 26750,
    status: "Active",
    lastReconciled: "2026-08-02",
    reconciliationStatus: "Balanced",
    variance: 0,
  },
];

export const trustClientLedgers: TrustClientLedger[] = amMatters
  .filter((m) => m.trustBalance > 0)
  .map((m, i) => {
    const retainerStatus =
      m.trustBalance < m.minimumRetainer * 0.5
        ? "Critical"
        : m.trustBalance < m.minimumRetainer
          ? "Low"
          : "Sufficient";
    return {
      id: `tl-${String(i + 1).padStart(3, "0")}`,
      clientId: m.clientId,
      client: m.client,
      matterId: m.id,
      matter: m.matterName,
      matterNumber: m.matterNumber,
      trustAccountId: i % 2 === 0 ? "ta-001" : "ta-002",
      balance: m.trustBalance,
      minimumRetainer: m.minimumRetainer,
      retainerStatus,
      lastActivity: "2026-08-03",
      attorney: m.attorney,
    };
  });

export const trustTransactions: TrustTransaction[] = [
  {
    id: "tt-001",
    date: "2026-08-04",
    trustAccountId: "ta-001",
    client: "Northwind Holdings LLC",
    matter: "Commercial Lease Dispute",
    type: "Deposit",
    reference: "DEP-8842",
    description: "Client retainer deposit – wire",
    amount: 5000,
    runningBalance: 42500,
    status: "Posted",
  },
  {
    id: "tt-002",
    date: "2026-08-03",
    trustAccountId: "ta-002",
    client: "Beacon Medical Partners",
    matter: "Healthcare Compliance Audit",
    type: "Withdrawal",
    reference: "WDR-3310",
    description: "Invoice payment from trust",
    amount: -8400,
    runningBalance: 37000,
    status: "Posted",
  },
  {
    id: "tt-003",
    date: "2026-08-02",
    trustAccountId: "ta-003",
    client: "Greenfield Energy Corp.",
    matter: "Environmental Permitting",
    type: "Deposit",
    reference: "DEP-8831",
    description: "Additional retainer",
    amount: 3000,
    runningBalance: 26750,
    status: "Posted",
  },
  {
    id: "tt-004",
    date: "2026-08-01",
    trustAccountId: "ta-001",
    client: "Harbor Logistics Inc.",
    matter: "Contract Negotiation",
    type: "Transfer",
    reference: "TRF-2201",
    description: "Transfer to operating for fees",
    amount: -2200,
    runningBalance: 37500,
    status: "Pending",
  },
  {
    id: "tt-005",
    date: "2026-07-31",
    trustAccountId: "ta-002",
    client: "Summit Retail Group",
    matter: "Employment Litigation",
    type: "Deposit",
    reference: "DEP-8819",
    description: "Retainer replenishment",
    amount: 4000,
    runningBalance: 45400,
    status: "Posted",
  },
  {
    id: "tt-006",
    date: "2026-07-30",
    trustAccountId: "ta-001",
    client: "Atlas Construction Co.",
    matter: "Surety Bond Claim",
    type: "Deposit",
    reference: "DEP-8812",
    description: "Initial retainer",
    amount: 15000,
    runningBalance: 39700,
    status: "Posted",
  },
  {
    id: "tt-007",
    date: "2026-07-29",
    trustAccountId: "ta-003",
    client: "Pinnacle Software Ltd.",
    matter: "IP Licensing Review",
    type: "Fee",
    reference: "FEE-0098",
    description: "IOLTA interest allocation",
    amount: 42,
    runningBalance: 23750,
    status: "Posted",
  },
  {
    id: "tt-008",
    date: "2026-07-28",
    trustAccountId: "ta-002",
    client: "Pinnacle Software Ltd.",
    matter: "IP Licensing Review",
    type: "Withdrawal",
    reference: "WDR-3298",
    description: "Partial fee disbursement",
    amount: -1800,
    runningBalance: 41400,
    status: "Void",
  },
];

export const trustExceptions: TrustException[] = [
  {
    id: "te-001",
    type: "Negative Ledger Balance",
    client: "Meridian Capital Advisors",
    matter: "Regulatory Compliance",
    description: "Sub-ledger shows $0 but pending withdrawal of $1,200",
    amount: 1200,
    severity: "High",
    daysOpen: 3,
    assignedTo: "Alex Morgan",
  },
  {
    id: "te-002",
    type: "Low Retainer",
    client: "Harbor Logistics Inc.",
    matter: "Contract Negotiation",
    description: "Trust balance $5,000 below $7,500 minimum",
    amount: 2500,
    severity: "Medium",
    daysOpen: 7,
    assignedTo: "Alex Morgan",
  },
  {
    id: "te-003",
    type: "Reconciliation Variance",
    client: "—",
    matter: "—",
    description: "IOLTA New York bank vs. ledger variance of $1,250",
    amount: 1250,
    severity: "High",
    daysOpen: 2,
    assignedTo: "Alex Morgan",
  },
  {
    id: "te-004",
    type: "Unapplied Deposit",
    client: "Summit Retail Group",
    matter: "Employment Litigation",
    description: "Deposit of $2,400 not allocated to matter ledger",
    amount: 2400,
    severity: "Medium",
    daysOpen: 5,
    assignedTo: "Alex Morgan",
  },
];

export const trustReconciliations: TrustReconciliation[] = [
  {
    id: "tr-001",
    trustAccountId: "ta-001",
    accountName: "IOLTA – Chicago Operating",
    period: "July 2026",
    bankBalance: 42500,
    ledgerBalance: 42500,
    clientSubledgerTotal: 42500,
    variance: 0,
    status: "Balanced",
    lastUpdated: "2026-08-01",
    preparedBy: "Alex Morgan",
  },
  {
    id: "tr-002",
    trustAccountId: "ta-002",
    accountName: "IOLTA – New York",
    period: "July 2026",
    bankBalance: 38250,
    ledgerBalance: 37000,
    clientSubledgerTotal: 37000,
    variance: 1250,
    status: "Variance",
    lastUpdated: "2026-07-31",
    preparedBy: "Alex Morgan",
  },
  {
    id: "tr-003",
    trustAccountId: "ta-003",
    accountName: "IOLTA – Los Angeles",
    period: "July 2026",
    bankBalance: 26750,
    ledgerBalance: 26750,
    clientSubledgerTotal: 26750,
    variance: 0,
    status: "Balanced",
    lastUpdated: "2026-08-02",
    preparedBy: "Alex Morgan",
  },
];

export type BillingQueueStatus =
  | "Draft"
  | "Awaiting Attorney Review"
  | "Returned for Correction"
  | "Approved"
  | "Ready to Send"
  | "Sent";

export type ExceptionSeverity = "High" | "Medium" | "Low";

export interface BillingHealthKpi {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  warning?: boolean;
}

export interface BillingMonthlyProgress {
  label: string;
  completed: number;
  total: number;
  percent: number;
  billedAmount: number;
  unbilledWip: number;
}

export interface BillingBottleneck {
  id: string;
  status: string;
  count: number;
  amount: number;
  warning?: boolean;
  queueStatusFilter: BillingQueueStatus | "all";
}

export interface BillingException {
  id: string;
  name: string;
  count: number;
  impact: string;
  severity: ExceptionSeverity;
  queueFilter?: {
    exceptionsOnly?: boolean;
    status?: BillingQueueStatus;
  };
}

export interface BillingQueueRecord {
  id: string;
  matter: string;
  client: string;
  attorney: string;
  billingCycle: string;
  unbilledWip: number;
  draftAmount: number;
  status: BillingQueueStatus;
  daysWaiting: number;
  lastUpdated: string;
  isException: boolean;
  detail: {
    matterNumber: string;
    notes: string;
    lastAction: string;
  };
}

export interface BillingDeadline {
  id: string;
  date: string;
  label: string;
  affectedCount: number;
}

export interface BillingActivityEvent {
  id: string;
  action: string;
  reference: string;
  user: string;
  relativeTime: string;
}

/** Live Billing Oversight reads Supabase; these are offline fallbacks only. */
export const billingHealthKpis: BillingHealthKpi[] = [];

export const billingMonthlyProgress: BillingMonthlyProgress = {
  label: "August 2026",
  completed: 2,
  total: 2,
  percent: 100,
  billedAmount: 20_925,
  unbilledWip: 0,
};

export const billingBottlenecks: BillingBottleneck[] = [];

export const billingExceptions: BillingException[] = [];

export const billingQueueRecords: BillingQueueRecord[] = [];

export const billingDeadlines: BillingDeadline[] = [];

export const billingRecentActivity: BillingActivityEvent[] = [];

export const billingQueueStatusOptions: BillingQueueStatus[] = [
  "Draft",
  "Awaiting Attorney Review",
  "Returned for Correction",
  "Approved",
  "Ready to Send",
  "Sent",
];

export const billingAttorneyOptions = ["All attorneys", "George Giddens"];

export const billingCycleOptions = ["All cycles", "Monthly"];

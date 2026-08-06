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

export const billingHealthKpis: BillingHealthKpi[] = [
  {
    id: "unbilled-wip",
    title: "Unbilled WIP",
    value: "$1,482,000",
    supportingText: "Work recorded but not yet billed",
  },
  {
    id: "draft-bills",
    title: "Draft Bills",
    value: "42",
    supportingText: "Bills currently being prepared",
  },
  {
    id: "awaiting-approval",
    title: "Awaiting Attorney Approval",
    value: "18",
    supportingText: "Oldest pending: 12 days",
    warning: true,
  },
  {
    id: "ready-finalize",
    title: "Ready to Finalize",
    value: "9",
    supportingText: "Approved and ready for release",
  },
  {
    id: "sent-month",
    title: "Invoices Sent This Month",
    value: "264",
    supportingText: "$2,740,000 billed",
  },
];

export const billingMonthlyProgress: BillingMonthlyProgress = {
  label: "Monthly Billing Progress",
  completed: 264,
  total: 348,
  percent: 76,
  billedAmount: 2_740_000,
  unbilledWip: 1_482_000,
};

export const billingBottlenecks: BillingBottleneck[] = [
  {
    id: "draft",
    status: "Draft Bills",
    count: 42,
    amount: 410_500,
    queueStatusFilter: "Draft",
  },
  {
    id: "attorney-review",
    status: "Awaiting Attorney Review",
    count: 18,
    amount: 287_300,
    warning: true,
    queueStatusFilter: "Awaiting Attorney Review",
  },
  {
    id: "returned",
    status: "Returned for Correction",
    count: 6,
    amount: 74_900,
    warning: true,
    queueStatusFilter: "Returned for Correction",
  },
  {
    id: "approved",
    status: "Approved",
    count: 9,
    amount: 162_800,
    queueStatusFilter: "Approved",
  },
  {
    id: "ready-send",
    status: "Ready to Send",
    count: 7,
    amount: 119_400,
    queueStatusFilter: "Ready to Send",
  },
];

export const billingExceptions: BillingException[] = [
  {
    id: "approval-overdue",
    name: "Attorney approval overdue",
    count: 12,
    impact: "Oldest item: 12 days",
    severity: "High",
    queueFilter: { exceptionsOnly: true, status: "Awaiting Attorney Review" },
  },
  {
    id: "invalid-rate",
    name: "Missing or invalid billing rate",
    count: 5,
    impact: "Potential billing value affected: $38,400",
    severity: "High",
    queueFilter: { exceptionsOnly: true },
  },
  {
    id: "over-budget",
    name: "Matter exceeds engagement budget",
    count: 4,
    impact: "Amount over budget: $21,750",
    severity: "Medium",
    queueFilter: { exceptionsOnly: true },
  },
  {
    id: "trust-replenishment",
    name: "Missing trust replenishment request",
    count: 7,
    impact: "Retainer thresholds not addressed",
    severity: "Medium",
    queueFilter: { exceptionsOnly: true },
  },
  {
    id: "ledes-failure",
    name: "LEDES validation failure",
    count: 3,
    impact: "Export blocked pending correction",
    severity: "Medium",
    queueFilter: { exceptionsOnly: true },
  },
];

export const billingQueueRecords: BillingQueueRecord[] = [
  {
    id: "bq-1",
    matter: "Meridian Acquisition",
    client: "Meridian Holdings",
    attorney: "Jordan Lee",
    billingCycle: "Monthly Corporate",
    unbilledWip: 84_200,
    draftAmount: 72_400,
    status: "Awaiting Attorney Review",
    daysWaiting: 12,
    lastUpdated: "2026-08-01",
    isException: true,
    detail: {
      matterNumber: "2026-014",
      notes: "Partner review pending fee arrangement confirmation.",
      lastAction: "Prebill routed to responsible attorney",
    },
  },
  {
    id: "bq-2",
    matter: "Hartwell IP Portfolio",
    client: "Hartwell Industries",
    attorney: "Avery Counsel",
    billingCycle: "Monthly Corporate",
    unbilledWip: 56_800,
    draftAmount: 48_900,
    status: "Awaiting Attorney Review",
    daysWaiting: 11,
    lastUpdated: "2026-08-02",
    isException: true,
    detail: {
      matterNumber: "2026-008",
      notes: "Approval overdue — escalation recommended.",
      lastAction: "Reminder sent to attorney",
    },
  },
  {
    id: "bq-3",
    matter: "Summit Employment Dispute",
    client: "Summit Holdings",
    attorney: "Morgan Counsel",
    billingCycle: "Insurance Defense",
    unbilledWip: 42_100,
    draftAmount: 38_750,
    status: "Returned for Correction",
    daysWaiting: 9,
    lastUpdated: "2026-08-03",
    isException: true,
    detail: {
      matterNumber: "2026-011",
      notes: "Time narrative revisions requested by attorney.",
      lastAction: "Returned for correction",
    },
  },
  {
    id: "bq-4",
    matter: "Northgate Regulatory Review",
    client: "Northgate Partners",
    attorney: "Parker Legal",
    billingCycle: "Monthly Corporate",
    unbilledWip: 31_400,
    draftAmount: 28_600,
    status: "Draft",
    daysWaiting: 8,
    lastUpdated: "2026-08-04",
    isException: false,
    detail: {
      matterNumber: "2026-016",
      notes: "Draft assembly in progress.",
      lastAction: "WIP compiled for review",
    },
  },
  {
    id: "bq-5",
    matter: "Crestview Litigation",
    client: "Crestview LLC",
    attorney: "Jordan Lee",
    billingCycle: "Litigation Cycle",
    unbilledWip: 67_500,
    draftAmount: 0,
    status: "Draft",
    daysWaiting: 7,
    lastUpdated: "2026-08-04",
    isException: true,
    detail: {
      matterNumber: "2025-092",
      notes: "Missing billing rate on two timekeepers.",
      lastAction: "Rate exception flagged",
    },
  },
  {
    id: "bq-6",
    matter: "Lakeview Trust Administration",
    client: "Lakeview Family Office",
    attorney: "Avery Counsel",
    billingCycle: "Retainer Review",
    unbilledWip: 18_900,
    draftAmount: 16_200,
    status: "Approved",
    daysWaiting: 4,
    lastUpdated: "2026-08-05",
    isException: false,
    detail: {
      matterNumber: "2026-003",
      notes: "Approved — ready for finalization queue.",
      lastAction: "Attorney approved prebill",
    },
  },
  {
    id: "bq-7",
    matter: "Beacon Insurance Coverage",
    client: "Beacon Mutual",
    attorney: "Bailey Ledger",
    billingCycle: "Insurance Defense",
    unbilledWip: 24_300,
    draftAmount: 22_100,
    status: "Ready to Send",
    daysWaiting: 3,
    lastUpdated: "2026-08-05",
    isException: false,
    detail: {
      matterNumber: "2026-019",
      notes: "Final invoice package prepared.",
      lastAction: "Marked ready to send",
    },
  },
  {
    id: "bq-8",
    matter: "Ridgeway Commercial Lease",
    client: "Ridgeway Properties",
    attorney: "Morgan Counsel",
    billingCycle: "Monthly Corporate",
    unbilledWip: 12_600,
    draftAmount: 11_800,
    status: "Sent",
    daysWaiting: 1,
    lastUpdated: "2026-08-05",
    isException: false,
    detail: {
      matterNumber: "2026-021",
      notes: "Invoice transmitted to client billing contact.",
      lastAction: "Invoice sent",
    },
  },
  {
    id: "bq-9",
    matter: "Westfield Compliance Audit",
    client: "Westfield Group",
    attorney: "Parker Legal",
    billingCycle: "Monthly Corporate",
    unbilledWip: 39_800,
    draftAmount: 35_400,
    status: "Awaiting Attorney Review",
    daysWaiting: 10,
    lastUpdated: "2026-08-02",
    isException: true,
    detail: {
      matterNumber: "2026-017",
      notes: "Engagement budget exceeded by $8,200.",
      lastAction: "Budget exception logged",
    },
  },
  {
    id: "bq-10",
    matter: "Harborview M&A Advisory",
    client: "Harborview Capital",
    attorney: "Jordan Lee",
    billingCycle: "Monthly Corporate",
    unbilledWip: 91_200,
    draftAmount: 82_500,
    status: "Draft",
    daysWaiting: 6,
    lastUpdated: "2026-08-04",
    isException: false,
    detail: {
      matterNumber: "2026-022",
      notes: "Large matter — manager review recommended before release.",
      lastAction: "Draft created",
    },
  },
];

export const billingDeadlines: BillingDeadline[] = [
  {
    id: "dl-1",
    date: "August 7",
    label: "Monthly corporate billing cycle",
    affectedCount: 36,
  },
  {
    id: "dl-2",
    date: "August 10",
    label: "Insurance defense billing cycle",
    affectedCount: 24,
  },
  {
    id: "dl-3",
    date: "August 15",
    label: "Retainer replenishment review",
    affectedCount: 18,
  },
  {
    id: "dl-4",
    date: "August 20",
    label: "Final monthly billing cutoff — Firm-wide",
    affectedCount: 348,
  },
];

export const billingRecentActivity: BillingActivityEvent[] = [
  {
    id: "act-1",
    action: "Draft bill approved",
    reference: "Lakeview Trust Administration",
    user: "Jordan Lee",
    relativeTime: "2 hours ago",
  },
  {
    id: "act-2",
    action: "Invoice finalized",
    reference: "INV-10482 — Ridgeway Commercial Lease",
    user: "Bailey Ledger",
    relativeTime: "4 hours ago",
  },
  {
    id: "act-3",
    action: "Billing rate exception resolved",
    reference: "Crestview Litigation",
    user: "Alex Morgan",
    relativeTime: "Yesterday",
  },
  {
    id: "act-4",
    action: "Prebill returned for correction",
    reference: "Summit Employment Dispute",
    user: "Morgan Counsel",
    relativeTime: "Yesterday",
  },
  {
    id: "act-5",
    action: "LEDES invoice exported",
    reference: "Beacon Insurance Coverage",
    user: "Bailey Ledger",
    relativeTime: "2 days ago",
  },
  {
    id: "act-6",
    action: "Monthly billing batch completed",
    reference: "Corporate cycle — 36 matters",
    user: "Billing Operations",
    relativeTime: "3 days ago",
  },
];

export const billingQueueStatusOptions: BillingQueueStatus[] = [
  "Draft",
  "Awaiting Attorney Review",
  "Returned for Correction",
  "Approved",
  "Ready to Send",
  "Sent",
];

export const billingAttorneyOptions = [
  "All attorneys",
  ...Array.from(new Set(billingQueueRecords.map((r) => r.attorney))).sort(),
];

export const billingCycleOptions = [
  "All cycles",
  ...Array.from(new Set(billingQueueRecords.map((r) => r.billingCycle))).sort(),
];

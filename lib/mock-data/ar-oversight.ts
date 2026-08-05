export type AgingBucket =
  | "Current"
  | "1–30 Days"
  | "31–60 Days"
  | "61–90 Days"
  | "90+ Days";

export type CollectionStatus =
  | "Current"
  | "Past Due"
  | "Payment Plan"
  | "Promise To Pay"
  | "Attorney Assistance Needed"
  | "Disputed"
  | "Final Notice"
  | "Write-Off Requested";

export type CollectionRisk = "Green" | "Yellow" | "Red";

export type ExceptionSeverity = "High" | "Medium" | "Low";

export interface ArSummaryKpi {
  id: string;
  title: string;
  value: string;
  supportingText: string;
  warning?: boolean;
  queueFilter: Partial<CollectionsQueueFilterPayload>;
}

export interface ArAgingBucket {
  id: string;
  label: AgingBucket;
  amount: number;
  invoiceCount: number;
  percentOfTotal: number;
}

export interface ArCollectionException {
  id: string;
  name: string;
  count: number;
  impact: string;
  severity: ExceptionSeverity;
  queueFilter: Partial<CollectionsQueueFilterPayload>;
}

export interface ArClientRiskProfile {
  id: string;
  client: string;
  outstandingBalance: number;
  balance90Plus: number;
  oldestInvoice: string;
  attorney: string;
  collectionRisk: CollectionRisk;
  openDisputes: number;
}

export interface ArCollectionsRecord {
  id: string;
  invoiceNumber: string;
  client: string;
  matter: string;
  attorney: string;
  invoiceDate: string;
  dueDate: string;
  originalAmount: number;
  outstandingBalance: number;
  ageDays: number;
  agingBucket: AgingBucket;
  collectionStatus: CollectionStatus;
  lastContact: string;
  lastContactDays: number;
  nextFollowUp: string;
  assignedCollector: string;
  office: string;
  isException: boolean;
  exceptionTypes: string[];
  detail: {
    matterNumber: string;
    paymentHistory: string;
    collectionNotes: string;
    lastAction: string;
  };
}

export interface ArAttorneyResponsibility {
  id: string;
  attorney: string;
  totalAr: number;
  pastDue: number;
  balance90Plus: number;
  disputed: number;
  attorneyActionNeeded: number;
}

export interface ArPaymentException {
  id: string;
  label: string;
  count: number;
  amount: number;
}

export type WriteOffApprovalStatus =
  | "Pending"
  | "Under Review"
  | "Approved"
  | "Rejected";

export interface ArWriteOffRequest {
  id: string;
  client: string;
  matter: string;
  invoice: string;
  originalInvoiceAmount: number;
  outstandingBalance: number;
  requestedAmount: number;
  reason: string;
  supportingNotes: string;
  requestedBy: string;
  requestedDate: string;
  approvalStatus: WriteOffApprovalStatus;
  responsibleAttorney: string;
  daysOutstanding: number;
  priorCollectionActivity: string;
  rejectionReason?: string;
}

export interface ArActivityEvent {
  id: string;
  action: string;
  matter: string;
  description: string;
  user: string;
  relativeTime: string;
}

export interface CollectionsQueueFilterPayload {
  search: string;
  agingBucket: string;
  attorney: string;
  collectionStatus: string;
  assignedCollector: string;
  office: string;
  minBalance: string;
  exceptionsOnly: boolean;
  client: string;
  exceptionType: string;
  kpiFilter: string;
}

export const arAttorneyOptions = [
  "All attorneys",
  "Sarah Chen",
  "Michael Torres",
  "Jennifer Walsh",
  "David Kim",
  "Rachel Foster",
];

export const arCollectorOptions = [
  "All collectors",
  "Lisa Park",
  "James Rivera",
  "Unassigned",
];

export const arOfficeOptions = [
  "All offices",
  "Chicago",
  "New York",
  "Los Angeles",
  "Dallas",
];

export const arAgingBucketOptions: AgingBucket[] = [
  "Current",
  "1–30 Days",
  "31–60 Days",
  "61–90 Days",
  "90+ Days",
];

export const arCollectionStatusOptions: CollectionStatus[] = [
  "Current",
  "Past Due",
  "Payment Plan",
  "Promise To Pay",
  "Attorney Assistance Needed",
  "Disputed",
  "Final Notice",
  "Write-Off Requested",
];

export const arSummaryKpis: ArSummaryKpi[] = [
  {
    id: "total-outstanding",
    title: "Total Outstanding A/R",
    value: "$428,750",
    supportingText: "184 Open Invoices",
    queueFilter: { kpiFilter: "all" },
  },
  {
    id: "past-due",
    title: "Past Due",
    value: "$176,420",
    supportingText: "41.1% of total A/R",
    warning: true,
    queueFilter: { collectionStatus: "Past Due" },
  },
  {
    id: "ninety-plus",
    title: "90+ Day Receivables",
    value: "$72,810",
    supportingText: "17 Clients",
    warning: true,
    queueFilter: { agingBucket: "90+ Days" },
  },
  {
    id: "unapplied-cash",
    title: "Unapplied Cash",
    value: "$18,650",
    supportingText: "9 Payments Await Matching",
    queueFilter: { exceptionType: "unapplied_payments" },
  },
  {
    id: "collection-rate",
    title: "Collection Rate",
    value: "87.4%",
    supportingText: "Trailing 90 Days",
    queueFilter: { kpiFilter: "collection_rate" },
  },
  {
    id: "write-off-pending",
    title: "Pending Write-Off Requests",
    value: "6",
    supportingText: "$24,300 Awaiting Approval",
    warning: true,
    queueFilter: { collectionStatus: "Write-Off Requested" },
  },
];

export const arAgingBuckets: ArAgingBucket[] = [
  {
    id: "current",
    label: "Current",
    amount: 182400,
    invoiceCount: 72,
    percentOfTotal: 42.5,
  },
  {
    id: "1-30",
    label: "1–30 Days",
    amount: 69930,
    invoiceCount: 38,
    percentOfTotal: 16.3,
  },
  {
    id: "31-60",
    label: "31–60 Days",
    amount: 53610,
    invoiceCount: 31,
    percentOfTotal: 12.5,
  },
  {
    id: "61-90",
    label: "61–90 Days",
    amount: 50000,
    invoiceCount: 26,
    percentOfTotal: 11.7,
  },
  {
    id: "90-plus",
    label: "90+ Days",
    amount: 72810,
    invoiceCount: 17,
    percentOfTotal: 17.0,
  },
];

export const arCollectionExceptions: ArCollectionException[] = [
  {
    id: "attorney-response",
    name: "Attorney Response Needed",
    count: 7,
    impact: "$42,600",
    severity: "High",
    queueFilter: {
      collectionStatus: "Attorney Assistance Needed",
      exceptionsOnly: true,
    },
  },
  {
    id: "broken-promise",
    name: "Broken Promise To Pay",
    count: 4,
    impact: "$31,400",
    severity: "High",
    queueFilter: {
      exceptionType: "broken_promise",
      exceptionsOnly: true,
    },
  },
  {
    id: "no-activity",
    name: "No Collection Activity In 30 Days",
    count: 12,
    impact: "$68,900",
    severity: "Medium",
    queueFilter: {
      exceptionType: "no_activity",
      exceptionsOnly: true,
    },
  },
  {
    id: "credits-not-applied",
    name: "Credits Not Applied",
    count: 5,
    impact: "$9,850",
    severity: "Medium",
    queueFilter: {
      exceptionType: "credits_not_applied",
      exceptionsOnly: true,
    },
  },
  {
    id: "unapplied-payments",
    name: "Unapplied Payments",
    count: 9,
    impact: "$18,650",
    severity: "Medium",
    queueFilter: {
      exceptionType: "unapplied_payments",
      exceptionsOnly: true,
    },
  },
  {
    id: "write-off-requests",
    name: "Pending Write-Off Requests",
    count: 6,
    impact: "$24,300",
    severity: "High",
    queueFilter: {
      collectionStatus: "Write-Off Requested",
      exceptionsOnly: true,
    },
  },
];

export const arClientRiskProfiles: ArClientRiskProfile[] = [
  {
    id: "c1",
    client: "Northwind Holdings LLC",
    outstandingBalance: 48200,
    balance90Plus: 22400,
    oldestInvoice: "Nov 12, 2025",
    attorney: "Sarah Chen",
    collectionRisk: "Red",
    openDisputes: 2,
  },
  {
    id: "c2",
    client: "Summit Retail Group",
    outstandingBalance: 36850,
    balance90Plus: 14200,
    oldestInvoice: "Dec 3, 2025",
    attorney: "Michael Torres",
    collectionRisk: "Red",
    openDisputes: 1,
  },
  {
    id: "c3",
    client: "Beacon Medical Partners",
    outstandingBalance: 29400,
    balance90Plus: 0,
    oldestInvoice: "Jan 18, 2026",
    attorney: "Jennifer Walsh",
    collectionRisk: "Yellow",
    openDisputes: 0,
  },
  {
    id: "c4",
    client: "Harbor Logistics Inc.",
    outstandingBalance: 25100,
    balance90Plus: 8900,
    oldestInvoice: "Oct 28, 2025",
    attorney: "David Kim",
    collectionRisk: "Yellow",
    openDisputes: 1,
  },
  {
    id: "c5",
    client: "Atlas Construction Co.",
    outstandingBalance: 22800,
    balance90Plus: 0,
    oldestInvoice: "Feb 2, 2026",
    attorney: "Rachel Foster",
    collectionRisk: "Green",
    openDisputes: 0,
  },
  {
    id: "c6",
    client: "Pinnacle Software Ltd.",
    outstandingBalance: 19650,
    balance90Plus: 6200,
    oldestInvoice: "Nov 30, 2025",
    attorney: "Sarah Chen",
    collectionRisk: "Yellow",
    openDisputes: 0,
  },
  {
    id: "c7",
    client: "Greenfield Energy Corp.",
    outstandingBalance: 18400,
    balance90Plus: 0,
    oldestInvoice: "Jan 25, 2026",
    attorney: "Michael Torres",
    collectionRisk: "Green",
    openDisputes: 0,
  },
  {
    id: "c8",
    client: "Meridian Capital Advisors",
    outstandingBalance: 16200,
    balance90Plus: 5100,
    oldestInvoice: "Dec 15, 2025",
    attorney: "Jennifer Walsh",
    collectionRisk: "Yellow",
    openDisputes: 1,
  },
  {
    id: "c9",
    client: "Sterling Healthcare Group",
    outstandingBalance: 14800,
    balance90Plus: 0,
    oldestInvoice: "Feb 10, 2026",
    attorney: "David Kim",
    collectionRisk: "Green",
    openDisputes: 0,
  },
  {
    id: "c10",
    client: "Vanguard Manufacturing",
    outstandingBalance: 13350,
    balance90Plus: 4200,
    oldestInvoice: "Dec 22, 2025",
    attorney: "Rachel Foster",
    collectionRisk: "Yellow",
    openDisputes: 0,
  },
];

export const arCollectionsQueue: ArCollectionsRecord[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2025-1842",
    client: "Northwind Holdings LLC",
    matter: "Commercial Lease Dispute",
    attorney: "Sarah Chen",
    invoiceDate: "Oct 15, 2025",
    dueDate: "Nov 14, 2025",
    originalAmount: 28400,
    outstandingBalance: 22400,
    ageDays: 112,
    agingBucket: "90+ Days",
    collectionStatus: "Attorney Assistance Needed",
    lastContact: "Jan 8, 2026",
    lastContactDays: 27,
    nextFollowUp: "Feb 12, 2026",
    assignedCollector: "Lisa Park",
    office: "Chicago",
    isException: true,
    exceptionTypes: ["attorney_response", "no_activity"],
    detail: {
      matterNumber: "2025-CL-0412",
      paymentHistory: "Partial payment of $6,000 received Dec 2, 2025",
      collectionNotes: "Client disputing late fee allocation. Attorney review requested.",
      lastAction: "Escalated to responsible attorney",
    },
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2025-1901",
    client: "Summit Retail Group",
    matter: "Employment Litigation",
    attorney: "Michael Torres",
    invoiceDate: "Nov 1, 2025",
    dueDate: "Dec 1, 2025",
    originalAmount: 31800,
    outstandingBalance: 31800,
    ageDays: 95,
    agingBucket: "90+ Days",
    collectionStatus: "Disputed",
    lastContact: "Dec 18, 2025",
    lastContactDays: 48,
    nextFollowUp: "Feb 5, 2026",
    assignedCollector: "James Rivera",
    office: "New York",
    isException: true,
    exceptionTypes: ["no_activity"],
    detail: {
      matterNumber: "2025-EL-0298",
      paymentHistory: "No payments received",
      collectionNotes: "Client claims billing overage on associate hours.",
      lastAction: "Dispute logged and pending attorney response",
    },
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2025-2014",
    client: "Harbor Logistics Inc.",
    matter: "Contract Negotiation",
    attorney: "David Kim",
    invoiceDate: "Dec 10, 2025",
    dueDate: "Jan 9, 2026",
    originalAmount: 16200,
    outstandingBalance: 8900,
    ageDays: 57,
    agingBucket: "31–60 Days",
    collectionStatus: "Promise To Pay",
    lastContact: "Jan 22, 2026",
    lastContactDays: 13,
    nextFollowUp: "Feb 8, 2026",
    assignedCollector: "Lisa Park",
    office: "Los Angeles",
    isException: true,
    exceptionTypes: ["broken_promise"],
    detail: {
      matterNumber: "2025-CN-0156",
      paymentHistory: "Partial payment of $7,300 received Jan 5, 2026",
      collectionNotes: "Promise to pay remaining balance by Jan 20 was not met.",
      lastAction: "Follow-up call scheduled",
    },
  },
  {
    id: "inv-004",
    invoiceNumber: "INV-2026-0042",
    client: "Pinnacle Software Ltd.",
    matter: "IP Licensing Review",
    attorney: "Sarah Chen",
    invoiceDate: "Jan 5, 2026",
    dueDate: "Feb 4, 2026",
    originalAmount: 12400,
    outstandingBalance: 6200,
    ageDays: 31,
    agingBucket: "1–30 Days",
    collectionStatus: "Past Due",
    lastContact: "Jan 30, 2026",
    lastContactDays: 5,
    nextFollowUp: "Feb 10, 2026",
    assignedCollector: "James Rivera",
    office: "Chicago",
    isException: true,
    exceptionTypes: ["unapplied_payments"],
    detail: {
      matterNumber: "2026-IP-0008",
      paymentHistory: "Partial payment of $6,200 received Jan 28, 2026",
      collectionNotes: "Accounts payable processing remaining balance.",
      lastAction: "Payment reminder sent",
    },
  },
  {
    id: "inv-005",
    invoiceNumber: "INV-2025-1768",
    client: "Meridian Capital Advisors",
    matter: "Regulatory Compliance",
    attorney: "Jennifer Walsh",
    invoiceDate: "Sep 22, 2025",
    dueDate: "Oct 22, 2025",
    originalAmount: 9800,
    outstandingBalance: 5100,
    ageDays: 105,
    agingBucket: "90+ Days",
    collectionStatus: "Write-Off Requested",
    lastContact: "Jan 15, 2026",
    lastContactDays: 20,
    nextFollowUp: "—",
    assignedCollector: "Lisa Park",
    office: "Dallas",
    isException: true,
    exceptionTypes: ["write_off"],
    detail: {
      matterNumber: "2025-RC-0331",
      paymentHistory: "Partial payment of $4,700 received Nov 10, 2025",
      collectionNotes: "Write-off request submitted for uncollectible balance.",
      lastAction: "Write-off pending manager approval",
    },
  },
  {
    id: "inv-006",
    invoiceNumber: "INV-2026-0088",
    client: "Beacon Medical Partners",
    matter: "Healthcare Compliance Audit",
    attorney: "Jennifer Walsh",
    invoiceDate: "Jan 18, 2026",
    dueDate: "Feb 17, 2026",
    originalAmount: 29400,
    outstandingBalance: 29400,
    ageDays: 18,
    agingBucket: "Current",
    collectionStatus: "Current",
    lastContact: "Feb 1, 2026",
    lastContactDays: 3,
    nextFollowUp: "Feb 20, 2026",
    assignedCollector: "Unassigned",
    office: "New York",
    isException: false,
    exceptionTypes: [],
    detail: {
      matterNumber: "2026-HC-0012",
      paymentHistory: "No payments received",
      collectionNotes: "Invoice within terms. No collection action required.",
      lastAction: "Invoice delivered via client portal",
    },
  },
  {
    id: "inv-007",
    invoiceNumber: "INV-2025-1680",
    client: "Vanguard Manufacturing",
    matter: "Product Liability Defense",
    attorney: "Rachel Foster",
    invoiceDate: "Aug 30, 2025",
    dueDate: "Sep 29, 2025",
    originalAmount: 14200,
    outstandingBalance: 4200,
    ageDays: 128,
    agingBucket: "90+ Days",
    collectionStatus: "Final Notice",
    lastContact: "Jan 10, 2026",
    lastContactDays: 25,
    nextFollowUp: "Feb 15, 2026",
    assignedCollector: "James Rivera",
    office: "Chicago",
    isException: true,
    exceptionTypes: ["no_activity"],
    detail: {
      matterNumber: "2025-PL-0274",
      paymentHistory: "Payments totaling $10,000 received through Dec 2025",
      collectionNotes: "Final notice issued. Evaluating write-off if no response.",
      lastAction: "Final notice letter sent",
    },
  },
  {
    id: "inv-008",
    invoiceNumber: "INV-2026-0115",
    client: "Atlas Construction Co.",
    matter: "Surety Bond Claim",
    attorney: "Rachel Foster",
    invoiceDate: "Feb 2, 2026",
    dueDate: "Mar 4, 2026",
    originalAmount: 22800,
    outstandingBalance: 22800,
    ageDays: 3,
    agingBucket: "Current",
    collectionStatus: "Current",
    lastContact: "Feb 3, 2026",
    lastContactDays: 1,
    nextFollowUp: "Mar 1, 2026",
    assignedCollector: "Lisa Park",
    office: "Dallas",
    isException: false,
    exceptionTypes: [],
    detail: {
      matterNumber: "2026-SB-0004",
      paymentHistory: "No payments received",
      collectionNotes: "New invoice. Standard terms apply.",
      lastAction: "Invoice sent to billing contact",
    },
  },
  {
    id: "inv-009",
    invoiceNumber: "INV-2025-1955",
    client: "Greenfield Energy Corp.",
    matter: "Environmental Permitting",
    attorney: "Michael Torres",
    invoiceDate: "Nov 20, 2025",
    dueDate: "Dec 20, 2025",
    originalAmount: 8600,
    outstandingBalance: 4300,
    ageDays: 76,
    agingBucket: "61–90 Days",
    collectionStatus: "Payment Plan",
    lastContact: "Jan 25, 2026",
    lastContactDays: 10,
    nextFollowUp: "Feb 20, 2026",
    assignedCollector: "James Rivera",
    office: "Los Angeles",
    isException: false,
    exceptionTypes: [],
    detail: {
      matterNumber: "2025-EP-0189",
      paymentHistory: "Monthly installments of $1,433 through Jan 2026",
      collectionNotes: "Active payment plan. Next installment due Feb 20.",
      lastAction: "Payment plan installment received",
    },
  },
  {
    id: "inv-010",
    invoiceNumber: "INV-2025-1820",
    client: "Sterling Healthcare Group",
    matter: "M&A Due Diligence",
    attorney: "David Kim",
    invoiceDate: "Oct 5, 2025",
    dueDate: "Nov 4, 2025",
    originalAmount: 24600,
    outstandingBalance: 14800,
    ageDays: 92,
    agingBucket: "90+ Days",
    collectionStatus: "Past Due",
    lastContact: "Dec 5, 2025",
    lastContactDays: 61,
    nextFollowUp: "Feb 6, 2026",
    assignedCollector: "Lisa Park",
    office: "New York",
    isException: true,
    exceptionTypes: ["no_activity", "credits_not_applied"],
    detail: {
      matterNumber: "2025-MA-0387",
      paymentHistory: "Payment of $9,800 received Oct 30, 2025",
      collectionNotes: "Credit memo of $1,200 not yet applied to balance.",
      lastAction: "Credit application pending review",
    },
  },
];

export const arAttorneyResponsibility: ArAttorneyResponsibility[] = [
  {
    id: "a1",
    attorney: "Sarah Chen",
    totalAr: 98400,
    pastDue: 52200,
    balance90Plus: 28600,
    disputed: 0,
    attorneyActionNeeded: 2,
  },
  {
    id: "a2",
    attorney: "Michael Torres",
    totalAr: 76200,
    pastDue: 43100,
    balance90Plus: 0,
    disputed: 31800,
    attorneyActionNeeded: 1,
  },
  {
    id: "a3",
    attorney: "Jennifer Walsh",
    totalAr: 64300,
    pastDue: 34500,
    balance90Plus: 5100,
    disputed: 0,
    attorneyActionNeeded: 0,
  },
  {
    id: "a4",
    attorney: "David Kim",
    totalAr: 58900,
    pastDue: 23700,
    balance90Plus: 14800,
    disputed: 0,
    attorneyActionNeeded: 0,
  },
  {
    id: "a5",
    attorney: "Rachel Foster",
    totalAr: 40350,
    pastDue: 4200,
    balance90Plus: 4200,
    disputed: 0,
    attorneyActionNeeded: 0,
  },
];

export const arPaymentExceptions: ArPaymentException[] = [
  { id: "pe1", label: "Unapplied Payments", count: 9, amount: 18650 },
  { id: "pe2", label: "Partial Payments", count: 14, amount: 42800 },
  { id: "pe3", label: "Failed Payments", count: 3, amount: 9200 },
  { id: "pe4", label: "Overpayments", count: 2, amount: 1450 },
  { id: "pe5", label: "Credits Awaiting Application", count: 5, amount: 9850 },
  { id: "pe6", label: "Returned Payments", count: 1, amount: 3200 },
  { id: "pe7", label: "Pending Deposits", count: 4, amount: 22400 },
];

export const arWriteOffRequests: ArWriteOffRequest[] = [
  {
    id: "wo1",
    client: "Meridian Capital Advisors",
    matter: "Regulatory Compliance",
    invoice: "INV-2025-1768",
    originalInvoiceAmount: 9800,
    outstandingBalance: 5100,
    requestedAmount: 5100,
    reason: "Client insolvency — partial recovery unlikely",
    supportingNotes:
      "Client entered receivership in December 2025. Remaining balance deemed uncollectible after three collection attempts and attorney consultation.",
    requestedBy: "Lisa Park",
    requestedDate: "Jan 15, 2026",
    approvalStatus: "Pending",
    responsibleAttorney: "Jennifer Walsh",
    daysOutstanding: 105,
    priorCollectionActivity:
      "Partial payment of $4,700 received Nov 10, 2025. Final notice sent Jan 5, 2026.",
  },
  {
    id: "wo2",
    client: "Northwind Holdings LLC",
    matter: "Commercial Lease Dispute",
    invoice: "INV-2025-1720",
    originalInvoiceAmount: 18600,
    outstandingBalance: 9600,
    requestedAmount: 4800,
    reason: "Settlement agreement — agreed write-down",
    supportingNotes:
      "Settlement executed Jan 18, 2026 includes a negotiated write-down of disputed late fees. Responsible attorney confirmed terms.",
    requestedBy: "James Rivera",
    requestedDate: "Jan 22, 2026",
    approvalStatus: "Under Review",
    responsibleAttorney: "Sarah Chen",
    daysOutstanding: 98,
    priorCollectionActivity:
      "Settlement conference held Jan 18, 2026. Client agreed to pay $4,800 of remaining balance.",
  },
  {
    id: "wo3",
    client: "Summit Retail Group",
    matter: "Employment Litigation",
    invoice: "INV-2025-1888",
    originalInvoiceAmount: 28400,
    outstandingBalance: 12400,
    requestedAmount: 6200,
    reason: "Billing dispute resolution — credited amount",
    supportingNotes:
      "Client disputed 18 associate hours. After review, billing team agreed to credit disputed time entries.",
    requestedBy: "Lisa Park",
    requestedDate: "Jan 28, 2026",
    approvalStatus: "Pending",
    responsibleAttorney: "Michael Torres",
    daysOutstanding: 76,
    priorCollectionActivity:
      "Dispute logged Dec 18, 2025. Attorney review completed Jan 20, 2026.",
  },
  {
    id: "wo4",
    client: "Harbor Logistics Inc.",
    matter: "Contract Negotiation",
    invoice: "INV-2025-1795",
    originalInvoiceAmount: 6200,
    outstandingBalance: 3100,
    requestedAmount: 3100,
    reason: "Small balance — cost of collection exceeds recovery",
    supportingNotes:
      "Remaining balance below firm minimum collection threshold. Two prior reminders sent with no response.",
    requestedBy: "James Rivera",
    requestedDate: "Feb 1, 2026",
    approvalStatus: "Pending",
    responsibleAttorney: "David Kim",
    daysOutstanding: 64,
    priorCollectionActivity:
      "Payment reminder sent Jan 12, 2026. Follow-up call attempted Jan 25, 2026.",
  },
  {
    id: "wo5",
    client: "Vanguard Manufacturing",
    matter: "Product Liability Defense",
    invoice: "INV-2025-1680",
    originalInvoiceAmount: 14200,
    outstandingBalance: 4200,
    requestedAmount: 4200,
    reason: "No response after final notice",
    supportingNotes:
      "Final notice issued Jan 10, 2026 with no client response. Matter closed; receivable unlikely to be collected.",
    requestedBy: "Lisa Park",
    requestedDate: "Feb 3, 2026",
    approvalStatus: "Pending",
    responsibleAttorney: "Rachel Foster",
    daysOutstanding: 128,
    priorCollectionActivity:
      "Payments totaling $10,000 received through Dec 2025. Final notice sent Jan 10, 2026.",
  },
  {
    id: "wo6",
    client: "Pinnacle Software Ltd.",
    matter: "IP Licensing Review",
    invoice: "INV-2025-1940",
    originalInvoiceAmount: 5400,
    outstandingBalance: 2200,
    requestedAmount: 1100,
    reason: "Duplicate billing correction",
    supportingNotes:
      "Duplicate research charge identified during month-end review. Corrected invoice already reissued to client.",
    requestedBy: "James Rivera",
    requestedDate: "Feb 4, 2026",
    approvalStatus: "Under Review",
    responsibleAttorney: "Sarah Chen",
    daysOutstanding: 42,
    priorCollectionActivity:
      "Billing correction memo prepared Feb 2, 2026. Client acknowledged duplicate entry.",
  },
];

export const arRecentActivity: ArActivityEvent[] = [
  {
    id: "act1",
    action: "Payment Applied",
    matter: "Atlas Construction Co. — Surety Bond Claim",
    description: "$4,500 applied to INV-2026-0088",
    user: "Lisa Park",
    relativeTime: "2 hours ago",
  },
  {
    id: "act2",
    action: "Promise To Pay Recorded",
    matter: "Harbor Logistics Inc. — Contract Negotiation",
    description: "Client committed to pay $8,900 by Feb 8",
    user: "Lisa Park",
    relativeTime: "5 hours ago",
  },
  {
    id: "act3",
    action: "Invoice Disputed",
    matter: "Summit Retail Group — Employment Litigation",
    description: "Client disputed associate hour allocation",
    user: "James Rivera",
    relativeTime: "Yesterday",
  },
  {
    id: "act4",
    action: "Write-Off Requested",
    matter: "Meridian Capital Advisors — Regulatory Compliance",
    description: "$5,100 write-off submitted for approval",
    user: "Lisa Park",
    relativeTime: "Yesterday",
  },
  {
    id: "act5",
    action: "Credit Memo Applied",
    matter: "Sterling Healthcare Group — M&A Due Diligence",
    description: "$1,200 credit applied to outstanding balance",
    user: "James Rivera",
    relativeTime: "2 days ago",
  },
  {
    id: "act6",
    action: "Collection Note Added",
    matter: "Northwind Holdings LLC — Commercial Lease Dispute",
    description: "Escalated to Sarah Chen for attorney response",
    user: "Lisa Park",
    relativeTime: "3 days ago",
  },
];

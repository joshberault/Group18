export type AgingBucket =
  | "Current"
  | "1–30 Days"
  | "31–60 Days"
  | "61–90 Days"
  | "90+ Days";

export type CollectionEscalationStage =
  | "reminder"
  | "internal_review"
  | "write_off_requested"
  | "external_collections";

export const COLLECTION_ESCALATION_LABELS: Record<
  CollectionEscalationStage,
  string
> = {
  reminder: "Reminder",
  internal_review: "Internal Review",
  write_off_requested: "Write-Off Requested",
  external_collections: "External Collections",
};

export const COLLECTION_ESCALATION_ORDER: CollectionEscalationStage[] = [
  "reminder",
  "internal_review",
  "write_off_requested",
  "external_collections",
];

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
  escalationStage: CollectionEscalationStage;
  externalCollectionsApproved: boolean;
  invoiceId: string;
  clientId: string;
  matterId: string;
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


export const arSummaryKpis: ArSummaryKpi[] = [];
export const arAgingBuckets: ArAgingBucket[] = [];
export const arCollectionExceptions: ArCollectionException[] = [];
export const arClientRiskProfiles: ArClientRiskProfile[] = [];
export const arCollectionsQueue: ArCollectionsRecord[] = [];
export const arAttorneyResponsibility: ArAttorneyResponsibility[] = [];
export const arPaymentExceptions: ArPaymentException[] = [];
export const arWriteOffRequests: ArWriteOffRequest[] = [];
export const arRecentActivity: ArActivityEvent[] = [];

import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import { CASE_TYPE_TASK_LISTS } from "@/lib/client-portal/case-task-lists";

import {
  DEMO_ENGAGEMENT_IDS,
  DEMO_ENGAGEMENT_SUMMARY,
} from "@/lib/demo/two-engagements";

/** Empty until the client has an active engagement. */
export const clientAccountSummary = {
  clientName: "Harborview Manufacturing LLC",
  accountNumber: "CL-1001",
  outstandingBalance: DEMO_ENGAGEMENT_SUMMARY.outstandingAr,
  trustBalance: DEMO_ENGAGEMENT_SUMMARY.trustHeld,
  openMatters: 0,
  unpaidInvoices: 0,
  lastPaymentDate: "2025-07-12",
  lastPaymentAmount: 8925,
  invoiceTotal: 8925,
  remainingBalance: 0,
  statementBalance: 0,
  hoursSubmitted: {
    attorneys: 0,
    paralegals: 0,
  },
  trust: {
    beginningBalance: 0,
    currentBalance: 0,
    clientMatterNumber: "",
    lastReconciledAt: "",
    threeWayMatchStatus: "matched" as const,
  },
};

export const trustLedgerEntries: {
  id: string;
  type: "addition" | "subtraction";
  date: string;
  amount: number;
  description: string;
  reference: string;
  matterNumber: string;
}[] = [];

export const accountRiskControls = {
  duplicateBillingChecks: [] as {
    id: string;
    status: "clear" | "review";
    label: string;
    detail: string;
  }[],
  statementReconciliation: {
    invoiceChargeTotal: 0,
    paidChargeTotal: 0,
    remainingFromCharges: 0,
    statementBalance: 0,
    status: "matched" as const,
    detail: "No invoice activity yet.",
  },
  trustControls: [] as {
    id: string;
    status: "clear" | "review";
    label: string;
    detail: string;
  }[],
};

export const openInvoices: {
  id: string;
  invoiceNumber: string;
  matterTitle: string;
  caseNumber: string;
  dueDate: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "partial";
}[] = [];

export const invoiceCharges: {
  id: string;
  invoiceNumber: string;
  caseNumber: string;
  amount: number;
  reason: string;
  chargeDate: string;
  status: "unpaid" | "paid";
}[] = [
  {
    id: DEMO_ENGAGEMENT_IDS.invoiceHarborview,
    invoiceNumber: "CF-2025-0001",
    caseNumber: "M-2025-0001",
    amount: 8925,
    reason: "Harborview Supply Contract Dispute — final invoice",
    chargeDate: "2025-06-05",
    status: "paid",
  },
];

export const paymentMethods = [
  { value: "card", label: "Credit / Debit Card" },
  { value: "ach", label: "Bank Transfer (ACH)" },
  { value: "trust", label: "Apply Trust Balance" },
];

export type CaseTaskStatus = "completed" | "in_progress" | "pending";

export interface ClientEngagedCase {
  id: string;
  caseNumber: string;
  title: string;
  caseType: CaseTypeId;
  openDate: string;
  status: "open" | "pending" | "closed";
  description: string;
  completedTaskCount: number;
}

export const clientEngagedCases: ClientEngagedCase[] = [
  {
    id: DEMO_ENGAGEMENT_IDS.matterHarborview,
    caseNumber: "M-2025-0001",
    title: "Harborview Supply Contract Dispute",
    caseType: "commercial_litigation",
    openDate: "2025-02-01",
    status: "closed",
    description: "Supply contract dispute resolved through settlement.",
    completedTaskCount: 6,
  },
  {
    id: DEMO_ENGAGEMENT_IDS.matterVasquez,
    caseNumber: "M-2025-0002",
    title: "Vasquez Employment Separation",
    caseType: "employment_litigation_employee",
    openDate: "2025-01-15",
    status: "closed",
    description: "Executive separation agreement and release completed.",
    completedTaskCount: 5,
  },
];

export function getTasksForEngagedCase(engagedCase: ClientEngagedCase) {
  const templates = CASE_TYPE_TASK_LISTS[engagedCase.caseType];

  return templates.map((task, index) => {
    let status: CaseTaskStatus = "pending";
    if (index < engagedCase.completedTaskCount) status = "completed";
    else if (index === engagedCase.completedTaskCount) status = "in_progress";

    return {
      ...task,
      status,
    };
  });
}

export interface CaseTeamMember {
  id: string;
  name: string;
  title: string;
  email: string;
  role: "attorney" | "paralegal";
}

export const caseTeamsByCaseNumber: Record<string, CaseTeamMember[]> = {};

export function getCaseTeamForCaseNumbers(caseNumbers: string[]) {
  const members = new Map<string, CaseTeamMember>();

  for (const caseNumber of caseNumbers) {
    for (const member of caseTeamsByCaseNumber[caseNumber] ?? []) {
      members.set(member.id, member);
    }
  }

  return [...members.values()].sort((a, b) =>
    a.role === b.role ? 0 : a.role === "attorney" ? -1 : 1,
  );
}

export const caseInformation = {
  caseNumber: "M-2025-0001",
  title: "Harborview Supply Contract Dispute",
  caseType: "commercial_litigation" as CaseTypeId,
  status: "closed" as const,
  openDate: "2025-02-01",
  description: "Supply contract dispute resolved through settlement.",
  contract: null as {
    id: string;
    name: string;
    signedAt: string;
    signedBy: string;
  } | null,
  attorneys: [] as CaseTeamMember[],
  paralegals: [] as CaseTeamMember[],
  associatedTickets: [] as {
    id: string;
    type: string;
    ticketNumber: string;
    issuedBy: string;
    issueDate: string;
    location: string;
    amount: number;
    status: "pending" | "resolved";
    caseNumber: string;
    description: string;
  }[],
};

export const caseStatusTimeline: {
  id: string;
  label: string;
  date: string;
  status: CaseTaskStatus;
  detail: string;
}[] = [];

export type ImportantDateType = "appointment" | "court_date" | "meeting";

export interface ImportantCaseDate {
  id: string;
  date: string;
  time: string;
  type: ImportantDateType;
  title: string;
  location: string;
  caseNumber: string;
  caseTitle: string;
  description: string;
}

export const IMPORTANT_DATE_TYPE_LABELS: Record<ImportantDateType, string> = {
  appointment: "Appointment",
  court_date: "Court date",
  meeting: "Meeting",
};

export const importantCaseDates: ImportantCaseDate[] = [];

export const clientDocuments: {
  id: string;
  name: string;
  type: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: string;
  caseNumber: string;
}[] = [];

export const documentTypeOptions = [
  { value: "court_filing", label: "Court filing" },
  { value: "correspondence", label: "Correspondence" },
  { value: "evidence", label: "Evidence" },
  { value: "financial", label: "Financial record" },
  { value: "other", label: "Other" },
];

export const clientRequests: {
  id: string;
  subject: string;
  type: string;
  status: "pending" | "in_progress" | "completed";
  submittedAt: string;
}[] = [];

export const requestTypes = [
  { value: "document", label: "Document request" },
  { value: "scheduling", label: "Scheduling" },
  { value: "billing", label: "Billing question" },
  { value: "update", label: "Case update" },
  { value: "other", label: "Other" },
];

export const clientMessages: {
  id: string;
  from: string;
  role: string;
  body: string;
  sentAt: string;
  direction: "inbound" | "outbound";
}[] = [];

export const clientNotifications: {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: string;
  caseNumber?: string;
  actionLabel: string;
  actionHref: string;
}[] = [];

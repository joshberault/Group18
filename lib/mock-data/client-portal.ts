import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import {
  CASE_TYPE_LABELS,
  CASE_TYPE_TASK_LISTS,
} from "@/lib/client-portal/case-task-lists";

export const clientAccountSummary = {
  clientName: "Jordan Hale",
  accountNumber: "CL-1042",
  outstandingBalance: 4850,
  trustBalance: 12500,
  openMatters: 2,
  unpaidInvoices: 1,
  lastPaymentDate: "2026-07-18",
  lastPaymentAmount: 1500,
  invoiceTotal: 7100,
  remainingBalance: 4850,
  statementBalance: 4850,
  hoursSubmitted: {
    attorneys: 18.5,
    paralegals: 11.0,
  },
  trust: {
    beginningBalance: 15000,
    currentBalance: 12500,
    clientMatterNumber: "2026-0142 / 2026-0188",
    lastReconciledAt: "2026-08-01",
    threeWayMatchStatus: "matched" as const,
  },
};

export const trustLedgerEntries = [
  {
    id: "trust-1",
    type: "addition" as const,
    date: "2026-03-15",
    amount: 15000,
    description: "Initial retainer deposit",
    reference: "TR-10021",
    matterNumber: "2026-0142",
  },
  {
    id: "trust-2",
    type: "subtraction" as const,
    date: "2026-06-12",
    amount: 750,
    description: "Transfer to operating for estate drafting fees (INV-2820)",
    reference: "TR-10088",
    matterNumber: "2026-0188",
  },
  {
    id: "trust-3",
    type: "subtraction" as const,
    date: "2026-07-18",
    amount: 1500,
    description: "Applied to INV-2820 remaining balance",
    reference: "TR-10102",
    matterNumber: "2026-0188",
  },
  {
    id: "trust-4",
    type: "addition" as const,
    date: "2026-07-20",
    amount: 750,
    description: "Additional retainer for traffic defense",
    reference: "TR-10115",
    matterNumber: "2026-0142",
  },
  {
    id: "trust-5",
    type: "subtraction" as const,
    date: "2026-08-01",
    amount: 1000,
    description: "Partial application toward INV-2841",
    reference: "TR-10140",
    matterNumber: "2026-0142",
  },
];

/** Demo risk flags shown in Account Summary controls. */
export const accountRiskControls = {
  duplicateBillingChecks: [
    {
      id: "dup-1",
      status: "clear" as const,
      label: "No duplicate charge IDs detected",
      detail: "All invoice charge identifiers are unique across matters.",
    },
    {
      id: "dup-2",
      status: "review" as const,
      label: "Similar charge amounts flagged for review",
      detail:
        "Two $1,500 charges exist on different invoices; confirmed as separate services.",
    },
  ],
  statementReconciliation: {
    invoiceChargeTotal: 7100,
    paidChargeTotal: 2250,
    remainingFromCharges: 4850,
    statementBalance: 4850,
    status: "matched" as const,
    detail:
      "Statement remaining balance matches unpaid invoice charges (invoice total − payments).",
  },
  trustControls: [
    {
      id: "trust-ctrl-1",
      status: "clear" as const,
      label: "Ledger math balanced",
      detail: "Beginning balance + additions − subtractions equals current balance.",
    },
    {
      id: "trust-ctrl-2",
      status: "clear" as const,
      label: "Every trust entry has a unique reference",
      detail: "No duplicate trust reference numbers in the client ledger.",
    },
    {
      id: "trust-ctrl-3",
      status: "clear" as const,
      label: "No negative trust balance",
      detail: "Controls block postings that would overdraw client trust funds.",
    },
    {
      id: "trust-ctrl-4",
      status: "clear" as const,
      label: "Three-way trust reconciliation",
      detail:
        "Client ledger, matter allocation, and bank trust sub-account currently match.",
    },
  ],
};

export const openInvoices = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2841",
    matterTitle: "Hale v. Meridian Logistics",
    dueDate: "2026-08-15",
    amount: 4850,
    status: "sent" as const,
  },
];

export const invoiceCharges = [
  {
    id: "charge-1",
    invoiceNumber: "INV-2841",
    amount: 2500,
    reason: "Attorney consultation and case strategy",
    chargeDate: "2026-07-10",
    status: "unpaid" as const,
  },
  {
    id: "charge-2",
    invoiceNumber: "INV-2841",
    amount: 1500,
    reason: "Court filing and appearance preparation",
    chargeDate: "2026-07-18",
    status: "unpaid" as const,
  },
  {
    id: "charge-3",
    invoiceNumber: "INV-2841",
    amount: 850,
    reason: "Document review and client correspondence",
    chargeDate: "2026-07-25",
    status: "unpaid" as const,
  },
  {
    id: "charge-4",
    invoiceNumber: "INV-2820",
    amount: 1500,
    reason: "Initial estate planning consultation",
    chargeDate: "2026-06-05",
    status: "paid" as const,
  },
  {
    id: "charge-5",
    invoiceNumber: "INV-2820",
    amount: 750,
    reason: "Drafting of wills and powers of attorney",
    chargeDate: "2026-06-12",
    status: "paid" as const,
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
  /** Demo progress: first N tasks completed, next in progress */
  completedTaskCount: number;
}

/** Cases the demo client is currently engaged in. */
export const clientEngagedCases: ClientEngagedCase[] = [
  {
    id: "case-1",
    caseNumber: "2026-0142",
    title: "State v. Hale — Traffic Citation",
    caseType: "criminal_defense",
    openDate: "2026-03-12",
    status: "open",
    description:
      "Defense matter related to a speeding citation and associated court appearance.",
    completedTaskCount: 3,
  },
  {
    id: "case-2",
    caseNumber: "2026-0188",
    title: "Hale Estate Planning Package",
    caseType: "estate_planning",
    openDate: "2026-06-01",
    status: "open",
    description:
      "Preparation of wills, powers of attorney, and related estate planning documents.",
    completedTaskCount: 2,
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

export const caseInformation = {
  caseNumber: clientEngagedCases[0].caseNumber,
  title: clientEngagedCases[0].title,
  practiceArea: CASE_TYPE_LABELS[clientEngagedCases[0].caseType],
  caseType: clientEngagedCases[0].caseType,
  openDate: clientEngagedCases[0].openDate,
  status: clientEngagedCases[0].status,
  description: clientEngagedCases[0].description,
  contract: {
    id: "contract-1",
    name: "Engagement Agreement — Hale.pdf",
    signedAt: "2026-03-12",
    signedBy: "Jordan Hale",
  } as {
    id: string;
    name: string;
    signedAt: string;
    signedBy: string;
  } | null,
  attorneys: [
    {
      id: "atty-1",
      name: "A. Counsel",
      title: "Lead Attorney",
      email: "a.counsel@counselflow.demo",
    },
    {
      id: "atty-2",
      name: "S. Patel",
      title: "Associate Attorney",
      email: "s.patel@counselflow.demo",
    },
  ],
  paralegals: [
    {
      id: "para-1",
      name: "M. Rivera",
      title: "Paralegal",
      email: "m.rivera@counselflow.demo",
    },
  ],
  associatedTickets: [
    {
      id: "ticket-1",
      type: "Speeding ticket",
      ticketNumber: "TX-88421",
      issuedBy: "Texas DPS",
      issueDate: "2026-02-28",
      location: "I-35 Northbound, Austin, TX",
      amount: 285,
      status: "pending" as const,
      description: "Alleged speed 82 mph in a 65 mph zone.",
    },
  ],
};

export const caseStatusTimeline = getTasksForEngagedCase(
  clientEngagedCases[0],
).map((task) => ({
  id: task.id,
  label: task.title,
  date: clientEngagedCases[0].openDate,
  status: task.status,
  detail: task.description,
}));

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

/** Important dates highlighted on the Case Information calendar. */
export const importantCaseDates: ImportantCaseDate[] = [
  {
    id: "date-1",
    date: "2026-08-06",
    time: "10:00 AM",
    type: "appointment",
    title: "Attorney case strategy appointment",
    location: "CounselFlow offices — Conference Room B",
    caseNumber: "2026-0142",
    caseTitle: "State v. Hale — Traffic Citation",
    description:
      "Meet with A. Counsel to review plea options and upcoming hearing preparation.",
  },
  {
    id: "date-2",
    date: "2026-08-12",
    time: "9:30 AM",
    type: "court_date",
    title: "Traffic court appearance",
    location: "Travis County Courthouse, Courtroom 3",
    caseNumber: "2026-0142",
    caseTitle: "State v. Hale — Traffic Citation",
    description:
      "Scheduled court date for the speeding citation. Arrive 30 minutes early.",
  },
  {
    id: "date-3",
    date: "2026-08-18",
    time: "2:00 PM",
    type: "meeting",
    title: "Paralegal document review meeting",
    location: "Virtual — Zoom",
    caseNumber: "2026-0142",
    caseTitle: "State v. Hale — Traffic Citation",
    description:
      "Meeting with M. Rivera to confirm supporting documents for the court file.",
  },
  {
    id: "date-4",
    date: "2026-08-22",
    time: "11:00 AM",
    type: "appointment",
    title: "Estate planning signing appointment",
    location: "CounselFlow offices — Notary Suite",
    caseNumber: "2026-0188",
    caseTitle: "Hale Estate Planning Package",
    description:
      "Appointment to review and execute wills and powers of attorney.",
  },
  {
    id: "date-5",
    date: "2026-09-03",
    time: "1:30 PM",
    type: "meeting",
    title: "Estate funding follow-up meeting",
    location: "CounselFlow offices — Conference Room A",
    caseNumber: "2026-0188",
    caseTitle: "Hale Estate Planning Package",
    description:
      "Discuss beneficiary designations and account retitling next steps.",
  },
  {
    id: "date-6",
    date: "2026-09-15",
    time: "8:45 AM",
    type: "court_date",
    title: "Status conference",
    location: "Travis County Courthouse, Courtroom 3",
    caseNumber: "2026-0142",
    caseTitle: "State v. Hale — Traffic Citation",
    description:
      "Court status conference to confirm compliance and next settings.",
  },
  {
    id: "date-7",
    date: "2026-07-28",
    time: "3:00 PM",
    type: "meeting",
    title: "Initial estate planning meeting",
    location: "CounselFlow offices — Conference Room A",
    caseNumber: "2026-0188",
    caseTitle: "Hale Estate Planning Package",
    description:
      "Kickoff meeting to confirm beneficiaries, fiduciaries, and planning goals.",
  },
];

export function getImportantDatesForDay(dateKey: string) {
  return importantCaseDates.filter((event) => event.date === dateKey);
}

export const clientDocuments = [
  {
    id: "doc-1",
    name: "Engagement Letter.pdf",
    uploadedAt: "2026-03-12",
    documentType: "Signed contracts",
  },
  {
    id: "doc-2",
    name: "Initial Disclosures.pdf",
    uploadedAt: "2026-05-08",
    documentType: "Court documents",
  },
];

export const documentTypeOptions = [
  { value: "", label: "Select documentation type" },
  { value: "signed-contracts", label: "Signed contracts" },
  { value: "evidence", label: "Evidence" },
  { value: "court-documents", label: "Court documents" },
  { value: "case-evidence", label: "Case evidence" },
  { value: "business-documents", label: "Business documents" },
  { value: "legal-documents", label: "Legal documents" },
  { value: "invoices", label: "Invoices" },
  { value: "other", label: "Other" },
];

export const clientRequests = [
  {
    id: "req-1",
    subject: "Copy of mediation brief",
    type: "Document request",
    status: "in_progress" as const,
    submittedAt: "2026-07-29",
  },
  {
    id: "req-2",
    subject: "Confirm hearing attendance",
    type: "Scheduling",
    status: "pending" as const,
    submittedAt: "2026-08-01",
  },
];

export const requestTypes = [
  { value: "document", label: "Document request" },
  { value: "scheduling", label: "Scheduling" },
  { value: "billing", label: "Billing question" },
  { value: "update", label: "Case update" },
  { value: "other", label: "Other" },
];

export const clientMessages = [
  {
    id: "msg-1",
    from: "A. Counsel",
    role: "Attorney",
    body: "Mediation is confirmed for August 22. Please review the position statement draft we sent last week.",
    sentAt: "2026-08-02T14:20:00Z",
    direction: "inbound" as const,
  },
  {
    id: "msg-2",
    from: "Jordan Hale",
    role: "Client",
    body: "Thank you — I will send comments by Friday.",
    sentAt: "2026-08-02T16:05:00Z",
    direction: "outbound" as const,
  },
  {
    id: "msg-3",
    from: "M. Rivera",
    role: "Paralegal",
    body: "Reminder: please upload any additional invoices from Meridian before Friday.",
    sentAt: "2026-08-03T09:40:00Z",
    direction: "inbound" as const,
  },
];

export const clientNotifications = [
  {
    id: "notif-request-1",
    title: "New request from your attorney",
    message:
      "A. Counsel requested that you upload a copy of your current auto insurance card.",
    createdAt: "2026-08-05T12:15:00Z",
    type: "request" as const,
    actionLabel: "Complete request",
    actionHref: "/client-portal/upload-documents",
  },
  {
    id: "notif-case-status-1",
    title: "New case status update",
    message:
      "Your case moved to Attorney Review. Review the latest status details.",
    createdAt: "2026-08-05T11:30:00Z",
    type: "case_status" as const,
    actionLabel: "Review update",
    actionHref: "/client-portal/case-status",
  },
  {
    id: "notif-invoice-5-days",
    title: "Invoice due in 5 days",
    message: "Invoice INV-2850 for $1,250 is due August 10.",
    createdAt: "2026-08-05T09:00:00Z",
    type: "invoice_due" as const,
    actionLabel: "Pay invoice",
    actionHref: "/client-portal/pay-balance",
  },
  {
    id: "notif-invoice-3-days",
    title: "Invoice due in 3 days",
    message: "Invoice INV-2848 for $875 is due August 8.",
    createdAt: "2026-08-05T08:45:00Z",
    type: "invoice_due" as const,
    actionLabel: "Pay invoice",
    actionHref: "/client-portal/pay-balance",
  },
  {
    id: "notif-invoice-2-days",
    title: "Invoice due in 2 days",
    message: "Invoice INV-2847 for $640 is due August 7.",
    createdAt: "2026-08-05T08:30:00Z",
    type: "invoice_due" as const,
    actionLabel: "Pay invoice",
    actionHref: "/client-portal/pay-balance",
  },
  {
    id: "notif-invoice-1-day",
    title: "Invoice due tomorrow",
    message: "Invoice INV-2845 for $2,100 is due August 6.",
    createdAt: "2026-08-05T08:15:00Z",
    type: "invoice_due" as const,
    actionLabel: "Pay invoice",
    actionHref: "/client-portal/pay-balance",
  },
  {
    id: "notif-invoice-today",
    title: "Invoice due today",
    message: "Invoice INV-2843 for $930 is due today.",
    createdAt: "2026-08-05T08:00:00Z",
    type: "invoice_due" as const,
    actionLabel: "Pay invoice",
    actionHref: "/client-portal/pay-balance",
  },
  {
    id: "notif-invoice-past-due",
    title: "Past-due unpaid invoice",
    message: "Invoice INV-2841 for $4,850 is past due and remains unpaid.",
    createdAt: "2026-08-05T07:45:00Z",
    type: "invoice_past_due" as const,
    actionLabel: "Pay past-due invoice",
    actionHref: "/client-portal/pay-balance",
  },
];

import type { FirmClient, ConflictCheckStatus } from "@/lib/clients/types";

/** Fixed demo paralegal identity (matches role-config DEMO_IDENTITIES.paralegal). */
export const DEMO_PARALEGAL = {
  id: "paralegal-parker-legal",
  fullName: "Parker Legal",
  email: "parker.legal@counselflow.example",
  initials: "PL",
  title: "Paralegal",
} as const;

export type ParalegalTaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting_on_client"
  | "waiting_on_attorney"
  | "blocked"
  | "submitted_for_review"
  | "completed"
  | "overdue";

export type ParalegalDeadlineType =
  | "court"
  | "filing"
  | "discovery"
  | "client_response"
  | "internal_review"
  | "document_preparation"
  | "billing_cutoff";

export type ReviewStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "returned_for_revision"
  | "approved";

export type ReviewItemType =
  | "task"
  | "document"
  | "deadline"
  | "time_entry"
  | "expense"
  | "issue";

export interface ParalegalAssignmentMatter {
  id: string;
  matterNumber: string;
  title: string;
  clientId: string;
  clientName: string;
  practiceArea: string;
  attorneyName: string;
  attorneyId: string;
  status: "open" | "on_hold" | "closed";
  engagementScope: string;
  conflictStatus: ConflictCheckStatus;
  openDate: string;
}

export interface ParalegalTask {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  matterId: string;
  matterTitle: string;
  attorneyName: string;
  dueDate: string;
  priority: "critical" | "high" | "medium" | "low";
  status: ParalegalTaskStatus;
  requiresAttorneyApproval: boolean;
  notes?: string;
}

export interface ParalegalDeadline {
  id: string;
  type: ParalegalDeadlineType;
  label: string;
  clientName: string;
  matterId: string;
  matterTitle: string;
  attorneyName: string;
  dueAt: string;
  requiredAction: string;
}

export interface ParalegalReviewItem {
  id: string;
  title: string;
  itemType: ReviewItemType;
  clientName: string;
  matterTitle: string;
  attorneyName: string;
  submittedAt: string;
  status: ReviewStatus;
  relatedTaskId?: string;
  urgent?: boolean;
}

export interface ParalegalTimeEntry {
  id: string;
  matterId: string;
  matterTitle: string;
  clientName: string;
  entryDate: string;
  hours: number;
  description: string;
  billable: boolean;
  status: "draft" | "submitted" | "rejected" | "approved" | "invoiced";
  rejectionReason?: string;
}

export interface ParalegalExpense {
  id: string;
  matterId: string;
  matterTitle: string;
  clientName: string;
  expenseDate: string;
  amount: number;
  description: string;
  status: "draft" | "submitted" | "rejected" | "approved";
  receiptMissing: boolean;
}

export interface ParalegalAlert {
  id: string;
  kind:
    | "conflict"
    | "missing_contact"
    | "engagement"
    | "matter_hold"
    | "scope"
    | "document"
    | "client_response";
  title: string;
  detail: string;
  clientId?: string;
  clientName?: string;
  matterId?: string;
  matterTitle?: string;
  recommendedAction: string;
  href: string;
}

export const PARALEGAL_ASSIGNED_CLIENT_IDS = [
  "client-chen",
  "client-santos",
  "client-northside",
  "client-hale",
] as const;

export const PARALEGAL_ASSIGNED_MATTERS: ParalegalAssignmentMatter[] = [
  {
    id: "matter-1",
    matterNumber: "M-2401",
    title: "Chen v. Apex Supply Dispute",
    clientId: "client-chen",
    clientName: "Chen Manufacturing LLC",
    practiceArea: "Litigation",
    attorneyName: "Avery Counsel",
    attorneyId: "attorney-avery",
    status: "open",
    engagementScope: "Commercial breach litigation through discovery",
    conflictStatus: "cleared",
    openDate: "2026-06-12",
  },
  {
    id: "matter-2",
    matterNumber: "M-2408",
    title: "Santos Wrongful Termination",
    clientId: "client-santos",
    clientName: "Maria Santos",
    practiceArea: "Employment",
    attorneyName: "Avery Counsel",
    attorneyId: "attorney-avery",
    status: "open",
    engagementScope: "EEOC response and negotiation support",
    conflictStatus: "cleared",
    openDate: "2026-07-01",
  },
  {
    id: "matter-3",
    matterNumber: "M-2415",
    title: "Northside Asset Purchase",
    clientId: "client-northside",
    clientName: "Northside Medical Group",
    practiceArea: "Corporate",
    attorneyName: "Morgan Counsel",
    attorneyId: "attorney-morgan",
    status: "on_hold",
    engagementScope: "Due diligence and purchase agreement support",
    conflictStatus: "possible_conflict",
    openDate: "2026-07-20",
  },
  {
    id: "matter-4",
    matterNumber: "M-2422",
    title: "Hale Contract Review",
    clientId: "client-hale",
    clientName: "Thomas Hale",
    practiceArea: "Corporate",
    attorneyName: "Avery Counsel",
    attorneyId: "attorney-avery",
    status: "open",
    engagementScope: "Vendor agreement review (not litigation)",
    conflictStatus: "pending",
    openDate: "2026-08-01",
  },
];

/** Map demo firm client names/ids that may exist in Supabase Clients module. */
export const PARALEGAL_CLIENT_NAME_MATCHES = [
  "Chen Manufacturing",
  "Robert Chen",
  "Maria Santos",
  "Northside Medical",
  "Thomas Hale",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function offsetDateTime(days: number, hour = 17): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const PARALEGAL_TASKS: ParalegalTask[] = [
  {
    id: "ptask-overdue-filing",
    title: "Assemble court filing exhibits for Apex response",
    clientId: "client-chen",
    clientName: "Chen Manufacturing LLC",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    dueDate: offsetDate(-2),
    priority: "critical",
    status: "overdue",
    requiresAttorneyApproval: true,
    notes: "Exhibits checklist incomplete — waiting on Bates stamps.",
  },
  {
    id: "ptask-due-today-1",
    title: "Prepare witness outline for Santos interview",
    clientId: "client-santos",
    clientName: "Maria Santos",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    dueDate: todayISO(),
    priority: "high",
    status: "in_progress",
    requiresAttorneyApproval: false,
  },
  {
    id: "ptask-due-today-2",
    title: "Upload executed engagement checklist attachments",
    clientId: "client-hale",
    clientName: "Thomas Hale",
    matterId: "matter-4",
    matterTitle: "Hale Contract Review",
    attorneyName: "Avery Counsel",
    dueDate: todayISO(),
    priority: "medium",
    status: "not_started",
    requiresAttorneyApproval: false,
  },
  {
    id: "ptask-blocked",
    title: "Compile Northside diligence folder",
    clientId: "client-northside",
    clientName: "Northside Medical Group",
    matterId: "matter-3",
    matterTitle: "Northside Asset Purchase",
    attorneyName: "Morgan Counsel",
    dueDate: offsetDate(1),
    priority: "high",
    status: "blocked",
    requiresAttorneyApproval: true,
    notes: "Blocked pending conflict clearance.",
  },
  {
    id: "ptask-waiting-client",
    title: "Collect client medical authorization forms",
    clientId: "client-santos",
    clientName: "Maria Santos",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    dueDate: offsetDate(3),
    priority: "medium",
    status: "waiting_on_client",
    requiresAttorneyApproval: false,
  },
  {
    id: "ptask-waiting-attorney",
    title: "Revise demand package after attorney comments",
    clientId: "client-chen",
    clientName: "Chen Manufacturing LLC",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    dueDate: offsetDate(2),
    priority: "high",
    status: "waiting_on_attorney",
    requiresAttorneyApproval: true,
  },
  {
    id: "ptask-returned",
    title: "Update discovery index numbering",
    clientId: "client-chen",
    clientName: "Chen Manufacturing LLC",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    dueDate: offsetDate(1),
    priority: "high",
    status: "in_progress",
    requiresAttorneyApproval: true,
    notes: "Returned for revision — fix exhibit cross-references.",
  },
  {
    id: "ptask-scope",
    title: "Draft litigation strategy memo (out of scope?)",
    clientId: "client-hale",
    clientName: "Thomas Hale",
    matterId: "matter-4",
    matterTitle: "Hale Contract Review",
    attorneyName: "Avery Counsel",
    dueDate: offsetDate(4),
    priority: "medium",
    status: "submitted_for_review",
    requiresAttorneyApproval: true,
    notes: "May exceed engagement — needs legal decision.",
  },
  {
    id: "ptask-done",
    title: "File intake chronology for Santos",
    clientId: "client-santos",
    clientName: "Maria Santos",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    dueDate: offsetDate(-5),
    priority: "low",
    status: "completed",
    requiresAttorneyApproval: false,
  },
];

export const PARALEGAL_DEADLINES: ParalegalDeadline[] = [
  {
    id: "pdl-1",
    type: "filing",
    label: "Answer / response filing deadline",
    clientName: "Chen Manufacturing LLC",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    dueAt: offsetDateTime(-1, 16),
    requiredAction: "Finalize exhibits and confirm filing packet",
  },
  {
    id: "pdl-2",
    type: "court",
    label: "Status conference preparation",
    clientName: "Maria Santos",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    dueAt: offsetDateTime(0, 15),
    requiredAction: "Complete witness outline packet for attorney",
  },
  {
    id: "pdl-3",
    type: "discovery",
    label: "Discovery production cutoff",
    clientName: "Chen Manufacturing LLC",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    dueAt: offsetDateTime(3, 17),
    requiredAction: "QC Bates range and privilege log draft",
  },
  {
    id: "pdl-4",
    type: "client_response",
    label: "Client authorization follow-up",
    clientName: "Maria Santos",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    dueAt: offsetDateTime(2, 12),
    requiredAction: "Send reminder and log attempts",
  },
  {
    id: "pdl-5",
    type: "internal_review",
    label: "Attorney review of demand package",
    clientName: "Chen Manufacturing LLC",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    dueAt: offsetDateTime(1, 11),
    requiredAction: "Monitor review queue; revise if returned",
  },
  {
    id: "pdl-6",
    type: "billing_cutoff",
    label: "Semi-monthly time entry cutoff",
    clientName: "—",
    matterId: "",
    matterTitle: "All assigned matters",
    attorneyName: "Billing Specialist",
    dueAt: offsetDateTime(5, 17),
    requiredAction: "Submit drafts and correct rejected entries",
  },
];

export const PARALEGAL_REVIEW_QUEUE: ParalegalReviewItem[] = [
  {
    id: "prev-1",
    title: "Demand letter draft v2",
    itemType: "document",
    clientName: "Chen Manufacturing LLC",
    matterTitle: "Chen v. Apex Supply Dispute",
    attorneyName: "Avery Counsel",
    submittedAt: offsetDate(-3),
    status: "returned_for_revision",
    relatedTaskId: "ptask-returned",
    urgent: true,
  },
  {
    id: "prev-2",
    title: "Witness outline for Santos",
    itemType: "task",
    clientName: "Maria Santos",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    submittedAt: todayISO(),
    status: "submitted",
  },
  {
    id: "prev-3",
    title: "Possible scope expansion on Hale matter",
    itemType: "issue",
    clientName: "Thomas Hale",
    matterTitle: "Hale Contract Review",
    attorneyName: "Avery Counsel",
    submittedAt: offsetDate(-1),
    status: "under_review",
    urgent: true,
  },
  {
    id: "prev-4",
    title: "Diligence index (initial)",
    itemType: "document",
    clientName: "Northside Medical Group",
    matterTitle: "Northside Asset Purchase",
    attorneyName: "Morgan Counsel",
    submittedAt: offsetDate(-6),
    status: "under_review",
  },
  {
    id: "prev-5",
    title: "Santos chronology",
    itemType: "task",
    clientName: "Maria Santos",
    matterTitle: "Santos Wrongful Termination",
    attorneyName: "Avery Counsel",
    submittedAt: offsetDate(-8),
    status: "approved",
  },
];

export const PARALEGAL_TIME_ENTRIES: ParalegalTimeEntry[] = [
  {
    id: "ptime-1",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    clientName: "Chen Manufacturing LLC",
    entryDate: todayISO(),
    hours: 1.2,
    description: "Organized Apex exhibit binder sections A–C",
    billable: true,
    status: "submitted",
  },
  {
    id: "ptime-draft",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    clientName: "Maria Santos",
    entryDate: todayISO(),
    hours: 0.8,
    description: "Started witness outline research notes",
    billable: true,
    status: "draft",
  },
  {
    id: "ptime-rejected",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    clientName: "Chen Manufacturing LLC",
    entryDate: offsetDate(-4),
    hours: 2.0,
    description: "Work on case",
    billable: true,
    status: "rejected",
    rejectionReason: "Description too vague — specify tasks performed.",
  },
  {
    id: "ptime-missing-day",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    clientName: "Maria Santos",
    entryDate: offsetDate(-1),
    hours: 0,
    description: "(No entry recorded)",
    billable: false,
    status: "draft",
  },
  {
    id: "ptime-invoiced",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    clientName: "Maria Santos",
    entryDate: offsetDate(-12),
    hours: 1.5,
    description: "Prepared intake chronology packet",
    billable: true,
    status: "invoiced",
  },
];

export const PARALEGAL_EXPENSES: ParalegalExpense[] = [
  {
    id: "pexp-1",
    matterId: "matter-1",
    matterTitle: "Chen v. Apex Supply Dispute",
    clientName: "Chen Manufacturing LLC",
    expenseDate: offsetDate(-1),
    amount: 48.25,
    description: "Courier delivery of courtesy copies",
    status: "draft",
    receiptMissing: true,
  },
  {
    id: "pexp-2",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    clientName: "Maria Santos",
    expenseDate: offsetDate(-3),
    amount: 22.0,
    description: "Records request fee",
    status: "submitted",
    receiptMissing: false,
  },
];

export const PARALEGAL_ALERTS: ParalegalAlert[] = [
  {
    id: "palert-conflict",
    kind: "conflict",
    title: "Possible conflict — Northside Medical Group",
    detail: "Conflict marked Possible Conflict. Do not expand diligence work until cleared.",
    clientId: "client-northside",
    clientName: "Northside Medical Group",
    matterId: "matter-3",
    matterTitle: "Northside Asset Purchase",
    recommendedAction: "Report new conflict information to Firm Administrator; do not clear yourself.",
    href: "/clients",
  },
  {
    id: "palert-pending",
    kind: "conflict",
    title: "Conflict check pending — Thomas Hale",
    detail: "Conflict review is still pending for the Hale engagement.",
    clientId: "client-hale",
    clientName: "Thomas Hale",
    matterId: "matter-4",
    matterTitle: "Hale Contract Review",
    recommendedAction: "Continue only preparatory non-conflicting admin work; escalate if new parties appear.",
    href: "/clients",
  },
  {
    id: "palert-contact",
    kind: "missing_contact",
    title: "Missing preferred contact method — Maria Santos",
    detail: "Phone is on file but preferred communication method is blank.",
    clientId: "client-santos",
    clientName: "Maria Santos",
    recommendedAction: "Update allowed contact fields on the client record.",
    href: "/clients",
  },
  {
    id: "palert-hold",
    kind: "matter_hold",
    title: "Matter on hold — Northside Asset Purchase",
    detail: "Matter status is on hold pending conflict review.",
    matterId: "matter-3",
    matterTitle: "Northside Asset Purchase",
    clientName: "Northside Medical Group",
    recommendedAction: "Pause substantive work; monitor Attorney Hub for instructions.",
    href: "/attorney/matters",
  },
  {
    id: "palert-scope",
    kind: "scope",
    title: "Possible work outside engagement scope",
    detail: "Strategy memo request may exceed Hale contract-review engagement.",
    matterId: "matter-4",
    matterTitle: "Hale Contract Review",
    clientName: "Thomas Hale",
    recommendedAction: "Keep under Needs Legal Decision in Attorney Hub.",
    href: "/attorney/dashboard",
  },
  {
    id: "palert-doc",
    kind: "document",
    title: "Engagement letter missing on file",
    detail: "Hale matter checklist shows engagement letter not uploaded.",
    matterId: "matter-4",
    matterTitle: "Hale Contract Review",
    clientName: "Thomas Hale",
    recommendedAction: "Flag for attorney; attach when available (no engage-term edits).",
    href: "/attorney/matters",
  },
  {
    id: "palert-client-response",
    kind: "client_response",
    title: "Client response overdue — medical authorization",
    detail: "Santos authorization follow-ups are past the client response deadline.",
    matterId: "matter-2",
    matterTitle: "Santos Wrongful Termination",
    clientName: "Maria Santos",
    recommendedAction: "Log outreach and update task status to Waiting on Client.",
    href: "/attorney/tasks",
  },
];

export function isParalegalAssignedClientName(name: string | null | undefined): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return PARALEGAL_CLIENT_NAME_MATCHES.some((m) => lower.includes(m.toLowerCase()));
}

export function filterClientsForParalegalDemo<T extends Pick<FirmClient, "name" | "company_name">>(
  clients: T[],
): T[] {
  return clients.filter(
    (c) =>
      isParalegalAssignedClientName(c.name) ||
      isParalegalAssignedClientName(c.company_name),
  );
}

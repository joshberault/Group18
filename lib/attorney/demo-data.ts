import type {
  AttorneyNote,
  Deadline,
  DocumentChecklistItem,
  ExpenseSubmission,
  Matter,
  Profile,
  Task,
  TimeEntry,
  DemoAttorney,
} from "@/types/database";

export const DEMO_PROFILE: Profile = {
  id: "4a0bef63-d0d2-4ca9-aa8f-69082b6c5384",
  full_name: "George Giddens",
  email: "gsgidden@go.olemiss.edu",
  role: "attorney",
};

/** True when demo preview is enabled (default for local CounselFlow demos). */
export function isDevPreview(): boolean {
  return process.env.NEXT_PUBLIC_DEV_PREVIEW !== "false";
}

export const DEMO_ATTORNEYS: DemoAttorney[] = [
  { id: DEMO_PROFILE.id, full_name: "George Giddens" },
  { id: "attorney-2", full_name: "Sarah Mitchell" },
  { id: "attorney-3", full_name: "James Porter" },
];

export const DEMO_MATTERS: Matter[] = [
  {
    id: "matter-1",
    title: "Chen v. Apex Supply Dispute",
    description: "Breach of supply contract",
    status: "open",
    billing_type: "hourly",
    hourly_rate: 350,
    fixed_fee_amount: null,
    retainer_amount: null,
    retainer_balance: null,
    expense_terms: "Filing fees, expert witnesses, travel",
    client: {
      id: "client-1",
      name: "Robert Chen",
      email: "rchen@example.com",
      company_name: "Chen Manufacturing LLC",
      conflict_flag: false,
    },
    practice_area: { name: "Litigation" },
  },
  {
    id: "matter-2",
    title: "Santos Wrongful Termination",
    description: "Employment discrimination claim",
    status: "open",
    billing_type: "retainer",
    hourly_rate: null,
    fixed_fee_amount: null,
    retainer_amount: 15000,
    retainer_balance: 11250,
    expense_terms: "Court costs, deposition transcripts",
    client: {
      id: "client-2",
      name: "Maria Santos",
      email: "msantos@example.com",
      company_name: null,
      conflict_flag: false,
    },
    practice_area: { name: "Employment" },
  },
  {
    id: "matter-3",
    title: "Northside Asset Purchase",
    description: "Acquisition of clinic network",
    status: "open",
    billing_type: "fixed_fee",
    hourly_rate: null,
    fixed_fee_amount: 45000,
    retainer_amount: null,
    retainer_balance: null,
    expense_terms: "Due diligence vendors billed separately",
    client: {
      id: "client-3",
      name: "Northside Medical Group",
      email: "legal@northsidemed.example",
      company_name: "Northside Medical Group",
      conflict_flag: true,
    },
    practice_area: { name: "Corporate" },
  },
];

export const DEMO_TIME_ENTRIES: TimeEntry[] = [
  {
    id: "time-1",
    matter_id: "matter-1",
    profile_id: DEMO_PROFILE.id,
    entry_date: "2026-08-03",
    hours: 2.5,
    description: "Initial case review and client intake call",
    is_billable: true,
    status: "pending",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
  {
    id: "time-2",
    matter_id: "matter-2",
    profile_id: DEMO_PROFILE.id,
    entry_date: "2026-08-02",
    hours: 1.5,
    description: "Research on employment discrimination standards",
    is_billable: true,
    status: "approved",
    matter: { title: "Santos Wrongful Termination" },
  },
  {
    id: "time-3",
    matter_id: "matter-1",
    profile_id: "attorney-2",
    entry_date: "2026-08-04",
    hours: 3.0,
    description: "Drafted motion to compel discovery",
    is_billable: true,
    status: "approved",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
  {
    id: "time-4",
    matter_id: "matter-3",
    profile_id: "attorney-3",
    entry_date: "2026-08-04",
    hours: 0.5,
    description: "Internal case strategy meeting",
    is_billable: false,
    status: "pending",
    matter: { title: "Northside Asset Purchase" },
  },
];

export const DEMO_EXPENSES: ExpenseSubmission[] = [
  {
    id: "expense-1",
    matter_id: "matter-1",
    profile_id: DEMO_PROFILE.id,
    expense_date: "2026-08-02",
    amount: 125,
    description: "Court filing fee",
    status: "pending",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
];

export const DEMO_TASKS: Task[] = [
  {
    id: "task-1",
    matter_id: "matter-1",
    profile_id: DEMO_PROFILE.id,
    title: "Draft demand letter",
    description: "Prepare initial demand for opposing counsel",
    due_date: "2026-08-07",
    status: "open",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
  {
    id: "task-2",
    matter_id: "matter-2",
    profile_id: DEMO_PROFILE.id,
    title: "Review client personnel file",
    description: "Gather documents for wrongful termination claim",
    due_date: "2026-08-05",
    status: "in_progress",
    matter: { title: "Santos Wrongful Termination" },
  },
  {
    id: "task-3",
    matter_id: "matter-1",
    profile_id: DEMO_PROFILE.id,
    title: "Finalize discovery requests",
    description: "Send first set of interrogatories to opposing counsel",
    due_date: "2026-08-05",
    status: "open",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
];

export const DEMO_DEADLINES: Deadline[] = [
  {
    id: "deadline-1",
    matter_id: "matter-1",
    title: "Discovery response due",
    description: "Opposing counsel responses to first RFAs",
    due_date: "2026-08-12",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
  {
    id: "deadline-2",
    matter_id: "matter-2",
    title: "EEOC filing deadline",
    description: "Final day to submit charge documentation",
    due_date: "2026-08-05",
    matter: { title: "Santos Wrongful Termination" },
  },
  {
    id: "deadline-3",
    matter_id: "matter-3",
    title: "Due diligence report",
    description: "Submit diligence summary to buyer counsel",
    due_date: "2026-08-18",
    matter: { title: "Northside Asset Purchase" },
  },
];

export const DEMO_NOTES: AttorneyNote[] = [
  {
    id: "note-1",
    matter_id: "matter-1",
    profile_id: DEMO_PROFILE.id,
    note_text: "Client confirmed Apex breached delivery schedule by 45 days. Preserve all shipping logs.",
    created_at: "2026-08-01T14:30:00Z",
    matter: { title: "Chen v. Apex Supply Dispute" },
    author: { full_name: "George Giddens" },
  },
  {
    id: "note-2",
    matter_id: "matter-2",
    profile_id: DEMO_PROFILE.id,
    note_text: "HR director interview scheduled. Client believes termination followed protected leave.",
    created_at: "2026-08-03T09:15:00Z",
    matter: { title: "Santos Wrongful Termination" },
    author: { full_name: "George Giddens" },
  },
];

export const DEMO_CHECKLIST: DocumentChecklistItem[] = [
  {
    id: "check-1",
    matter_id: "matter-1",
    label: "Engagement letter signed",
    completed: true,
    due_date: "2026-07-20",
  },
  {
    id: "check-2",
    matter_id: "matter-1",
    label: "Conflict check completed",
    completed: true,
    due_date: "2026-07-18",
  },
  {
    id: "check-3",
    matter_id: "matter-1",
    label: "Initial client intake forms",
    completed: false,
    due_date: "2026-08-08",
  },
  {
    id: "check-4",
    matter_id: "matter-2",
    label: "Retainer agreement executed",
    completed: true,
    due_date: "2026-07-25",
  },
  {
    id: "check-5",
    matter_id: "matter-2",
    label: "Personnel file request sent",
    completed: false,
    due_date: "2026-08-06",
  },
  {
    id: "check-6",
    matter_id: "matter-3",
    label: "Due diligence checklist initiated",
    completed: false,
    due_date: "2026-08-10",
  },
];

export const INITIAL_ATTORNEY_DATA = {
  timeEntries: DEMO_TIME_ENTRIES,
  tasks: DEMO_TASKS,
  deadlines: DEMO_DEADLINES,
  notes: DEMO_NOTES,
  checklistItems: DEMO_CHECKLIST,
  matters: DEMO_MATTERS,
};

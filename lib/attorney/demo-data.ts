import type {
  ExpenseSubmission,
  Matter,
  Profile,
  Task,
  TimeEntry,
} from "@/types/database";

/** Attorney ladder titles used for display and hourly billing rates. */
export const ATTORNEY_TITLES = [
  "Senior Partner",
  "Partner",
  "Senior Associate",
  "Associate",
  "Junior Associate",
] as const;

export type AttorneyTitle = (typeof ATTORNEY_TITLES)[number];

export const DEMO_PROFILE: Profile = {
  id: "4a0bef63-d0d2-4ca9-aa8f-69082b6c5384",
  full_name: "George Giddens",
  email: "gsgidden@go.olemiss.edu",
  role: "attorney",
};

/** Title shown after the attorney name in Attorney Hub. */
export const DEMO_ATTORNEY_TITLE: AttorneyTitle = "Senior Partner";

/** True when demo preview is enabled (default for local CounselFlow demos). */
export function isDevPreview(): boolean {
  return process.env.NEXT_PUBLIC_DEV_PREVIEW !== "false";
}

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
    title: "Draft demand letter",
    description: "Prepare initial demand for opposing counsel",
    due_date: "2026-08-07",
    status: "open",
    matter: { title: "Chen v. Apex Supply Dispute" },
  },
  {
    id: "task-2",
    matter_id: "matter-2",
    title: "Review client personnel file",
    description: "Gather documents for wrongful termination claim",
    due_date: "2026-08-05",
    status: "in_progress",
    matter: { title: "Santos Wrongful Termination" },
  },
];


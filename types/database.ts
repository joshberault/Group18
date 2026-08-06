export type UserRole =
  | "admin"
  | "manager"
  | "attorney"
  | "paralegal"
  | "staffer"
  | "client";

export type BillingType = "hourly" | "fixed_fee" | "retainer" | "contingency";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type MatterStatus = "open" | "closed" | "archived";
export type TaskStatus = "open" | "in_progress" | "completed";

export const STAFF_ROLES: UserRole[] = [
  "admin",
  "manager",
  "attorney",
  "paralegal",
  "staffer",
];

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
};

export type Client = {
  id: string;
  name: string;
  email: string | null;
  company_name: string | null;
  conflict_flag: boolean;
};

export type Matter = {
  id: string;
  title: string;
  description: string | null;
  status: MatterStatus;
  billing_type: BillingType;
  hourly_rate: number | null;
  fixed_fee_amount: number | null;
  retainer_amount: number | null;
  retainer_balance: number | null;
  expense_terms: string | null;
  client: Client | null;
  practice_area: { name: string } | null;
};

export type TimeEntry = {
  id: string;
  matter_id: string;
  profile_id: string;
  entry_date: string;
  hours: number;
  description: string;
  is_billable: boolean;
  status: ApprovalStatus;
  matter?: { title: string } | null;
};

export type ExpenseSubmission = {
  id: string;
  matter_id: string;
  profile_id: string;
  expense_date: string;
  amount: number;
  description: string;
  status: ApprovalStatus;
  matter?: { title: string } | null;
};

export type Task = {
  id: string;
  matter_id: string;
  profile_id?: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  matter?: { title: string } | null;
};

export type Deadline = {
  id: string;
  matter_id: string;
  title: string;
  description: string | null;
  due_date: string;
  matter?: { title: string } | null;
};

export type AttorneyNote = {
  id: string;
  matter_id: string;
  profile_id: string;
  note_text: string;
  created_at: string;
  matter?: { title: string } | null;
  author?: { full_name: string } | null;
};

export type DocumentChecklistItem = {
  id: string;
  matter_id: string;
  label: string;
  completed: boolean;
  due_date: string | null;
};

export type DemoAttorney = {
  id: string;
  full_name: string;
};

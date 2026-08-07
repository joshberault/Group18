import type { AdminApproval, ApprovalPriority } from "@/lib/admin/types";
import { getLeadAttorneyForSpecialty } from "@/lib/attorney/specialty-attorneys";
import {
  getStoredAttorneySpecialty,
  type AttorneyDemoSpecialty,
} from "@/lib/attorney/specialties";
import { DEMO_PROFILE } from "@/lib/attorney/demo-data";

const STORAGE_KEY = "counselflow-demo-time-workflow-v1";
export const TIME_WORKFLOW_EVENT = "counselflow-time-workflow-change";

const PARALEGAL_PROFILE_ID = "demo-profile-paralegal";
const DEFAULT_BILLABLE_RATE = 175;
const DEFAULT_COST_RATE = 85;

export type DemoPayrollAccrual = {
  id: string;
  timeEntryId: string;
  approvalId: string;
  employeeName: string;
  matterTitle: string;
  hours: number;
  billableRate: number;
  costRate: number;
  billableAmount: number;
  costAmount: number;
  approvedAt: string;
  journalEntryId: string;
};

export type DemoJournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: "Posted";
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  postedDate: string;
  source: "time_approval";
  timeEntryId: string;
  lines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    description: string;
    debit: number;
    credit: number;
  }>;
};

type DemoTimeWorkflowState = {
  timeEntries: TimeEntry[];
  expenses: ExpenseSubmission[];
  approvals: AdminApproval[];
  payrollAccruals: DemoPayrollAccrual[];
  journalEntries: DemoJournalEntry[];
};

function emptyState(): DemoTimeWorkflowState {
  return {
    timeEntries: [],
    expenses: [],
    approvals: [],
    payrollAccruals: [],
    journalEntries: [],
  };
}

function readState(): DemoTimeWorkflowState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<DemoTimeWorkflowState>;
    return {
      timeEntries: parsed.timeEntries ?? [],
      expenses: parsed.expenses ?? [],
      approvals: parsed.approvals ?? [],
      payrollAccruals: parsed.payrollAccruals ?? [],
      journalEntries: parsed.journalEntries ?? [],
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: DemoTimeWorkflowState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notifyApprovalWorkflowChange();
}

/** Notify dashboards and approval queues that pending items changed. */
export function notifyApprovalWorkflowChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TIME_WORKFLOW_EVENT));
}

export function subscribeTimeWorkflow(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(TIME_WORKFLOW_EVENT, handler);
  return () => window.removeEventListener(TIME_WORKFLOW_EVENT, handler);
}

import { DEMO_IDENTITIES } from "@/lib/roles/role-config";
import type { UserRole } from "@/lib/types";
import type {
  ExpenseSubmission,
  Matter,
  TimeEntry,
  ApprovalStatus,
} from "@/types/database";
import { DEMO_MATTERS } from "@/lib/attorney/demo-data";

export type DemoSubmitterContext = {
  profileId: string;
  submitterName: string;
  employeeId: string;
};

/** Resolve profile + display name for demo submissions (specialty attorneys when role is attorney). */
export function getDemoSubmitterContext(
  role: UserRole,
  attorneySpecialty?: AttorneyDemoSpecialty | null,
): DemoSubmitterContext {
  if (role === "attorney") {
    const specialty = attorneySpecialty ?? getStoredAttorneySpecialty();
    const attorney = getLeadAttorneyForSpecialty(specialty);
    return {
      profileId: attorney.id,
      submitterName: attorney.fullName,
      employeeId: attorney.id,
    };
  }

  if (role === "paralegal") {
    return {
      profileId: PARALEGAL_PROFILE_ID,
      submitterName: DEMO_IDENTITIES.paralegal.fullName,
      employeeId: "demo-paralegal",
    };
  }

  const identity = DEMO_IDENTITIES[role];
  return {
    profileId: DEMO_PROFILE.id,
    submitterName: identity?.fullName ?? "Demo User",
    employeeId: `demo-${role}`,
  };
}

export function profileIdForRole(
  role: UserRole,
  attorneySpecialty?: AttorneyDemoSpecialty | null,
): string {
  return getDemoSubmitterContext(role, attorneySpecialty).profileId;
}

export function submitterNameForRole(
  role: UserRole,
  attorneySpecialty?: AttorneyDemoSpecialty | null,
): string {
  return getDemoSubmitterContext(role, attorneySpecialty).submitterName;
}

function matterBillableRate(matter: Matter | undefined): number {
  if (!matter) return DEFAULT_BILLABLE_RATE;
  if (matter.billing_type === "hourly" && matter.hourly_rate) return matter.hourly_rate;
  return DEFAULT_BILLABLE_RATE;
}

function nextApprovalId(state: DemoTimeWorkflowState) {
  const max = state.approvals
    .map((row) => Number(row.id.replace(/\D/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `apr-demo-${String(max + 1).padStart(3, "0")}`;
}

function nextTimeEntryId(state: DemoTimeWorkflowState) {
  const max = state.timeEntries
    .map((row) => Number(row.id.replace(/\D/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `time-demo-${max + 1}`;
}

function nextExpenseId(state: DemoTimeWorkflowState) {
  const max = state.expenses
    .map((row) => Number(row.id.replace(/\D/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return `exp-demo-${max + 1}`;
}

function resolveMatterTitle(matterId: string, matterTitle?: string): string {
  if (matterTitle?.trim()) return matterTitle.trim();
  return DEMO_MATTERS.find((row) => row.id === matterId)?.title ?? "Unknown matter";
}

function buildApprovalBase(input: {
  submitterName: string;
  submitterRole: UserRole;
  employeeId: string;
  matterId: string;
  matterTitle: string;
  submittedAt: string;
  amountOrHours: string;
  title: string;
  summary: string;
  priority: ApprovalPriority;
}): Pick<
  AdminApproval,
  | "submittedBy"
  | "employeeId"
  | "status"
  | "priority"
  | "submittedAt"
  | "amountOrHours"
  | "matterId"
  | "matterLabel"
  | "matterReference"
  | "matterStatus"
  | "assignedApproverId"
  | "assignedApproverName"
> {
  return {
    submittedBy: input.submitterName,
    employeeId: input.employeeId,
    status: "pending",
    priority: input.priority,
    submittedAt: input.submittedAt,
    amountOrHours: input.amountOrHours,
    matterId: input.matterId,
    matterLabel: input.matterTitle,
    matterReference: input.matterId.toUpperCase(),
    matterStatus: "open",
    assignedApproverId: "emp-001",
    assignedApproverName: DEMO_IDENTITIES.managing_partner.fullName,
  };
}

function nextJournalEntryNumber(state: DemoTimeWorkflowState) {
  const max = state.journalEntries
    .map((row) => Number(row.entryNumber.replace(/\D/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 900);
  return `JE-${max + 1}`;
}

export function getTimeEntriesForProfile(profileId: string): TimeEntry[] {
  return readState().timeEntries.filter((entry) => entry.profile_id === profileId);
}

export function getExpensesForProfile(profileId: string): ExpenseSubmission[] {
  return readState().expenses.filter((entry) => entry.profile_id === profileId);
}

export function getDemoApprovals(): AdminApproval[] {
  return readState().approvals.map((row) => ({ ...row }));
}

export function getMergedApprovals(): AdminApproval[] {
  return getDemoApprovals();
}

export function getPendingTimeApprovals(): AdminApproval[] {
  return getMergedApprovals().filter(
    (row) => row.type === "time_entry" && row.status === "pending",
  );
}

export function getPendingExpenseApprovals(): AdminApproval[] {
  return getMergedApprovals().filter(
    (row) => row.type === "expense" && row.status === "pending",
  );
}

export function getPayrollAccruals(): DemoPayrollAccrual[] {
  return readState().payrollAccruals.map((row) => ({ ...row }));
}

export function getDemoJournalEntries(): DemoJournalEntry[] {
  return readState().journalEntries.map((row) => ({ ...row }));
}

export type SubmitTimeEntryInput = {
  profileId: string;
  submitterName: string;
  submitterRole: UserRole;
  employeeId?: string;
  matterId: string;
  matterTitle?: string;
  entryDate: string;
  hours: number;
  description: string;
  isBillable: boolean;
};

export function submitDemoTimeEntry(input: SubmitTimeEntryInput): TimeEntry {
  const state = readState();
  const matterTitle = resolveMatterTitle(input.matterId, input.matterTitle);
  const timeEntryId = nextTimeEntryId(state);
  const approvalId = nextApprovalId(state);
  const submittedAt = new Date().toISOString();
  const hoursLabel = `${input.hours.toFixed(1)} hrs`;
  const employeeId = input.employeeId ?? input.profileId;

  const timeEntry: TimeEntry = {
    id: timeEntryId,
    matter_id: input.matterId,
    profile_id: input.profileId,
    entry_date: input.entryDate,
    hours: input.hours,
    description: input.description,
    is_billable: input.isBillable,
    status: "pending",
    matter: { title: matterTitle },
    requested_by_name: input.submitterName,
  };

  const approval: AdminApproval = {
    id: approvalId,
    title: `${hoursLabel} — ${matterTitle}`,
    type: "time_entry",
    summary: `${input.description} (${input.submitterRole.replace("_", " ")})`,
    ...buildApprovalBase({
      submitterName: input.submitterName,
      submitterRole: input.submitterRole,
      employeeId,
      matterId: input.matterId,
      matterTitle,
      submittedAt,
      amountOrHours: hoursLabel,
      title: `${hoursLabel} — ${matterTitle}`,
      summary: `${input.description} (${input.submitterRole.replace("_", " ")})`,
      priority: input.hours >= 10 ? "urgent" : "normal",
    }),
    originalSnapshot: `time_entry|${timeEntryId}|${input.hours}|${matterTitle}|${input.entryDate}`,
    timeEntryDate: input.entryDate,
    timeEntryHours: input.hours,
    timeEntryBillable: input.isBillable,
    timeEntryDescription: input.description,
  };

  writeState({
    ...state,
    timeEntries: [timeEntry, ...state.timeEntries],
    approvals: [approval, ...state.approvals],
  });

  return timeEntry;
}

export type SubmitExpenseInput = {
  profileId: string;
  submitterName: string;
  submitterRole: UserRole;
  employeeId?: string;
  matterId: string;
  matterTitle?: string;
  expenseDate: string;
  amount: number;
  description: string;
};

export function submitDemoExpense(input: SubmitExpenseInput): ExpenseSubmission {
  const state = readState();
  const matterTitle = resolveMatterTitle(input.matterId, input.matterTitle);
  const expenseId = nextExpenseId(state);
  const approvalId = nextApprovalId(state);
  const submittedAt = new Date().toISOString();
  const amountLabel = `$${input.amount.toFixed(2)}`;
  const employeeId = input.employeeId ?? input.profileId;

  const expense: ExpenseSubmission = {
    id: expenseId,
    matter_id: input.matterId,
    profile_id: input.profileId,
    expense_date: input.expenseDate,
    amount: input.amount,
    description: input.description,
    status: "pending",
    matter: { title: matterTitle },
    requested_by_name: input.submitterName,
  };

  const approval: AdminApproval = {
    id: approvalId,
    title: `Expense — ${input.description.trim() || matterTitle}`,
    type: "expense",
    summary: `${amountLabel} — ${input.description.trim()}`,
    ...buildApprovalBase({
      submitterName: input.submitterName,
      submitterRole: input.submitterRole,
      employeeId,
      matterId: input.matterId,
      matterTitle,
      submittedAt,
      amountOrHours: amountLabel,
      title: `Expense — ${input.description.trim() || matterTitle}`,
      summary: `${amountLabel} — ${input.description.trim()}`,
      priority: input.amount >= 250 ? "urgent" : "normal",
    }),
    originalSnapshot: `expense|${expenseId}|${input.amount}|${matterTitle}|${input.expenseDate}`,
    expenseAmount: input.amount,
    expensePurpose: input.description.trim(),
  };

  writeState({
    ...state,
    expenses: [expense, ...state.expenses],
    approvals: [approval, ...state.approvals],
  });

  return expense;
}

function createPayrollAccrual(
  approval: AdminApproval,
  timeEntry: TimeEntry,
  reviewedAt: string,
  reviewerName: string,
  state: DemoTimeWorkflowState,
): { accrual: DemoPayrollAccrual; journal: DemoJournalEntry } {
  const matter = DEMO_MATTERS.find((row) => row.id === timeEntry.matter_id);
  const billableRate = matterBillableRate(matter);
  const costRate = DEFAULT_COST_RATE;
  const billableAmount = Number((timeEntry.hours * billableRate).toFixed(2));
  const costAmount = Number((timeEntry.hours * costRate).toFixed(2));
  const journalEntryId = crypto.randomUUID();
  const entryNumber = nextJournalEntryNumber(state);
  const matterTitle = timeEntry.matter?.title ?? matter?.title ?? "Matter";

  const journal: DemoJournalEntry = {
    id: journalEntryId,
    entryNumber,
    date: reviewedAt.slice(0, 10),
    description: `Payroll accrual — ${approval.submittedBy} (${timeEntry.hours}h on ${matterTitle})`,
    status: "Posted",
    totalDebit: costAmount,
    totalCredit: costAmount,
    createdBy: reviewerName,
    postedDate: reviewedAt.slice(0, 10),
    source: "time_approval",
    timeEntryId: timeEntry.id,
    lines: [
      {
        id: `${journalEntryId}-1`,
        accountCode: "5200",
        accountName: "Direct Labor — Professional Services",
        description: `${approval.submittedBy} — ${matterTitle}`,
        debit: costAmount,
        credit: 0,
      },
      {
        id: `${journalEntryId}-2`,
        accountCode: "2300",
        accountName: "Accrued Wages Payable",
        description: `${approval.submittedBy} — ${timeEntry.hours}h pending payroll`,
        debit: 0,
        credit: costAmount,
      },
    ],
  };

  const accrual: DemoPayrollAccrual = {
    id: crypto.randomUUID(),
    timeEntryId: timeEntry.id,
    approvalId: approval.id,
    employeeName: approval.submittedBy,
    matterTitle,
    hours: timeEntry.hours,
    billableRate,
    costRate,
    billableAmount,
    costAmount,
    approvedAt: reviewedAt,
    journalEntryId,
  };

  return { accrual, journal };
}

function linkedRecordId(approval: AdminApproval): string | null {
  const parts = approval.originalSnapshot?.split("|") ?? [];
  if ((parts[0] === "time_entry" || parts[0] === "expense") && parts[1]) {
    return parts[1];
  }
  return null;
}

function applyApprovalDecision(
  approvalId: string,
  decision: "approved" | "rejected" | "returned",
  reviewerName: string,
  reviewNotes: string | undefined,
  type: "time_entry" | "expense",
): boolean {
  const state = readState();
  const approval = state.approvals.find((row) => row.id === approvalId);
  if (!approval || approval.type !== type) return false;

  const reviewedAt = new Date().toISOString();
  const recordId = linkedRecordId(approval);
  const nextStatus: ApprovalStatus =
    decision === "approved"
      ? "approved"
      : decision === "rejected"
        ? "rejected"
        : "pending";

  const updatedApprovals = state.approvals.map((row) =>
    row.id === approvalId
      ? {
          ...row,
          status:
            decision === "approved"
              ? ("approved" as const)
              : decision === "rejected"
                ? ("rejected" as const)
                : ("returned" as const),
          decision,
          reviewerName,
          reviewedAt,
          reviewNotes: reviewNotes?.trim() || undefined,
        }
      : row,
  );

  let updatedEntries = state.timeEntries;
  let updatedExpenses = state.expenses;
  let payrollAccruals = state.payrollAccruals;
  let journalEntries = state.journalEntries;

  if (type === "time_entry" && recordId) {
    updatedEntries = state.timeEntries.map((entry) =>
      entry.id === recordId ? { ...entry, status: nextStatus } : entry,
    );

    if (decision === "approved") {
      const timeEntry = updatedEntries.find((entry) => entry.id === recordId);
      if (timeEntry?.is_billable) {
        const { accrual, journal } = createPayrollAccrual(
          approval,
          timeEntry,
          reviewedAt,
          reviewerName,
          state,
        );
        payrollAccruals = [accrual, ...payrollAccruals];
        journalEntries = [journal, ...journalEntries];
      }
    }
  }

  if (type === "expense" && recordId) {
    updatedExpenses = state.expenses.map((entry) =>
      entry.id === recordId ? { ...entry, status: nextStatus } : entry,
    );
  }

  writeState({
    ...state,
    approvals: updatedApprovals,
    timeEntries: updatedEntries,
    expenses: updatedExpenses,
    payrollAccruals,
    journalEntries,
  });

  return true;
}

export function resolveDemoTimeApproval(
  approvalId: string,
  decision: "approved" | "rejected" | "returned",
  reviewerName: string,
  reviewNotes?: string,
): boolean {
  return applyApprovalDecision(
    approvalId,
    decision,
    reviewerName,
    reviewNotes,
    "time_entry",
  );
}

export function resolveDemoExpenseApproval(
  approvalId: string,
  decision: "approved" | "rejected" | "returned",
  reviewerName: string,
  reviewNotes?: string,
): boolean {
  return applyApprovalDecision(
    approvalId,
    decision,
    reviewerName,
    reviewNotes,
    "expense",
  );
}

export function isDemoSessionApproval(approvalId: string): boolean {
  return readState().approvals.some((row) => row.id === approvalId);
}

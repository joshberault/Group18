import { MOCK_APPROVALS } from "@/lib/admin/mock-data";
import type { AdminApproval } from "@/lib/admin/types";
import { DEMO_IDENTITIES } from "@/lib/roles/role-config";
import type { UserRole } from "@/lib/types";
import type { Matter, TimeEntry, ApprovalStatus } from "@/types/database";
import { DEMO_MATTERS, DEMO_PROFILE, DEMO_TIME_ENTRIES } from "@/lib/attorney/demo-data";

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
  approvals: AdminApproval[];
  payrollAccruals: DemoPayrollAccrual[];
  journalEntries: DemoJournalEntry[];
};

function emptyState(): DemoTimeWorkflowState {
  return {
    timeEntries: DEMO_TIME_ENTRIES.map((entry) => ({ ...entry })),
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
      timeEntries:
        parsed.timeEntries?.length
          ? parsed.timeEntries
          : DEMO_TIME_ENTRIES.map((entry) => ({ ...entry })),
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
  window.dispatchEvent(new CustomEvent(TIME_WORKFLOW_EVENT));
}

export function subscribeTimeWorkflow(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(TIME_WORKFLOW_EVENT, handler);
  return () => window.removeEventListener(TIME_WORKFLOW_EVENT, handler);
}

export function profileIdForRole(role: UserRole): string {
  if (role === "paralegal") return PARALEGAL_PROFILE_ID;
  return DEMO_PROFILE.id;
}

export function submitterNameForRole(role: UserRole): string {
  return DEMO_IDENTITIES[role]?.fullName ?? "Demo User";
}

function matterBillableRate(matter: Matter | undefined): number {
  if (!matter) return DEFAULT_BILLABLE_RATE;
  if (matter.billing_type === "hourly" && matter.hourly_rate) return matter.hourly_rate;
  return DEFAULT_BILLABLE_RATE;
}

function nextApprovalId(state: DemoTimeWorkflowState) {
  const max = [...MOCK_APPROVALS, ...state.approvals]
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

function nextJournalEntryNumber(state: DemoTimeWorkflowState) {
  const max = state.journalEntries
    .map((row) => Number(row.entryNumber.replace(/\D/g, "")) || 0)
    .reduce((a, b) => Math.max(a, b), 900);
  return `JE-${max + 1}`;
}

export function getTimeEntriesForProfile(profileId: string): TimeEntry[] {
  return readState().timeEntries.filter((entry) => entry.profile_id === profileId);
}

export function getDemoApprovals(): AdminApproval[] {
  return readState().approvals.map((row) => ({ ...row }));
}

export function getMergedApprovals(): AdminApproval[] {
  const demoIds = new Set(readState().approvals.map((row) => row.id));
  const seeded = MOCK_APPROVALS.filter((row) => !demoIds.has(row.id));
  return [...seeded, ...getDemoApprovals()];
}

export function getPendingTimeApprovals(): AdminApproval[] {
  return getMergedApprovals().filter(
    (row) => row.type === "time_entry" && row.status === "pending",
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
  matterId: string;
  entryDate: string;
  hours: number;
  description: string;
  isBillable: boolean;
};

export function submitDemoTimeEntry(input: SubmitTimeEntryInput): TimeEntry {
  const state = readState();
  const matter = DEMO_MATTERS.find((row) => row.id === input.matterId);
  const timeEntryId = nextTimeEntryId(state);
  const approvalId = nextApprovalId(state);
  const submittedAt = new Date().toISOString();
  const hoursLabel = `${input.hours.toFixed(1)} hrs`;
  const matterTitle = matter?.title ?? "Unknown matter";

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
  };

  const approval: AdminApproval = {
    id: approvalId,
    title: `${hoursLabel} — ${matterTitle}`,
    type: "time_entry",
    submittedBy: input.submitterName,
    employeeId: `demo-${input.submitterRole}`,
    summary: `${input.description} (${input.submitterRole.replace("_", " ")})`,
    status: "pending",
    priority: input.hours >= 10 ? "urgent" : "normal",
    submittedAt,
    amountOrHours: hoursLabel,
    matterId: input.matterId,
    matterLabel: matterTitle,
    matterReference: input.matterId.toUpperCase(),
    matterStatus: "open",
    assignedApproverId: "emp-001",
    assignedApproverName: DEMO_IDENTITIES.managing_partner.fullName,
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

function linkedTimeEntryId(approval: AdminApproval): string | null {
  const parts = approval.originalSnapshot.split("|");
  if (parts[0] !== "time_entry" || !parts[1]) return null;
  return parts[1];
}

export function resolveDemoTimeApproval(
  approvalId: string,
  decision: "approved" | "rejected" | "returned",
  reviewerName: string,
  reviewNotes?: string,
): boolean {
  const state = readState();
  const approval = state.approvals.find((row) => row.id === approvalId);
  if (!approval || approval.type !== "time_entry") return false;

  const reviewedAt = new Date().toISOString();
  const timeEntryId = linkedTimeEntryId(approval);
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

  const updatedEntries = timeEntryId
    ? state.timeEntries.map((entry) =>
        entry.id === timeEntryId ? { ...entry, status: nextStatus } : entry,
      )
    : state.timeEntries;

  let payrollAccruals = state.payrollAccruals;
  let journalEntries = state.journalEntries;

  if (decision === "approved" && timeEntryId) {
    const timeEntry = updatedEntries.find((entry) => entry.id === timeEntryId);
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

  writeState({
    ...state,
    approvals: updatedApprovals,
    timeEntries: updatedEntries,
    payrollAccruals,
    journalEntries,
  });

  return true;
}

export function isDemoSessionApproval(approvalId: string): boolean {
  return readState().approvals.some((row) => row.id === approvalId);
}

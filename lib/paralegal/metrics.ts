import {
  PARALEGAL_DEADLINES,
  type ParalegalDeadline,
  type ParalegalReviewItem,
  type ParalegalTask,
} from "@/lib/paralegal/demo-data";
import {
  getParalegalWorkflow,
  type ParalegalWorkflowState,
} from "@/lib/paralegal/workflow-store";

export {
  filterExpensesByQuery,
  filterTasksByQuery,
  filterTimeByQuery,
} from "@/lib/paralegal/filters";

/** Shared Paralegal dashboard metric helpers (seed + workflow store). */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDay(isoDate: string) {
  return startOfDay(
    new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`),
  );
}

export function daysUntil(isoDate: string): number {
  const today = startOfDay(new Date());
  const target = parseDay(isoDate);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function dueLabel(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due Today";
  if (days === 1) return "Due Tomorrow";
  return `Due in ${days} Days`;
}

function resolveState(state?: ParalegalWorkflowState): ParalegalWorkflowState {
  return state ?? getParalegalWorkflow();
}

export function getParalegalSummaryCounts(state?: ParalegalWorkflowState) {
  const { tasks, timeEntries } = resolveState(state);
  const today = startOfDay(new Date());

  const tasksDueToday = tasks.filter(
    (t) =>
      parseDay(t.dueDate).getTime() === today.getTime() &&
      t.status !== "completed",
  ).length;

  const overdueTasks = tasks.filter(
    (t) =>
      t.status === "overdue" ||
      (parseDay(t.dueDate) < today && t.status !== "completed"),
  ).length;

  const deadlinesWithin7 = PARALEGAL_DEADLINES.filter((d) => {
    const days = daysUntil(d.dueAt);
    return days >= 0 && days <= 7;
  }).length;

  const waitingOnAttorney = tasks.filter(
    (t) => t.status === "waiting_on_attorney",
  ).length;

  const draftOrMissingTime =
    timeEntries.filter((e) => e.status === "draft" || e.status === "rejected")
      .length +
    timeEntries.filter((e) => e.description.includes("No entry")).length;

  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;

  return {
    tasksDueToday,
    overdueTasks,
    deadlinesWithin7,
    waitingOnAttorney,
    draftOrMissingTime,
    blockedTasks,
  };
}

export function getPriorityQueue(
  state?: ParalegalWorkflowState,
): ParalegalTask[] {
  const { tasks } = resolveState(state);
  const rank = (t: ParalegalTask) => {
    const days = daysUntil(t.dueDate);
    if (t.status === "overdue" || days < 0) return 0;
    if (days === 0) return 1;
    if (days <= 2) return 2;
    if (t.status === "blocked") return 3;
    if (
      t.status === "in_progress" &&
      t.notes?.toLowerCase().includes("returned")
    )
      return 4;
    return 5 + days;
  };

  return [...tasks]
    .filter((t) => t.status !== "completed")
    .sort((a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
}

export function getUpcomingDeadlines(limit = 6): ParalegalDeadline[] {
  return [...PARALEGAL_DEADLINES]
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit);
}

export function getReviewQueue(
  state?: ParalegalWorkflowState,
): ParalegalReviewItem[] {
  const { reviews } = resolveState(state);
  return [...reviews].sort((a, b) => {
    const order: Record<string, number> = {
      returned_for_revision: 0,
      submitted: 1,
      under_review: 2,
      draft: 3,
      approved: 4,
    };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });
}

export function getTimeExpenseReminders(state?: ParalegalWorkflowState) {
  const { timeEntries, expenses } = resolveState(state);
  const today = new Date().toISOString().slice(0, 10);
  const timeToday = timeEntries.filter(
    (e) => e.entryDate === today && e.hours > 0,
  );
  const drafts = timeEntries.filter(
    (e) => e.status === "draft" && e.hours > 0,
  );
  const rejected = timeEntries.filter((e) => e.status === "rejected");
  const missingDays = timeEntries.filter((e) =>
    e.description.includes("No entry"),
  );
  const expensesMissingReceipt = expenses.filter((e) => e.receiptMissing);

  const hoursToday = timeToday.reduce((sum, e) => sum + e.hours, 0);

  return {
    hoursToday,
    drafts,
    rejected,
    missingDays,
    expensesMissingReceipt,
    billingCutoff: PARALEGAL_DEADLINES.find((d) => d.type === "billing_cutoff"),
  };
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting_on_client: "Waiting on Client",
  waiting_on_attorney: "Waiting on Attorney",
  blocked: "Blocked",
  submitted_for_review: "Submitted for Review",
  completed: "Completed",
  overdue: "Overdue",
};

export const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  returned_for_revision: "Returned for Revision",
  approved: "Approved",
};

export const DEADLINE_TYPE_LABELS: Record<string, string> = {
  court: "Court Deadline",
  filing: "Filing Deadline",
  discovery: "Discovery Deadline",
  client_response: "Client Response Deadline",
  internal_review: "Internal Review Deadline",
  document_preparation: "Document Preparation Deadline",
  billing_cutoff: "Billing Cutoff",
};

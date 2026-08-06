import {
  PARALEGAL_DEADLINES,
  PARALEGAL_EXPENSES,
  PARALEGAL_REVIEW_QUEUE,
  PARALEGAL_TASKS,
  PARALEGAL_TIME_ENTRIES,
  type ParalegalDeadline,
  type ParalegalTask,
} from "@/lib/paralegal/demo-data";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDay(isoDate: string) {
  return startOfDay(new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`));
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

export function getParalegalSummaryCounts() {
  const tasks = PARALEGAL_TASKS;
  const today = startOfDay(new Date());

  const tasksDueToday = tasks.filter(
    (t) =>
      parseDay(t.dueDate).getTime() === today.getTime() &&
      t.status !== "completed",
  ).length;

  const overdueTasks = tasks.filter(
    (t) => t.status === "overdue" || (parseDay(t.dueDate) < today && t.status !== "completed"),
  ).length;

  const deadlinesWithin7 = PARALEGAL_DEADLINES.filter((d) => {
    const days = daysUntil(d.dueAt);
    return days >= 0 && days <= 7;
  }).length;

  const waitingOnAttorney = tasks.filter((t) => t.status === "waiting_on_attorney").length;

  const draftOrMissingTime =
    PARALEGAL_TIME_ENTRIES.filter((e) => e.status === "draft" || e.status === "rejected")
      .length +
    PARALEGAL_TIME_ENTRIES.filter((e) => e.description.includes("No entry")).length;

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

export function getPriorityQueue(): ParalegalTask[] {
  const rank = (t: ParalegalTask) => {
    const days = daysUntil(t.dueDate);
    if (t.status === "overdue" || days < 0) return 0;
    if (days === 0) return 1;
    if (days <= 2) return 2;
    if (t.status === "blocked") return 3;
    if (t.status === "in_progress" && t.notes?.toLowerCase().includes("returned")) return 4;
    return 5 + days;
  };

  return [...PARALEGAL_TASKS]
    .filter((t) => t.status !== "completed")
    .sort((a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
}

export function getUpcomingDeadlines(limit = 6): ParalegalDeadline[] {
  return [...PARALEGAL_DEADLINES]
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit);
}

export function getReviewQueue() {
  return [...PARALEGAL_REVIEW_QUEUE].sort((a, b) => {
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

export function getTimeExpenseReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const timeToday = PARALEGAL_TIME_ENTRIES.filter(
    (e) => e.entryDate === today && e.hours > 0,
  );
  const drafts = PARALEGAL_TIME_ENTRIES.filter((e) => e.status === "draft" && e.hours > 0);
  const rejected = PARALEGAL_TIME_ENTRIES.filter((e) => e.status === "rejected");
  const missingDays = PARALEGAL_TIME_ENTRIES.filter((e) =>
    e.description.includes("No entry"),
  );
  const expensesMissingReceipt = PARALEGAL_EXPENSES.filter((e) => e.receiptMissing);

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

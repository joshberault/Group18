import {
  PARALEGAL_ALERTS,
  PARALEGAL_ASSIGNED_MATTERS,
  PARALEGAL_DEADLINES,
  PARALEGAL_REVIEW_QUEUE,
  PARALEGAL_TASKS,
  PARALEGAL_TIME_ENTRIES,
  type ParalegalAlert,
  type ParalegalDeadline,
  type ParalegalReviewItem,
  type ParalegalTask,
} from "@/lib/paralegal/demo-data";
import { daysUntil } from "@/lib/paralegal/metrics";

/** Demo attorney identity (matches role-config DEMO_IDENTITIES.attorney). */
export const DEMO_ATTORNEY = {
  id: "attorney-avery",
  fullName: "Avery Counsel",
  email: "avery.counsel@counselflow.example",
  initials: "AC",
  /** Uses the attorney ladder: Senior Partner, Partner, Senior Associate, Associate, Junior Associate. */
  title: "Partner",
} as const;

const ATTORNEY_NAME = DEMO_ATTORNEY.fullName;

/** Matters where Avery is the assigned attorney. */
export function getAttorneyMatters() {
  return PARALEGAL_ASSIGNED_MATTERS.filter((m) => m.attorneyName === ATTORNEY_NAME);
}

export function getAttorneyTasks(): ParalegalTask[] {
  return PARALEGAL_TASKS.filter((t) => t.attorneyName === ATTORNEY_NAME);
}

export function getAttorneyDeadlines(): ParalegalDeadline[] {
  return PARALEGAL_DEADLINES.filter(
    (d) => d.attorneyName === ATTORNEY_NAME || d.type === "billing_cutoff",
  );
}

/** Review inbox: work submitted TO Avery (reuse Paralegal review queue). */
export function getAttorneyReviewInbox(): ParalegalReviewItem[] {
  return PARALEGAL_REVIEW_QUEUE.filter(
    (r) => r.attorneyName === ATTORNEY_NAME && r.status !== "approved",
  ).sort((a, b) => {
    const order: Record<string, number> = {
      returned_for_revision: 0,
      submitted: 1,
      under_review: 2,
      draft: 3,
    };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });
}

export function getAttorneyAlerts(): ParalegalAlert[] {
  const myMatterIds = new Set(getAttorneyMatters().map((m) => m.id));
  const myClientIds = new Set(getAttorneyMatters().map((m) => m.clientId));
  return PARALEGAL_ALERTS.filter(
    (a) =>
      (a.matterId && myMatterIds.has(a.matterId)) ||
      (a.clientId && myClientIds.has(a.clientId)),
  );
}

export function getAttorneyPriorityActions(filters?: {
  matter: string;
  client: string;
  priority: string;
}): ParalegalTask[] {
  const rank = (t: ParalegalTask) => {
    const days = daysUntil(t.dueDate);
    if (t.status === "overdue" || days < 0) return 0;
    if (t.status === "waiting_on_attorney") return 1;
    if (days === 0) return 2;
    if (days <= 2) return 3;
    if (t.status === "blocked") return 4;
    return 5 + days;
  };

  return [...getAttorneyTasks()]
    .filter((t) => t.status !== "completed")
    .filter((t) => {
      if (!filters) return true;
      if (filters.matter !== "all" && t.matterId !== filters.matter) return false;
      if (filters.client !== "all" && t.clientId !== filters.client) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      return true;
    })
    .sort((a, b) => rank(a) - rank(b) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8);
}

export function getAttorneySummaryCounts() {
  const tasks = getAttorneyTasks();
  const reviews = getAttorneyReviewInbox();
  const deadlines = getAttorneyDeadlines();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const awaitingMyReview = reviews.filter(
    (r) => r.status === "submitted" || r.status === "under_review",
  ).length;

  const returnedNeedingFollowUp = reviews.filter(
    (r) => r.status === "returned_for_revision",
  ).length;

  const overdueCritical = tasks.filter(
    (t) => t.status === "overdue" || daysUntil(t.dueDate) < 0,
  ).length;

  const deadlines7 = deadlines.filter((d) => {
    const days = daysUntil(d.dueAt);
    return days >= 0 && days <= 7;
  }).length;

  const waitingOnMe = tasks.filter((t) => t.status === "waiting_on_attorney").length;

  const unbilledOrPendingTime = PARALEGAL_TIME_ENTRIES.filter(
    (e) =>
      getAttorneyMatters().some((m) => m.id === e.matterId) &&
      (e.status === "submitted" || e.status === "draft") &&
      e.hours > 0,
  ).length;

  const riskAlerts = getAttorneyAlerts().filter(
    (a) => a.kind === "conflict" || a.kind === "scope" || a.kind === "matter_hold",
  ).length;

  return {
    awaitingMyReview,
    returnedNeedingFollowUp,
    overdueCritical,
    deadlines7,
    waitingOnMe,
    unbilledOrPendingTime,
    riskAlerts,
  };
}

export function getUpcomingAttorneyDeadlines(limit = 6) {
  return [...getAttorneyDeadlines()]
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit);
}

export function getAttorneyMatterIdForTitle(title: string) {
  return getAttorneyMatters().find((matter) => matter.title === title)?.id;
}

export function getAttorneyReviewById(reviewId: string) {
  return getAttorneyReviewInbox().find((review) => review.id === reviewId);
}

export function getAttorneyReviewMatterHref(review: ParalegalReviewItem) {
  const matterId = getAttorneyMatterIdForTitle(review.matterTitle);
  if (!matterId) return "/attorney/matters";
  return `/attorney/matters/${matterId}?review=${review.id}`;
}

export function getAttorneyReviewRelatedWorkHref(review: ParalegalReviewItem) {
  const matterId = getAttorneyMatterIdForTitle(review.matterTitle);
  if (matterId) return `/attorney/tasks?tab=all&matter=${matterId}`;
  return "/attorney/tasks?tab=all";
}

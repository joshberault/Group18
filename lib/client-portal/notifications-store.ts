import { clientNotifications } from "@/lib/mock-data/client-portal";

export const NOTIFICATION_STORAGE_KEY = "counselflow-completed-notifications";
export const DYNAMIC_NOTIFICATIONS_KEY = "counselflow-dynamic-notifications";
export const NOTIFICATION_UPDATE_EVENT = "client-notifications-updated";

export type ClientNotificationType =
  | (typeof clientNotifications)[number]["type"]
  | "dispute_denied";

export type ClientNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: ClientNotificationType;
  actionLabel: string;
  actionHref: string;
};

export function getCompletedNotificationIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const stored = JSON.parse(
      localStorage.getItem(NOTIFICATION_STORAGE_KEY) ?? "[]",
    );
    return new Set<string>(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set<string>();
  }
}

export function getDynamicNotifications(): ClientNotification[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(
      localStorage.getItem(DYNAMIC_NOTIFICATIONS_KEY) ?? "[]",
    );
    return Array.isArray(stored) ? (stored as ClientNotification[]) : [];
  } catch {
    return [];
  }
}

function persistDynamicNotification(notification: ClientNotification) {
  const existing = getDynamicNotifications();
  localStorage.setItem(
    DYNAMIC_NOTIFICATIONS_KEY,
    JSON.stringify([notification, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATE_EVENT));
}

export function getAllNotifications(): ClientNotification[] {
  const dynamic = getDynamicNotifications();
  const byId = new Map<string, ClientNotification>();

  for (const notification of clientNotifications) {
    byId.set(notification.id, notification);
  }
  for (const notification of dynamic) {
    byId.set(notification.id, notification);
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getActiveNotifications() {
  const completedIds = getCompletedNotificationIds();
  return getAllNotifications().filter(
    (notification) => !completedIds.has(notification.id),
  );
}

export function getActiveNotificationCount() {
  return getActiveNotifications().length;
}

export function addCaseStatusUpdateNotification(input: {
  caseNumber: string;
  caseTitle: string;
  taskTitle: string;
  completedBy: string;
}) {
  if (typeof window === "undefined") return;

  persistDynamicNotification({
    id: `notif-case-status-${Date.now()}`,
    title: "New case status update",
    message: `${input.completedBy} marked “${input.taskTitle}” complete on case ${input.caseNumber} (${input.caseTitle}).`,
    createdAt: new Date().toISOString(),
    type: "case_status",
    actionLabel: "Review update",
    actionHref: "/client-portal/case-status",
  });
}

export function addDisputeDeniedNotification(input: {
  chargeSummaries: string[];
}) {
  if (typeof window === "undefined") return;

  const chargeText =
    input.chargeSummaries.length === 1
      ? input.chargeSummaries[0]
      : `${input.chargeSummaries.length} charges`;

  persistDynamicNotification({
    id: `notif-dispute-denied-${Date.now()}`,
    title: "Disputed charge request denied",
    message: `Your disputed charge request for ${chargeText} has been denied.`,
    createdAt: new Date().toISOString(),
    type: "dispute_denied",
    actionLabel: "View billing",
    actionHref: "/client-portal/pay-balance",
  });
}

export const CASE_TASK_PROGRESS_KEY = "counselflow-case-task-progress";
export const CASE_TASK_PROGRESS_EVENT = "client-case-task-progress-updated";

export type CaseTaskProgressMap = Record<string, string[]>;

export function getCaseTaskProgress(): CaseTaskProgressMap {
  if (typeof window === "undefined") return {};

  try {
    const stored = JSON.parse(
      localStorage.getItem(CASE_TASK_PROGRESS_KEY) ?? "{}",
    );
    return stored && typeof stored === "object"
      ? (stored as CaseTaskProgressMap)
      : {};
  } catch {
    return {};
  }
}

export function markCaseTaskComplete(caseId: string, taskId: string) {
  if (typeof window === "undefined") return;

  const progress = getCaseTaskProgress();
  const completed = new Set(progress[caseId] ?? []);
  completed.add(taskId);
  progress[caseId] = [...completed];
  localStorage.setItem(CASE_TASK_PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent(CASE_TASK_PROGRESS_EVENT));
}

export function isCaseTaskMarkedComplete(caseId: string, taskId: string) {
  const progress = getCaseTaskProgress();
  return (progress[caseId] ?? []).includes(taskId);
}

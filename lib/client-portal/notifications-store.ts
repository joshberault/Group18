import { clientNotifications } from "@/lib/mock-data/client-portal";

export const NOTIFICATION_STORAGE_KEY = "counselflow-completed-notifications";
export const DYNAMIC_NOTIFICATIONS_KEY = "counselflow-dynamic-notifications";
export const NOTIFICATION_UPDATE_EVENT = "client-notifications-updated";

export type ClientNotificationType =
  | (typeof clientNotifications)[number]["type"]
  | "dispute_denied"
  | "invoice_added"
  | "badge_earned";

export type ClientNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: ClientNotificationType;
  actionLabel: string;
  actionHref: string;
  caseNumber?: string;
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
    message: `${input.completedBy} marked “${input.taskTitle}” complete on ${input.caseTitle}.`,
    createdAt: new Date().toISOString(),
    type: "case_status",
    caseNumber: input.caseNumber,
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

export function addInvoiceAddedNotification(input: {
  invoiceNumber: string;
  amount: number;
  matterName: string;
  matterReference: string;
}) {
  if (typeof window === "undefined") return;

  persistDynamicNotification({
    id: `notif-invoice-added-${input.invoiceNumber}`,
    title: "New invoice charged to your account",
    message: `${input.invoiceNumber} for ${input.matterName} has been charged to your account for ${new Intl.NumberFormat(
      "en-US",
      { style: "currency", currency: "USD" },
    ).format(input.amount)}. Review the charge in Account Summary.`,
    createdAt: new Date().toISOString(),
    type: "invoice_added",
    caseNumber: input.matterReference,
    actionLabel: "View Account Summary",
    actionHref: "/client-portal/account-summary",
  });
}

export function addBadgeEarnedNotification(badgeId: string) {
  if (typeof window === "undefined") return;

  persistDynamicNotification({
    id: `notif-badge-earned-${badgeId}-${Date.now()}`,
    title: "New badge earned",
    message:
      "You’ve earned a new badge! Navigate to your badges to see your latest accomplishment!",
    createdAt: new Date().toISOString(),
    type: "badge_earned",
    actionLabel: "View badges",
    actionHref: "/client-portal/my-badges",
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

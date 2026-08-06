export const PARALEGAL_NOTIFICATION_STORAGE_KEY =
  "counselflow-paralegal-notifications";
export const PARALEGAL_NOTIFICATION_COMPLETED_KEY =
  "counselflow-paralegal-notifications-completed";
export const PARALEGAL_NOTIFICATION_UPDATE_EVENT =
  "paralegal-notifications-updated";

export type ParalegalNotificationType =
  | "calendar_decision"
  | "message_received"
  | "request_fulfilled"
  | "request_received";

export type ParalegalNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: ParalegalNotificationType;
  matterNumber?: string;
  actionLabel: string;
  actionHref: string;
};

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function persistNotification(notification: ParalegalNotification) {
  if (typeof window === "undefined") return;
  const existing = readArray<ParalegalNotification>(
    PARALEGAL_NOTIFICATION_STORAGE_KEY,
  ).filter((item) => item.id !== notification.id);
  window.localStorage.setItem(
    PARALEGAL_NOTIFICATION_STORAGE_KEY,
    JSON.stringify([notification, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(PARALEGAL_NOTIFICATION_UPDATE_EVENT));
}

export function getAllParalegalNotifications(): ParalegalNotification[] {
  return readArray<ParalegalNotification>(
    PARALEGAL_NOTIFICATION_STORAGE_KEY,
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getActiveParalegalNotifications(): ParalegalNotification[] {
  const completed = new Set(
    readArray<string>(PARALEGAL_NOTIFICATION_COMPLETED_KEY),
  );
  return getAllParalegalNotifications().filter(
    (notification) => !completed.has(notification.id),
  );
}

export function getActiveParalegalNotificationCount() {
  return getActiveParalegalNotifications().length;
}

export function completeParalegalNotification(id: string) {
  if (typeof window === "undefined") return;
  const completed = new Set(
    readArray<string>(PARALEGAL_NOTIFICATION_COMPLETED_KEY),
  );
  completed.add(id);
  window.localStorage.setItem(
    PARALEGAL_NOTIFICATION_COMPLETED_KEY,
    JSON.stringify([...completed]),
  );
  window.dispatchEvent(new CustomEvent(PARALEGAL_NOTIFICATION_UPDATE_EVENT));
}

export function addParalegalCalendarDecisionNotification(input: {
  decision: "approved" | "declined";
  decidedBy: string;
  eventTitle: string;
  eventDate: string;
  matterName: string;
}) {
  const verb = input.decision === "approved" ? "approved" : "declined";
  persistNotification({
    id: `paralegal-calendar-${input.decision}-${input.eventTitle}-${input.eventDate}-${Date.now()}`,
    title:
      input.decision === "approved"
        ? "Calendar date approved"
        : "Calendar date declined",
    message: `${input.decidedBy} ${verb} “${input.eventTitle}” on ${input.eventDate} for ${input.matterName}.`,
    createdAt: new Date().toISOString(),
    type: "calendar_decision",
    actionLabel: "Open Attorney Hub",
    actionHref: "/attorney/dashboard#attorney-calendar",
  });
}

export function addParalegalMessageReceivedNotification(input: {
  sender: string;
  subject: string;
  matterName: string;
  matterNumber: string;
}) {
  persistNotification({
    id: `paralegal-message-${Date.now()}-${input.matterNumber}`,
    title: "New message received",
    message: `${input.sender} sent “${input.subject}” regarding ${input.matterName}.`,
    createdAt: new Date().toISOString(),
    type: "message_received",
    matterNumber: input.matterNumber,
    actionLabel: "Open messaging",
    actionHref: "/matters",
  });
}

export function addParalegalRequestFulfilledNotification(input: {
  requestTitle: string;
  fulfilledBy: string;
  matterName: string;
  matterNumber: string;
}) {
  persistNotification({
    id: `paralegal-request-fulfilled-${Date.now()}`,
    title: "Client fulfilled a request",
    message: `${input.fulfilledBy} fulfilled “${input.requestTitle}” for ${input.matterName}.`,
    createdAt: new Date().toISOString(),
    type: "request_fulfilled",
    matterNumber: input.matterNumber,
    actionLabel: "Review requests",
    actionHref: "/matters",
  });
}

export function addParalegalRequestReceivedNotification(input: {
  requestTitle: string;
  sentBy: string;
  sentByRole: "client" | "attorney";
  matterName: string;
  matterNumber: string;
}) {
  const from =
    input.sentByRole === "client" ? "the client" : "the attorney";
  persistNotification({
    id: `paralegal-request-received-${Date.now()}`,
    title: "New request received",
    message: `${input.sentBy} (${from}) sent “${input.requestTitle}” for ${input.matterName}.`,
    createdAt: new Date().toISOString(),
    type: "request_received",
    matterNumber: input.matterNumber,
    actionLabel: "Open requests",
    actionHref: "/matters",
  });
}

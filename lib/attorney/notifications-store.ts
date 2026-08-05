import {
  ATTORNEY_CALENDAR_TYPE_LABELS,
  getAttorneyCalendarEvents,
} from "@/lib/attorney/calendar-store";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";

export const ATTORNEY_NOTIFICATION_STORAGE_KEY =
  "counselflow-attorney-notifications";
export const ATTORNEY_NOTIFICATION_COMPLETED_KEY =
  "counselflow-attorney-notifications-completed";
export const ATTORNEY_NOTIFICATION_UPDATE_EVENT =
  "attorney-notifications-updated";

export type AttorneyNotificationType =
  | "document_deletion"
  | "calendar_entry"
  | "request_fulfilled"
  | "message_received"
  | "calendar_reminder";

export type AttorneyNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: AttorneyNotificationType;
  matterId?: string;
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

function persistNotification(notification: AttorneyNotification) {
  if (typeof window === "undefined") return;
  const existing = readArray<AttorneyNotification>(
    ATTORNEY_NOTIFICATION_STORAGE_KEY,
  ).filter((item) => item.id !== notification.id);
  window.localStorage.setItem(
    ATTORNEY_NOTIFICATION_STORAGE_KEY,
    JSON.stringify([notification, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(ATTORNEY_NOTIFICATION_UPDATE_EVENT));
}

function getMatterForCalendarEvent(matterName: string) {
  return PARALEGAL_ASSIGNED_MATTERS.find(
    (matter) => matter.title === matterName,
  );
}

function calendarEntryNotifications(): AttorneyNotification[] {
  return getAttorneyCalendarEvents()
    .filter((event) => event.addedBy.role === "paralegal")
    .map((event) => {
      const matter = getMatterForCalendarEvent(event.matterName);
      return {
        id: `attorney-calendar-entry-${event.id}`,
        title: "Paralegal added a calendar date",
        message: `${event.addedBy.name} added ${event.title} on ${formatCalendarDate(
          event.date,
        )} at ${event.time} for ${event.matterName}.`,
        createdAt: `${event.date}T12:00:00.000Z`,
        type: "calendar_entry" as const,
        matterId: matter?.id,
        matterNumber: matter?.matterNumber,
        actionLabel: "Review calendar",
        actionHref: "/attorney/dashboard#attorney-calendar",
      };
    });
}

function dateAtNoon(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfToday() {
  const value = new Date();
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
}

function daysUntil(dateKey: string) {
  return Math.round(
    (dateAtNoon(dateKey).getTime() - startOfToday().getTime()) / 86_400_000,
  );
}

function formatCalendarDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(dateAtNoon(dateKey));
}

function calendarReminderNotifications(): AttorneyNotification[] {
  const reminderDays = new Set([5, 3, 1, 0]);

  return getAttorneyCalendarEvents().flatMap((event) => {
    const remaining = daysUntil(event.date);
    if (!reminderDays.has(remaining)) return [];

    const matter = getMatterForCalendarEvent(event.matterName);
    const timing =
      remaining === 0
        ? "today"
        : `in ${remaining} day${remaining === 1 ? "" : "s"}`;

    return [
      {
        id: `attorney-calendar-reminder-${event.id}-${remaining}`,
        title: `Calendar date ${timing}`,
        message: `${ATTORNEY_CALENDAR_TYPE_LABELS[event.type]}: ${
          event.title
        } is ${timing} at ${event.time} for ${event.matterName}.`,
        createdAt: new Date().toISOString(),
        type: "calendar_reminder" as const,
        matterId: matter?.id,
        matterNumber: matter?.matterNumber,
        actionLabel: "View date",
        actionHref: "/attorney/dashboard#attorney-calendar",
      },
    ];
  });
}

export function getAllAttorneyNotifications(): AttorneyNotification[] {
  const stored = readArray<AttorneyNotification>(
    ATTORNEY_NOTIFICATION_STORAGE_KEY,
  );
  const notifications = new Map<string, AttorneyNotification>();

  for (const notification of [
    ...calendarEntryNotifications(),
    ...calendarReminderNotifications(),
    ...stored,
  ]) {
    notifications.set(notification.id, notification);
  }

  return [...notifications.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getActiveAttorneyNotifications(): AttorneyNotification[] {
  const completed = new Set(
    readArray<string>(ATTORNEY_NOTIFICATION_COMPLETED_KEY),
  );
  return getAllAttorneyNotifications().filter(
    (notification) => !completed.has(notification.id),
  );
}

export function getActiveAttorneyNotificationCount() {
  return getActiveAttorneyNotifications().length;
}

export function completeAttorneyNotification(id: string) {
  if (typeof window === "undefined") return;
  const completed = new Set(
    readArray<string>(ATTORNEY_NOTIFICATION_COMPLETED_KEY),
  );
  completed.add(id);
  window.localStorage.setItem(
    ATTORNEY_NOTIFICATION_COMPLETED_KEY,
    JSON.stringify([...completed]),
  );
  window.dispatchEvent(new CustomEvent(ATTORNEY_NOTIFICATION_UPDATE_EVENT));
}

export function addDocumentDeletionNotification(input: {
  documentName: string;
  requestedBy: string;
  matterName: string;
  matterNumber: string;
  reason: string;
}) {
  persistNotification({
    id: `attorney-document-deletion-${Date.now()}`,
    title: "Client requested document deletion",
    message: `${input.requestedBy} asked to delete ${input.documentName} from ${input.matterName}. Reason: ${input.reason}`,
    createdAt: new Date().toISOString(),
    type: "document_deletion",
    matterNumber: input.matterNumber,
    actionLabel: "Review documents",
    actionHref: "/matters",
  });
}

export function addRequestFulfilledNotification(input: {
  requestTitle: string;
  fulfilledBy: string;
  matterName: string;
  matterNumber: string;
}) {
  persistNotification({
    id: `attorney-request-fulfilled-${Date.now()}`,
    title: "Client fulfilled a request",
    message: `${input.fulfilledBy} fulfilled “${input.requestTitle}” for ${input.matterName}.`,
    createdAt: new Date().toISOString(),
    type: "request_fulfilled",
    matterNumber: input.matterNumber,
    actionLabel: "Review request",
    actionHref: "/matters",
  });
}

export function addAttorneyMessageReceivedNotification(input: {
  sender: string;
  subject: string;
  matterName: string;
  matterNumber: string;
}) {
  persistNotification({
    id: `attorney-message-received-${Date.now()}-${input.matterNumber}`,
    title: "New message received",
    message: `${input.sender} sent “${input.subject}” regarding ${input.matterName}.`,
    createdAt: new Date().toISOString(),
    type: "message_received",
    matterNumber: input.matterNumber,
    actionLabel: "Open message",
    actionHref: "/matters",
  });
}

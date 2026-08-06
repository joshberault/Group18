/**
 * Notification store for Client Related Matters / Billing dashboard panels.
 *
 * Runtime events (payments, plan changes) are persisted in localStorage.
 * Live invoice notifications come from the Supabase catalog (billing-notifications).
 */

import { invoicesHref, receivablesHref } from "@/lib/billing/routes";

export const CRM_NOTIFICATION_COMPLETED_KEY =
  "counselflow-crm-completed-notifications";
export const CRM_NOTIFICATION_DYNAMIC_KEY = "counselflow-crm-notifications";
export const CRM_NOTIFICATION_UPDATE_EVENT = "crm-notifications-updated";

export type ClientMatterNotificationType =
  | "invoice_added"
  | "invoice_past_due"
  | "payment_received"
  | "payment_plan"
  | "request"
  | "case_status";

export type ClientMatterNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  type: ClientMatterNotificationType;
  matterReference: string;
  /** Optional client name for filtering on billing Client Related Matters */
  clientName?: string;
  /** Invoice number for deep links */
  invoiceNumber?: string;
  actionLabel: string;
  actionHref: string;
};

/** Mock seeds removed — use live catalog + dynamic payment events only. */
export const SEED_NOTIFICATIONS: ClientMatterNotification[] = [];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getCompletedNotificationIds(): Set<string> {
  return new Set(readJson<string[]>(CRM_NOTIFICATION_COMPLETED_KEY, []));
}

export function getDynamicNotifications(): ClientMatterNotification[] {
  return readJson<ClientMatterNotification[]>(CRM_NOTIFICATION_DYNAMIC_KEY, []);
}

/**
 * Persistable/dynamic active notifications only.
 * Combine with buildBillingNotificationsFromCatalog for invoice-backed rows.
 */
export function getActiveNotifications(): ClientMatterNotification[] {
  const completed = getCompletedNotificationIds();

  return [...getDynamicNotifications(), ...SEED_NOTIFICATIONS]
    .filter((notification) => !completed.has(notification.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getActiveNotificationCount(): number {
  return getActiveNotifications().length;
}

export function completeNotification(id: string) {
  if (typeof window === "undefined") return;

  const completed = getCompletedNotificationIds();
  completed.add(id);
  window.localStorage.setItem(
    CRM_NOTIFICATION_COMPLETED_KEY,
    JSON.stringify([...completed]),
  );
  window.dispatchEvent(new CustomEvent(CRM_NOTIFICATION_UPDATE_EVENT));
}

export function addNotification(notification: ClientMatterNotification) {
  if (typeof window === "undefined") return;

  const existing = getDynamicNotifications().filter(
    (item) => item.id !== notification.id,
  );
  window.localStorage.setItem(
    CRM_NOTIFICATION_DYNAMIC_KEY,
    JSON.stringify([notification, ...existing]),
  );

  const completed = getCompletedNotificationIds();
  if (completed.delete(notification.id)) {
    window.localStorage.setItem(
      CRM_NOTIFICATION_COMPLETED_KEY,
      JSON.stringify([...completed]),
    );
  }

  window.dispatchEvent(new CustomEvent(CRM_NOTIFICATION_UPDATE_EVENT));
}

export function addPaymentReceivedNotification(input: {
  notificationId: string;
  invoiceNumber: string;
  clientName: string;
  matterName: string;
  matterReference: string;
  amount: number;
  remainingBalance: number;
  createdAt: string;
}) {
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  const balanceMessage =
    input.remainingBalance <= 0
      ? "The invoice is now paid in full."
      : `${currency.format(input.remainingBalance)} remains outstanding.`;

  addNotification({
    id: input.notificationId,
    title: "Client payment received",
    message: `${input.clientName} paid ${currency.format(input.amount)} toward ${
      input.invoiceNumber
    } for ${input.matterName}. ${balanceMessage}`,
    createdAt: input.createdAt,
    type: "payment_received",
    matterReference: input.matterReference,
    clientName: input.clientName,
    invoiceNumber: input.invoiceNumber,
    actionLabel: "View invoice",
    actionHref: invoicesHref({ highlight: input.invoiceNumber }),
  });
}

export function receivablesNotificationHref(invoiceNumber?: string): string {
  return receivablesHref(
    invoiceNumber
      ? { view: "overdue", highlight: invoiceNumber }
      : { view: "overdue" },
  );
}

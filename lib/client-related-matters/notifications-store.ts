/**
 * Notification store for Client Related Matters.
 *
 * Seed notifications ship with the module; anything raised at runtime (for
 * example a payment plan change) is persisted to localStorage so the demo keeps
 * its state across navigations. Completed notifications are tracked by id.
 */

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
  actionLabel: string;
  actionHref: string;
};

export const SEED_NOTIFICATIONS: ClientMatterNotification[] = [
  {
    id: "crm-notif-1",
    title: "Invoice past due",
    message:
      "Invoice INV-2044 for Northline Capital — M&A Diligence — Summit Co. is 18 days past due at $42,750.00.",
    createdAt: "2026-07-24T14:10:00.000Z",
    type: "invoice_past_due",
    matterReference: "NV-M-22058",
    actionLabel: "View receivables",
    actionHref: "/receivables?view=overdue",
  },
  {
    id: "crm-notif-2",
    title: "New invoice added",
    message:
      "INV-2061 for Harborview Medical — Employment Compliance Review was issued for $9,600.00 from approved billable time.",
    createdAt: "2026-07-30T16:45:00.000Z",
    type: "invoice_added",
    matterReference: "NV-M-21990",
    actionLabel: "View invoice",
    actionHref: "/invoices",
  },
  {
    id: "crm-notif-3",
    title: "Retainer replenishment required",
    message:
      "Northline Capital — Series B Financing is retainer billed. Work cannot be completed until the outstanding retainer of $18,400.00 is paid.",
    createdAt: "2026-08-01T09:20:00.000Z",
    type: "request",
    matterReference: "NV-M-22041",
    actionLabel: "Review account",
    actionHref: "/receivables",
  },
  {
    id: "crm-notif-4",
    title: "Contingency matter awaiting verdict",
    message:
      "Harborview Medical — Delgado Injury Claim stays uninvoiced until a verdict is reached. A 35% fee invoice is created only on a client win.",
    createdAt: "2026-08-03T11:05:00.000Z",
    type: "case_status",
    matterReference: "NV-M-22120",
    actionLabel: "View matter",
    actionHref: "/matters",
  },
];

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

  // A re-raised notification should reappear even if it was completed before.
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
    actionLabel: "View invoice",
    actionHref: "/invoices",
  });
}

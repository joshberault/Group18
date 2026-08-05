const STORAGE_KEY = "counselflow-firm-notifications-v1";
export const FIRM_NOTIFICATIONS_EVENT = "counselflow-firm-notifications-change";

export interface FirmNotification {
  id: string;
  title: string;
  message: string;
  module: string;
  href: string;
  createdAt: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: FirmNotification[] = [
  {
    id: "fn-1",
    title: "Write-off pending approval",
    message: "Meridian Capital Advisors — $5,100 write-off awaiting review.",
    module: "Accounts Receivable",
    href: "/receivables",
    createdAt: "2026-08-05T09:15:00Z",
    read: false,
  },
  {
    id: "fn-2",
    title: "Trust reconciliation exception",
    message: "IOLTA Operating variance of $250 requires review.",
    module: "Trust Accounting",
    href: "/accounting/trust",
    createdAt: "2026-08-05T08:40:00Z",
    read: false,
  },
  {
    id: "fn-3",
    title: "Attorney billing approval overdue",
    message: "3 time entries pending manager approval for more than 5 days.",
    module: "Administration",
    href: "/admin/approvals",
    createdAt: "2026-08-04T16:20:00Z",
    read: false,
  },
  {
    id: "fn-4",
    title: "Bank reconciliation due",
    message: "Operating account reconciliation due by Aug 8.",
    module: "Banking",
    href: "/accounting/banking",
    createdAt: "2026-08-04T11:00:00Z",
    read: true,
  },
  {
    id: "fn-5",
    title: "Month-end close task due",
    message: "Revenue recognition review assigned to Alex Morgan.",
    module: "Revenue & GL",
    href: "/accounting/revenue-ledger",
    createdAt: "2026-08-03T14:30:00Z",
    read: true,
  },
];

function readNotifications(): FirmNotification[] {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS.map((row) => ({ ...row }));
    const parsed = JSON.parse(raw) as FirmNotification[];
    return parsed.length > 0 ? parsed : DEFAULT_NOTIFICATIONS.map((row) => ({ ...row }));
  } catch {
    return DEFAULT_NOTIFICATIONS.map((row) => ({ ...row }));
  }
}

function writeNotifications(rows: FirmNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(FIRM_NOTIFICATIONS_EVENT));
}

export function subscribeFirmNotifications(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener(FIRM_NOTIFICATIONS_EVENT, handler);
  return () => window.removeEventListener(FIRM_NOTIFICATIONS_EVENT, handler);
}

export function getFirmNotifications(): FirmNotification[] {
  return readNotifications();
}

export function getUnreadFirmNotificationCount(): number {
  return readNotifications().filter((row) => !row.read).length;
}

export function markFirmNotificationRead(id: string) {
  const next = readNotifications().map((row) =>
    row.id === id ? { ...row, read: true } : row,
  );
  writeNotifications(next);
}

export function markAllFirmNotificationsRead() {
  const next = readNotifications().map((row) => ({ ...row, read: true }));
  writeNotifications(next);
}

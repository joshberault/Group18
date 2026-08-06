"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { buildBillingNotificationsFromCatalog } from "@/lib/billing/billing-notifications";
import {
  getManagedInvoicesSnapshot,
  getServerInvoicesSnapshot,
  refreshInvoiceCatalog,
  subscribeInvoiceCatalog,
} from "@/lib/billing/invoice-management-store";
import type { ResolvedMatter } from "@/lib/client-related-matters/data";
import {
  completeNotification,
  CRM_NOTIFICATION_UPDATE_EVENT,
  getActiveNotifications,
  getCompletedNotificationIds,
  type ClientMatterNotification,
} from "@/lib/client-related-matters/notifications-store";
import { cn } from "@/lib/utils/cn";

function formatNotificationTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function notificationIcon(type: ClientMatterNotification["type"]) {
  if (type === "request") return ClipboardList;
  if (type === "case_status") return GitBranch;
  if (type === "payment_plan") return CalendarClock;
  return CircleDollarSign;
}

function completionLabel(type: ClientMatterNotification["type"]) {
  if (type === "request") return "I completed the request";
  if (type === "case_status") return "I reviewed the update";
  if (type === "payment_plan") return "I reviewed this plan change";
  if (type === "payment_received") return "I reviewed this payment";
  if (type === "invoice_added") return "I reviewed this invoice";
  return "I followed up on this invoice";
}

function isBillingActionType(type: ClientMatterNotification["type"]) {
  return (
    type === "invoice_added" ||
    type === "invoice_past_due" ||
    type === "payment_received"
  );
}

type Props = {
  matters: ResolvedMatter[];
  /** When set, only show notifications for this client name (or all if null). */
  clientFilterName?: string | null;
};

export function Notifications({ matters, clientFilterName }: Props) {
  const [activeNotifications, setActiveNotifications] = useState<
    ClientMatterNotification[]
  >([]);
  const [completionMessage, setCompletionMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void refreshInvoiceCatalog();
  }, []);

  const invoices = useSyncExternalStore(
    subscribeInvoiceCatalog,
    getManagedInvoicesSnapshot,
    getServerInvoicesSnapshot,
  );

  const referenceKey = useMemo(
    () => matters.map((m) => m.matterReference).join("|"),
    [matters],
  );

  const refreshNotifications = useCallback(() => {
    const completed = getCompletedNotificationIds();
    const allowedRefs = new Set(
      referenceKey ? referenceKey.split("|").filter(Boolean) : [],
    );
    const clientName = clientFilterName?.trim().toLowerCase() || null;

    const fromCatalog = buildBillingNotificationsFromCatalog(invoices).filter(
      (n) => !completed.has(n.id),
    );

    const dynamic = getActiveNotifications().filter((notification) => {
      // Matter-scoped demo items (requests / status) still filter by assignment set
      if (!isBillingActionType(notification.type)) {
        if (notification.matterReference && allowedRefs.size > 0) {
          return allowedRefs.has(notification.matterReference);
        }
      }
      if (clientName) {
        const cn = (notification.clientName ?? "").toLowerCase();
        if (cn && cn !== clientName) return false;
        // if no clientName on row, keep billing deep-links that mention the client
        if (!cn && !notification.message.toLowerCase().includes(clientName)) {
          return false;
        }
      }
      return true;
    });

    // Prefer live catalog rows; drop dynamic payments for invoices that already have a live row
    const liveKeys = new Set(
      fromCatalog
        .map((n) => n.invoiceNumber)
        .filter((v): v is string => Boolean(v)),
    );
    const merged = [
      ...fromCatalog,
      ...dynamic.filter(
        (n) => !n.invoiceNumber || !liveKeys.has(n.invoiceNumber),
      ),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    setActiveNotifications(merged);
  }, [invoices, referenceKey, clientFilterName]);

  useEffect(() => {
    refreshNotifications();
    window.addEventListener(
      CRM_NOTIFICATION_UPDATE_EVENT,
      refreshNotifications,
    );
    return () =>
      window.removeEventListener(
        CRM_NOTIFICATION_UPDATE_EVENT,
        refreshNotifications,
      );
  }, [refreshNotifications]);

  function completeTask(id: string, title: string) {
    completeNotification(id);
    setCompletionMessage(`Task completed. “${title}” was dismissed.`);
    refreshNotifications();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Actions open the matching firm invoice or accounts receivable
              record from Supabase.
            </CardDescription>
          </div>
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
            <Bell className="h-6 w-6" />
            {activeNotifications.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700 ring-2 ring-white">
                {activeNotifications.length}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {completionMessage && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {completionMessage}
        </p>
      )}

      {activeNotifications.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-surface px-5 py-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
            <Check className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-navy-900">
            You’re all caught up
          </p>
          <p className="mt-1 text-sm text-muted">
            No open invoices need attention
            {invoices.length === 0
              ? " (invoice catalog is empty)."
              : " for this filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {activeNotifications.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const isPastDue = notification.type === "invoice_past_due";

            return (
              <li
                key={notification.id}
                className={cn(
                  "rounded-2xl border bg-white px-4 py-4 shadow-sm",
                  isPastDue ? "border-red-200" : "border-gray-200",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      isPastDue
                        ? "bg-red-100 text-red-700"
                        : "bg-navy-900/5 text-navy-900",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-navy-900">
                        {notification.title}
                      </p>
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-200" />
                    </div>
                    <p className="mt-1 text-sm text-navy-900">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {formatNotificationTime(notification.createdAt)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={notification.actionHref}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-navy-900 px-3 text-sm font-medium text-white transition-colors hover:bg-navy-800"
                      >
                        {notification.actionLabel}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          completeTask(notification.id, notification.title)
                        }
                      >
                        <Check className="h-4 w-4" />
                        {completionLabel(notification.type)}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

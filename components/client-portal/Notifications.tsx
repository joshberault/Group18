"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import {
  getActiveNotifications,
  getCompletedNotificationIds,
  NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_UPDATE_EVENT,
  type ClientNotification,
} from "@/lib/client-portal/notifications-store";
import { cn } from "@/lib/utils/cn";

export {
  getActiveNotificationCount,
  NOTIFICATION_STORAGE_KEY,
  NOTIFICATION_UPDATE_EVENT,
} from "@/lib/client-portal/notifications-store";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function notificationIcon(type: ClientNotification["type"]) {
  if (type === "request") return ClipboardList;
  if (type === "case_status") return GitBranch;
  if (type === "dispute_denied") return CircleDollarSign;
  if (type === "invoice_added") return CircleDollarSign;
  if (type === "invoice_past_due") return CircleDollarSign;
  return CalendarClock;
}

function completionLabel(type: ClientNotification["type"]) {
  if (type === "request") return "I completed the request";
  if (type === "case_status") return "I reviewed the update";
  if (type === "dispute_denied") return "I reviewed this notice";
  if (type === "invoice_added") return "I reviewed this invoice";
  return "I paid this invoice";
}

export function Notifications() {
  const { matchesCase } = useCaseSelection();
  const [activeNotifications, setActiveNotifications] = useState<
    ClientNotification[]
  >([]);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const refreshNotifications = useCallback(() => {
    setActiveNotifications(
      getActiveNotifications().filter(
        (notification) =>
          !notification.caseNumber || matchesCase(notification.caseNumber),
      ),
    );
  }, [matchesCase]);

  useEffect(() => {
    refreshNotifications();
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, refreshNotifications);
    return () =>
      window.removeEventListener(
        NOTIFICATION_UPDATE_EVENT,
        refreshNotifications,
      );
  }, [refreshNotifications]);

  function completeTask(id: string, title: string) {
    const next = getCompletedNotificationIds();
    next.add(id);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([...next]));
    window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATE_EVENT));
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
              Notifications remain here until their required task is completed.
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
            You have no tasks requiring attention.
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  Check,
  ClipboardList,
  FileX2,
  Menu,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import {
  ATTORNEY_NOTIFICATION_UPDATE_EVENT,
  completeAttorneyNotification,
  getActiveAttorneyNotifications,
  type AttorneyNotification,
} from "@/lib/attorney/notifications-store";
import { ATTORNEY_CALENDAR_UPDATE_EVENT } from "@/lib/attorney/calendar-store";
import {
  getActiveNotificationCount,
  NOTIFICATION_UPDATE_EVENT,
} from "@/lib/client-portal/notifications-store";
import {
  completeParalegalNotification,
  getActiveParalegalNotifications,
  PARALEGAL_NOTIFICATION_UPDATE_EVENT,
  type ParalegalNotification,
} from "@/lib/paralegal/notifications-store";
import { type UserRole } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { FirmNotificationsMenu } from "./FirmNotificationsMenu";
import { GlobalSearch } from "./GlobalSearch";
import { useDemoRole } from "./DemoRoleProvider";
import { DemoRoleSelect } from "./DemoRoleSelect";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
}

type FeedNotification = {
  id: string;
  title: string;
  message: string;
  matterNumber?: string;
  actionLabel: string;
  actionHref: string;
  type:
    | AttorneyNotification["type"]
    | ParalegalNotification["type"];
};

export function Header({ onMenuClick, className }: HeaderProps) {
  const router = useRouter();
  const { selectedRole, setSelectedRole, identity, roleDisplayLabel } = useDemoRole();
  const [attorneyNotifications, setAttorneyNotifications] = useState<
    AttorneyNotification[]
  >([]);
  const [paralegalNotifications, setParalegalNotifications] = useState<
    ParalegalNotification[]
  >([]);
  const [clientNotificationCount, setClientNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const refreshNotifications = useCallback(() => {
    setAttorneyNotifications(getActiveAttorneyNotifications());
    setParalegalNotifications(getActiveParalegalNotifications());
    setClientNotificationCount(getActiveNotificationCount());
  }, []);

  useEffect(() => {
    refreshNotifications();
    const reminderRefresh = window.setInterval(
      refreshNotifications,
      15 * 60 * 1000,
    );
    window.addEventListener(
      ATTORNEY_NOTIFICATION_UPDATE_EVENT,
      refreshNotifications,
    );
    window.addEventListener(
      PARALEGAL_NOTIFICATION_UPDATE_EVENT,
      refreshNotifications,
    );
    window.addEventListener(
      ATTORNEY_CALENDAR_UPDATE_EVENT,
      refreshNotifications,
    );
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, refreshNotifications);
    return () => {
      window.clearInterval(reminderRefresh);
      window.removeEventListener(
        ATTORNEY_NOTIFICATION_UPDATE_EVENT,
        refreshNotifications,
      );
      window.removeEventListener(
        PARALEGAL_NOTIFICATION_UPDATE_EVENT,
        refreshNotifications,
      );
      window.removeEventListener(
        ATTORNEY_CALENDAR_UPDATE_EVENT,
        refreshNotifications,
      );
      window.removeEventListener(
        NOTIFICATION_UPDATE_EVENT,
        refreshNotifications,
      );
    };
  }, [refreshNotifications]);

  useEffect(() => {
    setNotificationsOpen(false);
    refreshNotifications();
  }, [selectedRole, refreshNotifications]);

  function handleRoleChange(newRole: UserRole) {
    setSelectedRole(newRole);

    if (newRole === "client" && getActiveNotificationCount() > 0) {
      router.push("/client-portal/upload-documents");
    }
  }

  const feedNotifications: FeedNotification[] =
    selectedRole === "attorney"
      ? attorneyNotifications
      : selectedRole === "paralegal"
        ? paralegalNotifications
        : [];

  const visibleNotificationCount =
    selectedRole === "attorney"
      ? attorneyNotifications.length
      : selectedRole === "paralegal"
        ? paralegalNotifications.length
        : selectedRole === "client"
          ? clientNotificationCount
          : 0;

  const usesRoleFeed =
    selectedRole === "attorney" ||
    selectedRole === "paralegal" ||
    selectedRole === "client";

  function notificationIcon(type: FeedNotification["type"]) {
    if (type === "document_deletion") return FileX2;
    if (
      type === "calendar_entry" ||
      type === "calendar_reminder" ||
      type === "calendar_decision"
    ) {
      return CalendarClock;
    }
    if (type === "request_fulfilled") return Send;
    if (type === "request_received") return ClipboardList;
    return MessageSquare;
  }

  function handleNotificationBell() {
    if (selectedRole === "attorney" || selectedRole === "paralegal") {
      setNotificationsOpen((current) => !current);
      return;
    }
    if (selectedRole === "client") {
      router.push("/client-portal/notifications");
    }
  }

  function reviewFeedNotification(notification: FeedNotification) {
    if (selectedRole === "attorney") {
      completeAttorneyNotification(notification.id);
    } else if (selectedRole === "paralegal") {
      completeParalegalNotification(notification.id);
    }
    refreshNotifications();
    if (notification.actionHref) router.push(notification.actionHref);
    setNotificationsOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick}
        className="lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden max-w-md flex-1 md:block">
        <GlobalSearch />
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
        <DemoRoleSelect onRoleChange={handleRoleChange} />

        {usesRoleFeed ? (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Notifications${
                visibleNotificationCount > 0
                  ? `, ${visibleNotificationCount} active`
                  : ""
              }`}
              aria-expanded={
                selectedRole === "attorney" || selectedRole === "paralegal"
                  ? notificationsOpen
                  : undefined
              }
              onClick={handleNotificationBell}
            >
              <Bell className="h-5 w-5 text-muted" />
              {visibleNotificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-700 ring-2 ring-white">
                  {visibleNotificationCount}
                </span>
              )}
            </Button>

            {(selectedRole === "attorney" || selectedRole === "paralegal") &&
              notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {selectedRole === "attorney"
                          ? "Attorney notifications"
                          : "Paralegal notifications"}
                      </p>
                      <p className="text-xs text-muted">
                        {feedNotifications.length} item
                        {feedNotifications.length === 1 ? "" : "s"} requiring
                        review
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                      className="rounded-lg p-1.5 text-muted transition hover:bg-gray-100 hover:text-navy-900"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {feedNotifications.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                      <Check className="mx-auto h-7 w-7 text-green-700" />
                      <p className="mt-2 text-sm font-medium text-navy-900">
                        You’re all caught up
                      </p>
                    </div>
                  ) : (
                    <ul className="max-h-[28rem] space-y-1 overflow-y-auto p-2">
                      {feedNotifications.map((notification) => {
                        const Icon = notificationIcon(notification.type);
                        return (
                          <li
                            key={notification.id}
                            className="rounded-xl border border-gray-100 px-3 py-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-navy-900">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted">
                                  {notification.message}
                                </p>
                                {notification.matterNumber && (
                                  <p className="mt-1 text-xs font-medium text-navy-700">
                                    Case # {notification.matterNumber}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    reviewFeedNotification(notification)
                                  }
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-900 hover:text-navy-700"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  {notification.actionLabel}
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
          </div>
        ) : (
          <FirmNotificationsMenu />
        )}

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-navy-900">
            {identity.fullName}
          </p>
          <p className="text-xs text-muted" suppressHydrationWarning>
            {roleDisplayLabel}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
          {identity.initials}
        </div>
      </div>
    </header>
  );
}

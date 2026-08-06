"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  Check,
  FileX2,
  Menu,
  MessageSquare,
  Send,
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
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { FirmNotificationsMenu } from "./FirmNotificationsMenu";
import { GlobalSearch } from "./GlobalSearch";
import { useDemoRole } from "./DemoRoleProvider";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
}

export function Header({ onMenuClick, className }: HeaderProps) {
  const router = useRouter();
  const { selectedRole, setSelectedRole, identity } = useDemoRole();
  const [attorneyNotifications, setAttorneyNotifications] = useState<
    AttorneyNotification[]
  >([]);
  const [clientNotificationCount, setClientNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const refreshNotifications = useCallback(() => {
    setAttorneyNotifications(getActiveAttorneyNotifications());
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

  const roleOptions = USER_ROLES.map((r) => ({
    value: r,
    label: USER_ROLE_LABELS[r],
  }));

  function handleRoleChange(newRole: UserRole) {
    setSelectedRole(newRole);

    if (newRole === "client" && getActiveNotificationCount() > 0) {
      router.push("/client-portal/upload-documents");
    }
  }

  const visibleNotificationCount =
    selectedRole === "attorney"
      ? attorneyNotifications.length
      : selectedRole === "client"
        ? clientNotificationCount
        : 0;

  function notificationIcon(type: AttorneyNotification["type"]) {
    if (type === "document_deletion") return FileX2;
    if (type === "calendar_entry" || type === "calendar_reminder") {
      return CalendarClock;
    }
    if (type === "request_fulfilled") return Send;
    return MessageSquare;
  }

  function handleNotificationBell() {
    if (selectedRole === "attorney") {
      setNotificationsOpen((current) => !current);
      return;
    }
    if (selectedRole === "client") {
      router.push("/client-portal/notifications");
    }
  }

  function reviewAttorneyNotification(notification: AttorneyNotification) {
    completeAttorneyNotification(notification.id);
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
        <div className="hidden sm:block">
          <Select
            label="Demo role"
            options={roleOptions}
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            className="min-w-[200px]"
            aria-label="Switch demonstration role"
          />
        </div>

        {selectedRole === "attorney" || selectedRole === "client" ? (
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
                selectedRole === "attorney" ? notificationsOpen : undefined
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

            {selectedRole === "attorney" && notificationsOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      Attorney notifications
                    </p>
                    <p className="text-xs text-muted">
                      {attorneyNotifications.length} item
                      {attorneyNotifications.length === 1 ? "" : "s"} requiring
                      review
                    </p>
                  </div>
                  <Bell className="h-5 w-5 text-navy-900" />
                </div>

                {attorneyNotifications.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <Check className="mx-auto h-7 w-7 text-green-700" />
                    <p className="mt-2 text-sm font-medium text-navy-900">
                      You’re all caught up
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-[28rem] space-y-1 overflow-y-auto p-2">
                    {attorneyNotifications.map((notification) => {
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
                                  reviewAttorneyNotification(notification)
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
          <p className="text-xs text-muted">{USER_ROLE_LABELS[selectedRole]}</p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-500">
          {identity.initials}
        </div>
      </div>
    </header>
  );
}

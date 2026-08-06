"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  getFirmNotifications,
  markAllFirmNotificationsRead,
  markFirmNotificationRead,
  subscribeFirmNotifications,
  type FirmNotification,
} from "@/lib/demo/firm-notifications";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export function FirmNotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<FirmNotification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((row) => !row.read).length;

  useEffect(() => {
    const refresh = () => setNotifications(getFirmNotifications());
    refresh();
    return subscribeFirmNotifications(refresh);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="relative">
          <Bell className="h-5 w-5 text-muted" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">Notifications</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                markAllFirmNotificationsRead();
                setNotifications(getFirmNotifications());
              }}
            >
              Mark all read
            </Button>
          </div>
          <ul className="max-h-96 overflow-auto">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  "border-b border-gray-100 px-4 py-3 last:border-0",
                  !notification.read && "bg-amber-50/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-navy-900">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted">{notification.module}</p>
                  </div>
                  {!notification.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-500" />
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <Link
                    href={notification.href}
                    className="text-xs font-medium text-navy-900 underline"
                    onClick={() => {
                      markFirmNotificationRead(notification.id);
                      setNotifications(getFirmNotifications());
                      setOpen(false);
                    }}
                  >
                    Open module
                  </Link>
                  {!notification.read && (
                    <button
                      type="button"
                      className="text-xs text-muted underline"
                      onClick={() => {
                        markFirmNotificationRead(notification.id);
                        setNotifications(getFirmNotifications());
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

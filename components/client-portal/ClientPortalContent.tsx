"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PortalCaseSelector } from "@/components/client-portal/PortalCaseSelector";
import {
  getActiveNotificationCount,
  NOTIFICATION_UPDATE_EVENT,
} from "@/lib/client-portal/notifications-store";
import { PageHeader } from "@/components/ui/PageHeader";
import { PORTAL_FEATURE_APPS } from "@/lib/client-portal/features";

export function ClientPortalContent() {
  const [notificationCount, setNotificationCount] = useState(0);

  const updateNotificationCount = useCallback(() => {
    setNotificationCount(getActiveNotificationCount());
  }, []);

  useEffect(() => {
    updateNotificationCount();
    window.addEventListener(NOTIFICATION_UPDATE_EVENT, updateNotificationCount);
    return () =>
      window.removeEventListener(
        NOTIFICATION_UPDATE_EVENT,
        updateNotificationCount,
      );
  }, [updateNotificationCount]);

  return (
    <>
      <PageHeader
        title="Client Portal"
        description="Open an app below to manage your account, documents, case details, and messages."
      />

      <PortalCaseSelector />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PORTAL_FEATURE_APPS.map((app) => {
          const Icon = app.icon;

          return (
            <Link
              key={app.id}
              href={app.href}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-navy-700/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2"
            >
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-500 transition-transform group-hover:scale-105">
                <Icon className="h-7 w-7" />
                {app.id === "notifications" && notificationCount > 0 && (
                  <span className="absolute -right-2.5 -top-2.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700 ring-2 ring-white">
                    {notificationCount}
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-navy-900">
                {app.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{app.description}</p>
              <span className="mt-4 text-xs font-medium text-navy-700 opacity-0 transition-opacity group-hover:opacity-100">
                Open app →
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

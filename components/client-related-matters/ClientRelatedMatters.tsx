"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, MessageSquare, Users } from "lucide-react";
import { ChangePaymentPlan } from "@/components/client-related-matters/ChangePaymentPlan";
import { Messaging } from "@/components/client-related-matters/Messaging";
import { Notifications } from "@/components/client-related-matters/Notifications";
import { Select } from "@/components/ui/Select";
import {
  CLIENT_OPTIONS,
  getMattersForClient,
} from "@/lib/client-related-matters/data";
import {
  CRM_NOTIFICATION_UPDATE_EVENT,
  getActiveNotifications,
} from "@/lib/client-related-matters/notifications-store";
import { cn } from "@/lib/utils/cn";

type SubFeature = "notifications" | "payment-plan" | "messaging";

const SUBFEATURES: Array<{
  id: SubFeature;
  label: string;
  icon: typeof Bell;
}> = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payment-plan", label: "Change payment plan", icon: CalendarClock },
  { id: "messaging", label: "Messaging", icon: MessageSquare },
];

export function ClientRelatedMatters() {
  const [clientId, setClientId] = useState("all");
  const [active, setActive] = useState<SubFeature>("notifications");
  const [notificationCount, setNotificationCount] = useState(0);

  const matters = useMemo(() => getMattersForClient(clientId), [clientId]);
  const clientFilterName = useMemo(() => {
    if (clientId === "all") return null;
    return (
      CLIENT_OPTIONS.find((c) => c.value === clientId)?.label ?? null
    );
  }, [clientId]);

  useEffect(() => {
    function refresh() {
      // Count is approximate until Notifications mounts with catalog — include dynamic rows.
      setNotificationCount(
        getActiveNotifications().filter((notification) => {
          if (!clientFilterName) return true;
          if (notification.clientName) {
            return notification.clientName === clientFilterName;
          }
          return notification.message.includes(clientFilterName);
        }).length,
      );
    }

    refresh();
    window.addEventListener(CRM_NOTIFICATION_UPDATE_EVENT, refresh);
    return () =>
      window.removeEventListener(CRM_NOTIFICATION_UPDATE_EVENT, refresh);
  }, [clientFilterName]);

  return (
    <section
      aria-labelledby="client-related-matters-heading"
      className="mx-auto mt-10 w-full max-w-[1180px] px-4 pb-12 sm:px-6"
    >
      <div className="flex flex-col gap-4 border-t border-gray-200 pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2
              id="client-related-matters-heading"
              className="text-2xl font-semibold text-navy-900"
            >
              Client Related Matters
            </h2>
            <p className="mt-1 text-sm text-muted">
              Notifications, payment plans, and secure messaging for the matters
              behind these billing numbers.
            </p>
          </div>
        </div>
        <div className="w-full sm:w-72">
          <Select
            label="Client"
            options={CLIENT_OPTIONS}
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          />
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Client related matters subfeatures"
        className="mt-6 flex flex-wrap gap-2"
      >
        {SUBFEATURES.map((subfeature) => {
          const Icon = subfeature.icon;
          const isActive = active === subfeature.id;

          return (
            <button
              key={subfeature.id}
              type="button"
              role="tab"
              id={`crm-tab-${subfeature.id}`}
              aria-selected={isActive}
              aria-controls={`crm-panel-${subfeature.id}`}
              onClick={() => setActive(subfeature.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-gray-200 bg-white text-navy-900 hover:bg-gray-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {subfeature.label}
              {subfeature.id === "notifications" && notificationCount > 0 && (
                <span
                  className={cn(
                    "ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
                    isActive
                      ? "bg-white text-navy-900"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {notificationCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`crm-panel-${active}`}
        aria-labelledby={`crm-tab-${active}`}
        className="mt-6"
      >
        {active === "notifications" && (
          <Notifications
            matters={matters}
            clientFilterName={clientFilterName}
          />
        )}
        {active === "payment-plan" && <ChangePaymentPlan matters={matters} />}
        {active === "messaging" && <Messaging matters={matters} />}
      </div>
    </section>
  );
}

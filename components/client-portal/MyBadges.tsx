"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  BADGES_UPDATE_EVENT,
  CLIENT_BADGE_CATALOG,
  evaluateClientBadges,
  getEarnedBadgeIds,
  type ClientBadgeId,
} from "@/lib/client-portal/badges";
import { cn } from "@/lib/utils/cn";

const EARNED_YELLOW = "#D4FF00";

export function MyBadges() {
  const [earnedIds, setEarnedIds] = useState<Set<ClientBadgeId>>(new Set());

  useEffect(() => {
    evaluateClientBadges();
    const refresh = () => setEarnedIds(getEarnedBadgeIds());
    refresh();
    window.addEventListener(BADGES_UPDATE_EVENT, refresh);
    return () => window.removeEventListener(BADGES_UPDATE_EVENT, refresh);
  }, []);

  const earnedCount = earnedIds.size;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Badges</CardTitle>
          <CardDescription>
            Earn badges for staying responsive, organized, and on top of your
            matter. Neon yellow means unlocked; light gray means still waiting
            for you.
          </CardDescription>
        </CardHeader>
        <p className="text-sm text-navy-900">
          {earnedCount} of {CLIENT_BADGE_CATALOG.length} badges earned
        </p>
      </Card>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CLIENT_BADGE_CATALOG.map((badge) => {
          const earned = earnedIds.has(badge.id);
          const Icon = badge.icon;

          return (
            <li key={badge.id}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-5 transition-colors",
                  earned
                    ? "border-[#D4FF00]/60 bg-[#D4FF00]/15"
                    : "border-gray-200 bg-gray-50",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                      earned ? "text-navy-950" : "text-gray-400",
                    )}
                    style={{
                      backgroundColor: earned ? EARNED_YELLOW : "#E5E7EB",
                    }}
                    aria-hidden
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          "text-base font-semibold",
                          earned ? "text-navy-900" : "text-gray-500",
                        )}
                      >
                        {badge.name}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                          earned
                            ? "bg-[#D4FF00] text-navy-950"
                            : "bg-gray-200 text-gray-500",
                        )}
                      >
                        {earned ? "Earned" : "Locked"}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        earned ? "text-navy-900" : "text-gray-400",
                      )}
                    >
                      {badge.description}
                    </p>
                    <p
                      className={cn(
                        "mt-3 text-xs",
                        earned ? "text-navy-800" : "text-gray-400",
                      )}
                    >
                      {earned ? "Unlocked by your activity." : badge.howToEarn}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

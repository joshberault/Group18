"use client";

import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { MatterCard } from "@/components/attorney/MatterCard";
import { MattersPageClient } from "./MattersPageClient";
import { getParalegalHubMatters } from "@/lib/paralegal/attorney-hub-adapter";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";

export default function AttorneyMattersPage() {
  const { role } = useDemoRole();

  if (role === "paralegal") {
    const matters = getParalegalHubMatters();

    return (
      <div>
        <PageHeader
          title="Assigned Matters"
          description="Assigned matters only. You cannot open, close, archive, or change fee arrangements."
        />

        <div className="mb-4 space-y-2">
          {PARALEGAL_ASSIGNED_MATTERS.filter(
            (m) => m.status === "on_hold" || m.conflictStatus !== "cleared",
          ).map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">{m.matterNumber}</Badge>
                <span className="font-medium">{m.title}</span>
              </div>
              <p className="mt-1">
                Conflict: {m.conflictStatus.replaceAll("_", " ")}
                {m.status === "on_hold" ? " · Matter on hold" : ""}. Report info only — do not
                clear conflicts.
              </p>
            </div>
          ))}
        </div>

        {matters.length === 0 ? (
          <EmptyState
            title="No assigned matters yet"
            description="Assigned matter data will appear here for your demo role."
          />
        ) : (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {matters.map((matter) => (
              <MatterCard key={matter.id} matter={matter} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <MattersPageClient />;
}

"use client";

import Link from "next/link";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";
import { MatterWorkspace } from "@/components/matters/MatterWorkspace";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";

export default function MattersPage() {
  const { role } = useDemoRole();

  if (role !== "paralegal" && role !== "attorney") {
    return (
      <RoleRestrictedModule
        href="/matters"
        title="Matters"
        description="Track legal matters, engagement terms, responsible attorneys, and matter lifecycle status."
        iconName="briefcase"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matters"
        description={
          role === "paralegal"
            ? "Assigned matters for paralegal support. Open/close/archive and fee changes remain restricted."
            : "Case status, documentation, requests, and secure messaging for your assigned matters."
        }
      >
        <Link href="/attorney/matters">
          <Button variant="secondary">View matter cards</Button>
        </Link>
      </PageHeader>

      {role === "paralegal" && (
        <div className="space-y-3">
          {PARALEGAL_ASSIGNED_MATTERS.map((matter) => (
            <Card key={matter.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {matter.matterNumber}
                  </p>
                  <h2 className="text-base font-semibold text-navy-900">
                    {matter.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {matter.clientName} · {matter.practiceArea} · Attorney{" "}
                    {matter.attorneyName}
                  </p>
                  <p className="mt-2 text-sm text-navy-900">
                    Scope: {matter.engagementScope}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={matter.status === "on_hold" ? "warning" : "success"}
                  >
                    {matter.status.replaceAll("_", " ")}
                  </Badge>
                  <Badge
                    variant={
                      matter.conflictStatus === "possible_conflict"
                        ? "danger"
                        : matter.conflictStatus === "cleared"
                          ? "success"
                          : "warning"
                    }
                  >
                    Conflict: {matter.conflictStatus.replaceAll("_", " ")}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/attorney/tasks">
                  <Button size="sm" variant="secondary">
                    Related tasks
                  </Button>
                </Link>
                <Link href="/attorney/dashboard?focus=reviews">
                  <Button size="sm" variant="ghost">
                    Submit for attorney review
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" disabled title="Restricted">
                  Close matter (restricted)
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MatterWorkspace />
    </div>
  );
}

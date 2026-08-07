"use client";

import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { MatterRegisterList } from "@/components/matters/MatterRegisterList";
import { PageHeader } from "@/components/ui/PageHeader";

export function MattersPageClient() {
  const { identity } = useDemoRole();

  return (
    <div>
      <PageHeader
        title="My Matters"
        description="Matters assigned to you in CounselFlow. Open a matter for tasks, documents, and case notes."
      />

      <MatterRegisterList
        title="Assigned matters"
        description="Only matters where you are on the assignment roster are shown."
        assigneeFullName={identity.fullName}
        strictAssigneeFilter
      />
    </div>
  );
}

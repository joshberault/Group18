"use client";

import Link from "next/link";
import { TimeEntryForm } from "@/components/attorney/TimeEntryForm";
import { TimeEntryList } from "@/components/attorney/TimeEntryList";
import { TimerWidget } from "@/components/attorney/TimerWidget";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAssignedAttorneyMatters } from "@/hooks/useAssignedAttorneyMatters";
import { useDemoTimeWorkflow } from "@/hooks/useDemoTimeWorkflow";
import { getDemoSubmitterContext } from "@/lib/demo/time-workflow-store";

export function TimeEntriesPageClient() {
  const { selectedRole, attorneySpecialty } = useDemoRole();
  const { matters, loading: mattersLoading } = useAssignedAttorneyMatters();
  const submitter = getDemoSubmitterContext(
    selectedRole,
    selectedRole === "attorney" ? attorneySpecialty : null,
  );
  const { timeEntries, refresh } = useDemoTimeWorkflow(submitter.profileId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time & Expenses"
        description="Start a timer or log hours manually. Billable and non-billable entries stay pending until a manager approves them."
      >
        <Link href="/attorney/expenses">
          <Button variant="secondary" size="sm">
            Reimbursable Expenses
          </Button>
        </Link>
      </PageHeader>

      <TimerWidget matters={matters} onSaved={refresh} />

      <TimeEntryForm
        matters={matters}
        mattersLoading={mattersLoading}
        submitterRole={selectedRole}
        onCreated={refresh}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your entries</h2>
        <TimeEntryList entries={timeEntries} editable onDeleted={refresh} />
      </div>
    </div>
  );
}

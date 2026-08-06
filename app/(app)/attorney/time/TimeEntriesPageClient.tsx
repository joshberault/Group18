"use client";

import Link from "next/link";
import { TimeEntryForm } from "@/components/attorney/TimeEntryForm";
import { TimeEntryList } from "@/components/attorney/TimeEntryList";
import { TimerWidget } from "@/components/attorney/TimerWidget";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useDemoTimeWorkflow } from "@/hooks/useDemoTimeWorkflow";
import { profileIdForRole } from "@/lib/demo/time-workflow-store";
import type { Matter, TimeEntry } from "@/types/database";

type Props = {
  profileId: string;
  initialMatters: Matter[];
  initialEntries: TimeEntry[];
  previewMode?: boolean;
};

export function TimeEntriesPageClient({
  profileId,
  initialMatters,
  previewMode = false,
}: Props) {
  const { selectedRole } = useDemoRole();
  const { timeEntries, profileId: storeProfileId, matters: storeMatters } = useAttorneyData();
  const activeProfileId = previewMode ? profileIdForRole(selectedRole) : storeProfileId;
  const { timeEntries: demoEntries, refresh } = useDemoTimeWorkflow(
    previewMode ? activeProfileId : undefined,
  );

  const entries = previewMode
    ? demoEntries
    : timeEntries.filter((entry) => entry.profile_id === storeProfileId);

  const formMatters = previewMode ? initialMatters : storeMatters;

  function refreshEntries() {
    if (previewMode) {
      refresh();
    }
  }

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

      {!previewMode && <TimerWidget />}

      <TimeEntryForm
        matters={formMatters}
        profileId={activeProfileId}
        submitterRole={selectedRole}
        onCreated={refreshEntries}
        previewMode={previewMode}
        useProviderStore={!previewMode}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your entries</h2>
        <TimeEntryList entries={entries} editable={!previewMode} />
      </div>
    </div>
  );
}

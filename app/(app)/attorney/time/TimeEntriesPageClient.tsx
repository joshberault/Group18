"use client";

import { TimerWidget } from "@/components/attorney/TimerWidget";
import { TimeEntryForm } from "@/components/attorney/TimeEntryForm";
import { TimeEntryList } from "@/components/attorney/TimeEntryList";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { PageHeader } from "@/components/ui/PageHeader";

export function TimeEntriesPageClient() {
  const { timeEntries, profileId } = useAttorneyData();
  const myEntries = timeEntries.filter((entry) => entry.profile_id === profileId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Entry Screen"
        description="Start a timer or log hours manually. Billable and non-billable entries stay pending until a manager approves them."
      />

      <TimerWidget />
      <TimeEntryForm />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your entries</h2>
        <TimeEntryList entries={myEntries} />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { TimeEntryForm } from "@/components/attorney/TimeEntryForm";
import { TimeEntryList } from "@/components/attorney/TimeEntryList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClientSafe } from "@/lib/supabase/client";
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
  initialEntries,
  previewMode = false,
}: Props) {
  const [entries, setEntries] = useState(initialEntries);

  async function refreshEntries() {
    const supabase = createClientSafe();
    if (!supabase) return;

    const { data } = await supabase
      .from("time_entries")
      .select(`*, matter:matters ( title )`)
      .eq("profile_id", profileId)
      .order("entry_date", { ascending: false });

    setEntries((data ?? []) as TimeEntry[]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Entries"
        description="Log billable and non-billable hours. Entries stay pending until a manager approves them."
      />

      <TimeEntryForm
        matters={initialMatters}
        profileId={profileId}
        onCreated={refreshEntries}
        previewMode={previewMode}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your entries</h2>
        <TimeEntryList entries={entries} />
      </div>
    </div>
  );
}

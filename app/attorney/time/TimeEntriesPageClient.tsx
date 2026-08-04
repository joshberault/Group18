"use client";

import { useState } from "react";
import { TimeEntryForm } from "@/components/attorney/TimeEntryForm";
import { TimeEntryList } from "@/components/attorney/TimeEntryList";
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();
    const { data } = await supabase
      .from("time_entries")
      .select(`*, matter:matters ( title )`)
      .eq("profile_id", profileId)
      .order("entry_date", { ascending: false });

    setEntries((data ?? []) as TimeEntry[]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Time Entries</h1>
        <p className="mt-1 text-slate-600">
          Log billable and non-billable hours. Entries stay pending until a manager
          approves them (Reagan&apos;s approval queue).
        </p>
      </div>

      <TimeEntryForm
        matters={initialMatters}
        profileId={profileId}
        onCreated={refreshEntries}
        previewMode={previewMode}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-700">Your entries</h2>
        <TimeEntryList entries={entries} />
      </div>
    </div>
  );
}

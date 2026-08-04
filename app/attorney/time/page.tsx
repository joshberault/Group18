import { TimeEntriesPageClient } from "./TimeEntriesPageClient";
import {
  DEMO_MATTERS,
  DEMO_TIME_ENTRIES,
  isDevPreview,
} from "@/lib/attorney/demo-data";
import { extractMatters } from "@/lib/attorney/queries";
import { createClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth/require-role";
import type { TimeEntry } from "@/types/database";

export default async function AttorneyTimePage() {
  const profile = await requireStaffRole();

  let matters = DEMO_MATTERS;
  let entries: TimeEntry[] = DEMO_TIME_ENTRIES;

  if (!isDevPreview()) {
    const supabase = await createClient();
    const [{ data: assignments }, { data: dbEntries }] = await Promise.all([
      supabase
        .from("matter_assignments")
        .select(
          `matter:matters ( id, title, description, status, billing_type, hourly_rate, fixed_fee_amount, retainer_amount, retainer_balance, expense_terms, client:clients ( id, name, email, company_name, conflict_flag ), practice_area:practice_areas ( name ) )`
        )
        .eq("profile_id", profile.id),
      supabase
        .from("time_entries")
        .select(`*, matter:matters ( title )`)
        .eq("profile_id", profile.id)
        .order("entry_date", { ascending: false }),
    ]);

    matters = extractMatters(assignments);
    entries = (dbEntries ?? []) as TimeEntry[];
  }

  return (
    <TimeEntriesPageClient
      profileId={profile.id}
      initialMatters={matters}
      initialEntries={entries}
      previewMode={isDevPreview()}
    />
  );
}

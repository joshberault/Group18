"use client";

import { TimeEntriesPageClient } from "./TimeEntriesPageClient";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import {
  DEMO_MATTERS,
  DEMO_PROFILE,
  DEMO_TIME_ENTRIES,
} from "@/lib/attorney/demo-data";
import {
  getParalegalHubMatters,
  getParalegalHubProfile,
  getParalegalHubTimeEntries,
} from "@/lib/paralegal/attorney-hub-adapter";

export default function AttorneyTimePage() {
  const { role } = useDemoRole();
  const isParalegal = role === "paralegal";

  return (
    <TimeEntriesPageClient
      profileId={isParalegal ? getParalegalHubProfile().id : DEMO_PROFILE.id}
      initialMatters={isParalegal ? getParalegalHubMatters() : DEMO_MATTERS}
      initialEntries={isParalegal ? getParalegalHubTimeEntries() : DEMO_TIME_ENTRIES}
      previewMode={isParalegal}
    />
  );
}

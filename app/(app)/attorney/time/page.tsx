"use client";

import { Suspense } from "react";
import { TimeEntriesPageClient } from "./TimeEntriesPageClient";
import { ParalegalTimeView } from "@/components/paralegal/ParalegalTimeView";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import { DEMO_MATTERS } from "@/lib/attorney/demo-data";

export default function AttorneyTimePage() {
  const { role } = useDemoRole();

  if (role === "paralegal") {
    return (
      <Suspense fallback={<LoadingState message="Loading time entries…" />}>
        <ParalegalTimeView />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingState message="Loading time entries…" />}>
      <TimeEntriesPageClient initialMatters={DEMO_MATTERS} />
    </Suspense>
  );
}

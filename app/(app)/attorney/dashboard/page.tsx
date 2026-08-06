"use client";

import { Suspense } from "react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { AttorneyDashboard } from "@/components/dashboard/AttorneyDashboard";
import { ParalegalAttorneyHub } from "@/components/paralegal/ParalegalAttorneyHub";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AttorneyDashboardPage() {
  const { role } = useDemoRole();
  if (role === "paralegal") {
    return (
      <Suspense fallback={<LoadingState message="Opening Attorney Hub…" />}>
        <ParalegalAttorneyHub />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingState message="Opening Attorney Hub…" />}>
      <AttorneyDashboard />
    </Suspense>
  );
}

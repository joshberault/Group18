"use client";

import { Suspense } from "react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { AttorneyDashboard } from "@/components/dashboard/AttorneyDashboard";
import { ParalegalAttorneyHub } from "@/components/paralegal/ParalegalAttorneyHub";

export default function AttorneyDashboardPage() {
  const { role } = useDemoRole();
  if (role === "paralegal") {
    return <ParalegalAttorneyHub />;
  }

  return (
    <Suspense fallback={null}>
      <AttorneyDashboard />
    </Suspense>
  );
}

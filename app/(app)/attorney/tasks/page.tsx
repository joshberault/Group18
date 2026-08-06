"use client";

import { Suspense } from "react";
import { TasksPageClient } from "./TasksPageClient";
import { ParalegalTasksView } from "@/components/paralegal/ParalegalTasksView";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AttorneyTasksPage() {
  const { role } = useDemoRole();

  if (role === "paralegal") {
    return (
      <Suspense fallback={<LoadingState message="Loading assigned tasks…" />}>
        <ParalegalTasksView />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingState message="Loading tasks…" />}>
      <TasksPageClient />
    </Suspense>
  );
}

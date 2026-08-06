import { Suspense } from "react";
import { TasksPageClient } from "./TasksPageClient";

export default function AttorneyTasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksPageClient />
    </Suspense>
  );
}

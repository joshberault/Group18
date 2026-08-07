"use client";

import { Suspense } from "react";
import { ExpensesPageClient } from "./ExpensesPageClient";
import { ParalegalExpensesView } from "@/components/paralegal/ParalegalExpensesView";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AttorneyExpensesPage() {
  const { role } = useDemoRole();

  if (role === "paralegal") {
    return (
      <Suspense fallback={<LoadingState message="Loading expenses…" />}>
        <ParalegalExpensesView />
      </Suspense>
    );
  }

  return (
    <ExpensesPageClient />
  );
}

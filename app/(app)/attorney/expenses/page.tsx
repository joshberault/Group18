"use client";

import { Suspense } from "react";
import { ExpensesPageClient } from "./ExpensesPageClient";
import { ParalegalExpensesView } from "@/components/paralegal/ParalegalExpensesView";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  DEMO_EXPENSES,
  DEMO_MATTERS,
  DEMO_PROFILE,
} from "@/lib/attorney/demo-data";

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
    <ExpensesPageClient
      profileId={DEMO_PROFILE.id}
      initialMatters={DEMO_MATTERS}
      initialExpenses={DEMO_EXPENSES}
      previewMode
    />
  );
}

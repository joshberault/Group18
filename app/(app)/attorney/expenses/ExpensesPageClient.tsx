"use client";

import Link from "next/link";
import { ExpenseForm } from "@/components/attorney/ExpenseForm";
import { ExpenseList } from "@/components/attorney/ExpenseList";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useDemoTimeWorkflow } from "@/hooks/useDemoTimeWorkflow";
import { getDemoSubmitterContext } from "@/lib/demo/time-workflow-store";
import type { Matter } from "@/types/database";

type Props = {
  initialMatters: Matter[];
};

export function ExpensesPageClient({ initialMatters }: Props) {
  const { selectedRole, attorneySpecialty } = useDemoRole();
  const { matters: storeMatters } = useAttorneyData();
  const submitter = getDemoSubmitterContext(
    selectedRole,
    selectedRole === "attorney" ? attorneySpecialty : null,
  );
  const { expenses, refresh } = useDemoTimeWorkflow(submitter.profileId);

  const formMatters = storeMatters.length > 0 ? storeMatters : initialMatters;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reimbursable Expenses"
        description="Submit matter expenses for manager approval."
      >
        <Link href="/attorney/time">
          <Button variant="secondary" size="sm">
            Back to Time
          </Button>
        </Link>
      </PageHeader>

      <ExpenseForm
        matters={formMatters}
        submitterRole={selectedRole}
        onCreated={refresh}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your submissions</h2>
        <ExpenseList expenses={expenses} />
      </div>
    </div>
  );
}

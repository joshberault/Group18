"use client";

import Link from "next/link";
import { ExpenseForm } from "@/components/attorney/ExpenseForm";
import { ExpenseList } from "@/components/attorney/ExpenseList";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAssignedAttorneyMatters } from "@/hooks/useAssignedAttorneyMatters";
import { useDemoTimeWorkflow } from "@/hooks/useDemoTimeWorkflow";
import { getDemoSubmitterContext } from "@/lib/demo/time-workflow-store";

export function ExpensesPageClient() {
  const { selectedRole, attorneySpecialty } = useDemoRole();
  const { matters, loading: mattersLoading } = useAssignedAttorneyMatters();
  const submitter = getDemoSubmitterContext(
    selectedRole,
    selectedRole === "attorney" ? attorneySpecialty : null,
  );
  const { expenses, refresh } = useDemoTimeWorkflow(submitter.profileId);

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
        matters={matters}
        mattersLoading={mattersLoading}
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

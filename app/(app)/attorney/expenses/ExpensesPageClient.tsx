"use client";

import Link from "next/link";
import { useState } from "react";
import { ExpenseForm } from "@/components/attorney/ExpenseForm";
import { ExpenseList } from "@/components/attorney/ExpenseList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import type { ExpenseSubmission, Matter } from "@/types/database";

type Props = {
  profileId: string;
  initialMatters: Matter[];
  initialExpenses: ExpenseSubmission[];
  previewMode?: boolean;
};

export function ExpensesPageClient({
  profileId,
  initialMatters,
  initialExpenses,
  previewMode = false,
}: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);

  function handleDemoSubmit(payload: {
    matter_id: string;
    profile_id: string;
    expense_date: string;
    amount: number;
    description: string;
  }) {
    const matter = initialMatters.find((item) => item.id === payload.matter_id);
    setExpenses((prev) => [
      {
        id: `exp-${Date.now()}`,
        matter_id: payload.matter_id,
        profile_id: payload.profile_id,
        expense_date: payload.expense_date,
        amount: payload.amount,
        description: payload.description,
        status: "pending",
        matter: { title: matter?.title ?? "Assigned matter" },
      },
      ...prev,
    ]);
  }

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
        matters={initialMatters}
        profileId={profileId}
        onCreated={() => undefined}
        previewMode={previewMode}
        onDemoSubmit={previewMode ? handleDemoSubmit : undefined}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your submissions</h2>
        <ExpenseList expenses={expenses} />
      </div>
    </div>
  );
}

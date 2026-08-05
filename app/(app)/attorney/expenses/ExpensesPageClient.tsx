"use client";

import { useState } from "react";
import { ExpenseForm } from "@/components/attorney/ExpenseForm";
import { ExpenseList } from "@/components/attorney/ExpenseList";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClientSafe } from "@/lib/supabase/client";
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

  async function refreshExpenses() {
    const supabase = createClientSafe();
    if (!supabase) return;

    const { data } = await supabase
      .from("expense_submissions")
      .select(`*, matter:matters ( title )`)
      .eq("profile_id", profileId)
      .order("expense_date", { ascending: false });

    setExpenses((data ?? []) as ExpenseSubmission[]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reimbursable Expenses"
        description="Submit matter expenses for manager approval."
      />

      <ExpenseForm
        matters={initialMatters}
        profileId={profileId}
        onCreated={refreshExpenses}
        previewMode={previewMode}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Your submissions</h2>
        <ExpenseList expenses={expenses} />
      </div>
    </div>
  );
}

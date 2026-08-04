"use client";

import { useState } from "react";
import { ExpenseForm } from "@/components/attorney/ExpenseForm";
import { ExpenseList } from "@/components/attorney/ExpenseList";
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();
    const { data } = await supabase
      .from("expense_submissions")
      .select(`*, matter:matters ( title )`)
      .eq("profile_id", profileId)
      .order("expense_date", { ascending: false });

    setExpenses((data ?? []) as ExpenseSubmission[]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-700">Reimbursable Expenses</h1>
        <p className="mt-1 text-slate-600">
          Submit matter expenses for manager approval. Josh&apos;s accounting feature can
          consume approved submissions later.
        </p>
      </div>

      <ExpenseForm
        matters={initialMatters}
        profileId={profileId}
        onCreated={refreshExpenses}
        previewMode={previewMode}
      />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-brand-700">Your submissions</h2>
        <ExpenseList expenses={expenses} />
      </div>
    </div>
  );
}

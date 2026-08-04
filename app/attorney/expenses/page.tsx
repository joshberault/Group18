import { ExpensesPageClient } from "./ExpensesPageClient";
import {
  DEMO_EXPENSES,
  DEMO_MATTERS,
  isDevPreview,
} from "@/lib/attorney/demo-data";
import { extractMatters } from "@/lib/attorney/queries";
import { createClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth/require-role";
import type { ExpenseSubmission } from "@/types/database";

export default async function AttorneyExpensesPage() {
  const profile = await requireStaffRole();

  let matters = DEMO_MATTERS;
  let expenses: ExpenseSubmission[] = DEMO_EXPENSES;

  if (!isDevPreview()) {
    const supabase = await createClient();
    const [{ data: assignments }, { data: dbExpenses }] = await Promise.all([
      supabase
        .from("matter_assignments")
        .select(
          `matter:matters ( id, title, description, status, billing_type, hourly_rate, fixed_fee_amount, retainer_amount, retainer_balance, expense_terms, client:clients ( id, name, email, company_name, conflict_flag ), practice_area:practice_areas ( name ) )`
        )
        .eq("profile_id", profile.id),
      supabase
        .from("expense_submissions")
        .select(`*, matter:matters ( title )`)
        .eq("profile_id", profile.id)
        .order("expense_date", { ascending: false }),
    ]);

    matters = extractMatters(assignments);
    expenses = (dbExpenses ?? []) as ExpenseSubmission[];
  }

  return (
    <ExpensesPageClient
      profileId={profile.id}
      initialMatters={matters}
      initialExpenses={expenses}
      previewMode={isDevPreview()}
    />
  );
}

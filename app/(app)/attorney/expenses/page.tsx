import { ExpensesPageClient } from "./ExpensesPageClient";
import {
  DEMO_EXPENSES,
  DEMO_MATTERS,
  DEMO_PROFILE,
} from "@/lib/attorney/demo-data";

export default function AttorneyExpensesPage() {
  return (
    <ExpensesPageClient
      profileId={DEMO_PROFILE.id}
      initialMatters={DEMO_MATTERS}
      initialExpenses={DEMO_EXPENSES}
      previewMode
    />
  );
}

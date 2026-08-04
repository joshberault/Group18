import { formatCurrency, formatDate, statusBadgeClass } from "@/lib/utils";
import type { ExpenseSubmission } from "@/types/database";

export function ExpenseList({ expenses }: { expenses: ExpenseSubmission[] }) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        No expenses logged yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Matter</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{formatDate(expense.expense_date)}</td>
              <td className="px-4 py-3">{expense.matter?.title ?? "—"}</td>
              <td className="px-4 py-3">{formatCurrency(expense.amount)}</td>
              <td className="px-4 py-3">{expense.description}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(expense.status)}`}>
                  {expense.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

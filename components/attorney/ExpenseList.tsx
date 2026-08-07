import { formatCurrency, formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { ExpenseSubmission } from "@/types/database";

export function ExpenseList({ expenses }: { expenses: ExpenseSubmission[] }) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses logged yet"
        description="Submit a reimbursable expense using the form above."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Requested by</TableHead>
          <TableHead>Matter</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell>{formatDate(expense.expense_date)}</TableCell>
            <TableCell>{expense.requested_by_name ?? "—"}</TableCell>
            <TableCell>{expense.matter?.title ?? "—"}</TableCell>
            <TableCell>{formatCurrency(expense.amount)}</TableCell>
            <TableCell>{expense.description}</TableCell>
            <TableCell>
              <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(expense.status)}`}>
                {expense.status}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

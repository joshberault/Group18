import type {
  ParalegalExpense,
  ParalegalTask,
  ParalegalTimeEntry,
} from "@/lib/paralegal/demo-data";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseDay(isoDate: string) {
  return startOfDay(
    new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`),
  );
}

export function filterTasksByQuery(
  tasks: ParalegalTask[],
  filter: string | null,
): ParalegalTask[] {
  const today = startOfDay(new Date());
  switch (filter) {
    case "due_today":
      return tasks.filter(
        (t) =>
          parseDay(t.dueDate).getTime() === today.getTime() &&
          t.status !== "completed",
      );
    case "overdue":
      return tasks.filter(
        (t) =>
          t.status === "overdue" ||
          (parseDay(t.dueDate) < today && t.status !== "completed"),
      );
    case "blocked":
      return tasks.filter((t) => t.status === "blocked");
    case "waiting_attorney":
      return tasks.filter((t) => t.status === "waiting_on_attorney");
    default:
      return tasks.filter((t) => t.status !== "completed");
  }
}

export function filterTimeByQuery(
  entries: ParalegalTimeEntry[],
  filter: string | null,
): ParalegalTimeEntry[] {
  switch (filter) {
    case "drafts":
      return entries.filter(
        (e) =>
          e.status === "draft" ||
          e.status === "rejected" ||
          e.description.includes("No entry"),
      );
    case "rejected":
      return entries.filter((e) => e.status === "rejected");
    default:
      return entries;
  }
}

export function filterExpensesByQuery(
  expenses: ParalegalExpense[],
  filter: string | null,
): ParalegalExpense[] {
  if (filter === "missing_receipt") {
    return expenses.filter((e) => e.receiptMissing);
  }
  return expenses;
}

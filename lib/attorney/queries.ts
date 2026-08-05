import type { Client, Matter } from "@/types/database";

type AssignmentRow = {
  matter: unknown;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeMatter(raw: unknown): Matter | null {
  if (!raw || typeof raw !== "object") return null;

  const matter = raw as Record<string, unknown>;
  const client = normalizeRelation(matter.client as Client | Client[] | null);
  const practiceArea = normalizeRelation(
    matter.practice_area as { name: string } | { name: string }[] | null
  );

  return {
    id: String(matter.id),
    title: String(matter.title),
    description: (matter.description as string | null) ?? null,
    status: matter.status as Matter["status"],
    billing_type: matter.billing_type as Matter["billing_type"],
    hourly_rate: (matter.hourly_rate as number | null) ?? null,
    fixed_fee_amount: (matter.fixed_fee_amount as number | null) ?? null,
    retainer_amount: (matter.retainer_amount as number | null) ?? null,
    retainer_balance: (matter.retainer_balance as number | null) ?? null,
    expense_terms: (matter.expense_terms as string | null) ?? null,
    client,
    practice_area: practiceArea,
  };
}

export function extractMatters(rows: AssignmentRow[] | null | undefined): Matter[] {
  return (rows ?? [])
    .map((row) => normalizeMatter(row.matter))
    .filter((matter): matter is Matter => Boolean(matter));
}

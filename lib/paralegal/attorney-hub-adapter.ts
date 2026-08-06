import type { Matter, Task, TimeEntry } from "@/types/database";
import { DEMO_PROFILE } from "@/lib/attorney/demo-data";
import {
  DEMO_PARALEGAL,
  PARALEGAL_ASSIGNED_MATTERS,
} from "@/lib/paralegal/demo-data";
import { getParalegalWorkflow } from "@/lib/paralegal/workflow-store";

/** Adapt Parker Legal demo seed into Attorney Hub component shapes. */
export function getParalegalHubMatters(): Matter[] {
  return PARALEGAL_ASSIGNED_MATTERS.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.engagementScope,
    status: m.status === "closed" ? "closed" : "open",
    billing_type: "hourly",
    hourly_rate: null,
    fixed_fee_amount: null,
    retainer_amount: null,
    retainer_balance: null,
    expense_terms:
      m.status === "on_hold" ? "Matter on hold — conflict review" : null,
    client: {
      id: m.clientId,
      name: m.clientName,
      email: null,
      company_name: m.clientName,
      conflict_flag: m.conflictStatus === "possible_conflict",
    },
    practice_area: { name: m.practiceArea },
  }));
}

export function getParalegalHubTasks(): Task[] {
  const { tasks } = getParalegalWorkflow();
  return tasks.map((t) => ({
    id: t.id,
    matter_id: t.matterId,
    title: t.title,
    description: t.notes ?? null,
    due_date: t.dueDate,
    status:
      t.status === "completed"
        ? "completed"
        : t.status === "in_progress" || t.status === "submitted_for_review"
          ? "in_progress"
          : "open",
    matter: { title: t.matterTitle },
  }));
}

export function getParalegalHubTimeEntries(): TimeEntry[] {
  const { timeEntries } = getParalegalWorkflow();
  return timeEntries
    .filter((e) => e.hours > 0)
    .map((e) => ({
      id: e.id,
      matter_id: e.matterId,
      profile_id: DEMO_PARALEGAL.id,
      entry_date: e.entryDate,
      hours: e.hours,
      description: e.description,
      is_billable: e.billable,
      status:
        e.status === "approved" || e.status === "invoiced"
          ? "approved"
          : e.status === "rejected"
            ? "rejected"
            : "pending",
      matter: { title: e.matterTitle },
    }));
}

export function getParalegalHubProfile() {
  return {
    ...DEMO_PROFILE,
    id: DEMO_PARALEGAL.id,
    full_name: DEMO_PARALEGAL.fullName,
    email: DEMO_PARALEGAL.email,
    role: "paralegal" as const,
  };
}

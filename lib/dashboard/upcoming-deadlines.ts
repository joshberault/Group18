/**
 * Upcoming deadlines for the firm dashboard.
 * Sources: Supabase tasks + deadlines (+ matters for name / client_id).
 */

import { createClientSafe } from "@/lib/supabase/client";

export type DeadlinePriority = "critical" | "high" | "medium" | "low";

export type UpcomingDeadlineRow = {
  id: string;
  matterId: string;
  matterName: string;
  clientId: string | null;
  task: string;
  dueDate: string;
  priority: DeadlinePriority;
  /** Best available navigation target for the matter */
  href: string;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDue(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function derivePriority(dueDate: string, asOf = startOfDay(new Date())): DeadlinePriority {
  const due = parseDue(dueDate);
  const days = Math.floor(
    (due.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 2) return "critical";
  if (days <= 7) return "high";
  if (days <= 14) return "medium";
  return "low";
}

function matterHref(matterId: string, clientId: string | null): string {
  if (clientId) return `/clients/${clientId}`;
  return `/matters`;
}

function unwrapMatter(raw: unknown): {
  id: string;
  title: string;
  client_id: string | null;
} | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const m = row as Record<string, unknown>;
  return {
    id: String(m.id ?? ""),
    title: String(m.title ?? "Untitled matter"),
    client_id: m.client_id != null ? String(m.client_id) : null,
  };
}

/**
 * Tasks + filing deadlines with due dates in the next 14 days (inclusive),
 * sorted by nearest due date first.
 */
export async function fetchUpcomingDeadlines(
  withinDays = 14,
): Promise<{ rows: UpcomingDeadlineRow[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      rows: [],
      error: "Supabase is not configured.",
    };
  }

  const asOf = startOfDay(new Date());
  const end = new Date(asOf);
  end.setDate(end.getDate() + withinDays);
  const startIso = toIsoDate(asOf);
  const endIso = toIsoDate(end);

  const rows: UpcomingDeadlineRow[] = [];

  try {
    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, due_date, status, matter_id, matter:matters(id, title, client_id)",
      )
      .not("due_date", "is", null)
      .gte("due_date", startIso)
      .lte("due_date", endIso)
      .neq("status", "completed")
      .order("due_date", { ascending: true });

    if (taskError) {
      // Continue with deadlines; surface soft error only if both fail
    } else {
      for (const t of taskData ?? []) {
        const due = String((t as { due_date?: string }).due_date || "");
        if (!due) continue;
        const matter = unwrapMatter((t as { matter?: unknown }).matter);
        const matterId =
          matter?.id || String((t as { matter_id?: string }).matter_id || "");
        const clientId = matter?.client_id ?? null;
        rows.push({
          id: `task-${String((t as { id: string }).id)}`,
          matterId,
          matterName: matter?.title || "Unknown matter",
          clientId,
          task: String((t as { title?: string }).title || "Task"),
          dueDate: due,
          priority: derivePriority(due, asOf),
          href: matterHref(matterId, clientId),
        });
      }
    }

    const { data: deadlineData, error: deadlineError } = await supabase
      .from("deadlines")
      .select(
        "id, title, due_date, matter_id, matter:matters(id, title, client_id)",
      )
      .gte("due_date", startIso)
      .lte("due_date", endIso)
      .order("due_date", { ascending: true });

    if (deadlineError && taskError) {
      return {
        rows: [],
        error:
          deadlineError.message ||
          taskError?.message ||
          "Could not load deadlines.",
      };
    }

    if (!deadlineError) {
      for (const d of deadlineData ?? []) {
        const due = String((d as { due_date?: string }).due_date || "");
        if (!due) continue;
        const matter = unwrapMatter((d as { matter?: unknown }).matter);
        const matterId =
          matter?.id || String((d as { matter_id?: string }).matter_id || "");
        const clientId = matter?.client_id ?? null;
        rows.push({
          id: `deadline-${String((d as { id: string }).id)}`,
          matterId,
          matterName: matter?.title || "Unknown matter",
          clientId,
          task: String((d as { title?: string }).title || "Filing deadline"),
          dueDate: due,
          priority: derivePriority(due, asOf),
          href: matterHref(matterId, clientId),
        });
      }
    }

    rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    return {
      rows,
      error:
        rows.length === 0 && (taskError || deadlineError)
          ? taskError?.message || deadlineError?.message || null
          : null,
    };
  } catch (err) {
    return {
      rows: [],
      error:
        err instanceof Error ? err.message : "Could not load upcoming deadlines.",
    };
  }
}

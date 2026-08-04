import {
  DEMO_TASKS,
  isDevPreview,
} from "@/lib/attorney/demo-data";
import { createClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth/require-role";
import { formatDate, statusBadgeClass } from "@/lib/utils";

export default async function AttorneyTasksPage() {
  const profile = await requireStaffRole();

  let tasks = DEMO_TASKS;

  if (!isDevPreview()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("tasks")
      .select(`*, matter:matters ( title )`)
      .eq("profile_id", profile.id)
      .order("due_date", { ascending: true });

    tasks = data ?? [];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-700">Tasks</h1>
      <p className="mt-1 text-slate-600">Today&apos;s work items tied to your matters.</p>

      {tasks.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          No tasks yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tasks.map((task) => (
            <article
              key={task.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-brand-700">{task.title}</h2>
                  <p className="text-sm text-slate-600">{task.matter?.title}</p>
                  {task.description && (
                    <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">Due {formatDate(task.due_date)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

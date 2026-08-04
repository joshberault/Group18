import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { DEMO_TASKS, isDevPreview } from "@/lib/attorney/demo-data";
import { createClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth/require-role";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <PageHeader title="Tasks" description="Work items tied to your assigned matters." />

      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" description="Tasks will appear here once assigned." />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-navy-900">{task.title}</h2>
                  <p className="text-sm text-muted">{task.matter?.title}</p>
                  {task.description && (
                    <p className="mt-2 text-sm text-muted">{task.description}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">Due {formatDate(task.due_date)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

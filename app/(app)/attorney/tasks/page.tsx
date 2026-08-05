import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { DEMO_TASKS } from "@/lib/attorney/demo-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AttorneyTasksPage() {
  const tasks = DEMO_TASKS;

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

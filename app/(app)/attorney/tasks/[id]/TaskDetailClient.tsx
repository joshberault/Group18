"use client";

import Link from "next/link";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";

export function TaskDetailClient({ taskId }: { taskId: string }) {
  const { getTaskById, updateTask, completeTask, deleteTask } = useAttorneyData();
  const task = getTaskById(taskId);

  if (!task) {
    return (
      <EmptyState
        title="Task not found"
        description="This task may have been removed."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.matter?.title ?? "Task detail"}
      />

      <Card padding="md" className="space-y-4">
        {task.description && <p className="text-sm text-muted">{task.description}</p>}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Due date</dt>
            <dd className="font-medium text-navy-900">{formatDate(task.due_date)}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd>
              <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}`}>
                {task.status.replace("_", " ")}
              </span>
            </dd>
          </div>
        </dl>

        <div className="max-w-xs">
          <Select
            label="Update status"
            value={task.status}
            onChange={(e) =>
              updateTask(task.id, {
                status: e.target.value as typeof task.status,
              })
            }
            options={[
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {task.status !== "completed" && (
            <Button onClick={() => completeTask(task.id)}>Mark complete</Button>
          )}
          <Link href="/attorney/tasks">
            <Button variant="secondary">Back to tasks</Button>
          </Link>
          <Button variant="ghost" className="text-red-600" onClick={() => deleteTask(task.id)}>
            Delete task
          </Button>
        </div>
      </Card>
    </div>
  );
}

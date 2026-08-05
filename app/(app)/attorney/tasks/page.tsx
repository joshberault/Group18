"use client";

import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { DEMO_TASKS } from "@/lib/attorney/demo-data";
import { getParalegalHubTasks } from "@/lib/paralegal/attorney-hub-adapter";
import { PARALEGAL_TASKS } from "@/lib/paralegal/demo-data";
import { TASK_STATUS_LABELS } from "@/lib/paralegal/metrics";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AttorneyTasksPage() {
  const { role } = useDemoRole();
  const isParalegal = role === "paralegal";
  const tasks = isParalegal ? getParalegalHubTasks() : DEMO_TASKS;

  return (
    <div>
      <PageHeader
        title="Tasks & Deadlines"
        description={
          isParalegal
            ? "Assigned task work for Parker Legal. Mark your portion complete; attorney approval remains separate when required."
            : "Work items tied to your assigned matters."
        }
      />

      {isParalegal && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge variant="neutral">Filter: My assigned work</Badge>
          <Badge variant="danger">
            Overdue {PARALEGAL_TASKS.filter((t) => t.status === "overdue").length}
          </Badge>
          <Badge variant="warning">
            Blocked {PARALEGAL_TASKS.filter((t) => t.status === "blocked").length}
          </Badge>
          <Badge variant="gold">
            Waiting on attorney{" "}
            {PARALEGAL_TASKS.filter((t) => t.status === "waiting_on_attorney").length}
          </Badge>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" description="Tasks will appear here once assigned." />
      ) : (
        <div className="space-y-3">
          {(isParalegal ? PARALEGAL_TASKS : null)?.map((task) => (
            <Card key={task.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-navy-900">{task.title}</h2>
                  <p className="text-sm text-muted">
                    {task.clientName} · {task.matterTitle} · {task.attorneyName}
                  </p>
                  {task.notes && <p className="mt-2 text-sm text-muted">{task.notes}</p>}
                  {task.requiresAttorneyApproval && (
                    <p className="mt-2 text-xs font-medium text-amber-800">
                      Work completed ≠ Attorney approved
                    </p>
                  )}
                </div>
                <Badge variant="neutral">{TASK_STATUS_LABELS[task.status]}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">Due {task.dueDate}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary">
                    Update Status
                  </Button>
                  <Button size="sm" variant="ghost">
                    Add Note
                  </Button>
                  <Button size="sm" variant="ghost">
                    Submit for Review
                  </Button>
                </div>
              </div>
            </Card>
          )) ??
            tasks.map((task) => (
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

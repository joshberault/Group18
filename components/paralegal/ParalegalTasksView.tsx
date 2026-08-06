"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { AttorneyCalendar } from "@/components/attorney/AttorneyCalendar";
import { useParalegalWorkflow } from "@/hooks/useParalegalWorkflow";
import { PARALEGAL_DEADLINES } from "@/lib/paralegal/demo-data";
import type { ParalegalTaskStatus } from "@/lib/paralegal/demo-data";
import {
  DEADLINE_TYPE_LABELS,
  dueLabel,
  TASK_STATUS_LABELS,
} from "@/lib/paralegal/metrics";
import { filterTasksByQuery } from "@/lib/paralegal/filters";
import {
  submitTaskForReview,
  updateParalegalTask,
} from "@/lib/paralegal/workflow-store";

const STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function ParalegalTasksView() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const taskFocus = searchParams.get("task");
  const { tasks, refresh } = useParalegalWorkflow();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showDeadlines = filter === "deadlines_7";
  const filteredTasks = useMemo(
    () => (showDeadlines ? [] : filterTasksByQuery(tasks, filter)),
    [tasks, filter, showDeadlines],
  );

  const upcomingDeadlines = useMemo(() => {
    const today = Date.now();
    return PARALEGAL_DEADLINES.filter((d) => {
      const days =
        (new Date(d.dueAt).getTime() - today) / 86400000;
      return days >= -1 && days <= 7;
    }).sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    );
  }, []);

  useEffect(() => {
    if (!taskFocus) return;
    const el = document.getElementById(`task-${taskFocus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [taskFocus, filteredTasks]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tasks & Deadlines"
        description="Assigned task work for Parker Legal. Work completed is separate from attorney approval."
      />

      <AttorneyCalendar />

      {(filter || showDeadlines) && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold">
            Active filter: {showDeadlines ? "deadlines_7" : filter}
          </Badge>
          <Link href="/attorney/tasks">
            <Button size="sm" variant="ghost">
              Clear filter
            </Button>
          </Link>
        </div>
      )}

      {(showDeadlines || !filter) && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">
            Upcoming deadlines
          </h2>
          {upcomingDeadlines.map((d) => (
            <Card key={d.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {DEADLINE_TYPE_LABELS[d.type]}
                  </p>
                  <h3 className="font-semibold text-navy-900">{d.label}</h3>
                  <p className="text-sm text-muted">
                    {d.clientName} · {d.matterTitle} · {d.attorneyName}
                  </p>
                  <p className="mt-1 text-sm text-navy-900">{d.requiredAction}</p>
                </div>
                <Badge variant="warning">{dueLabel(d.dueAt)}</Badge>
              </div>
            </Card>
          ))}
        </section>
      )}

      {!showDeadlines && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-navy-900">
            Assigned tasks ({filteredTasks.length})
          </h2>
          {filteredTasks.map((task) => {
            const conflictBlocked =
              task.status === "blocked" &&
              task.notes?.toLowerCase().includes("conflict");
            return (
              <div key={task.id} id={`task-${task.id}`}>
              <Card
                padding="md"
                className={
                  taskFocus === task.id ? "ring-2 ring-navy-700" : undefined
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-navy-900">{task.title}</h3>
                    <p className="text-sm text-muted">
                      {task.clientName} · {task.matterTitle} · {task.attorneyName}
                    </p>
                    {task.notes && (
                      <p className="mt-2 text-sm text-muted">{task.notes}</p>
                    )}
                    {task.requiresAttorneyApproval && (
                      <p className="mt-2 text-xs font-medium text-amber-800">
                        Work completed ≠ Attorney approved
                      </p>
                    )}
                    {conflictBlocked && (
                      <p className="mt-2 text-xs font-medium text-red-800">
                        Conflict restriction — do not clear conflicts or expand
                        substantive work.
                      </p>
                    )}
                  </div>
                  <Badge variant="neutral">
                    {TASK_STATUS_LABELS[task.status]}
                  </Badge>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Select
                    label="Update status"
                    value={task.status}
                    onChange={(e) => {
                      const next = e.target.value as ParalegalTaskStatus;
                      if (
                        next === "completed" &&
                        task.requiresAttorneyApproval
                      ) {
                        updateParalegalTask(task.id, {
                          status: "submitted_for_review",
                          notes: `${task.notes ?? "Paralegal work finished"} · Awaiting attorney approval`,
                        });
                        submitTaskForReview(task.id);
                        refresh();
                        setToast(
                          "Marked work complete and submitted for attorney review (not final approval).",
                        );
                        return;
                      }
                      updateParalegalTask(task.id, { status: next });
                      refresh();
                      setToast(`Status updated to ${TASK_STATUS_LABELS[next]}.`);
                    }}
                    options={STATUS_OPTIONS}
                  />
                  <div>
                    <Textarea
                      label="Add note"
                      value={noteDrafts[task.id] ?? ""}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => {
                        const note = noteDrafts[task.id]?.trim();
                        if (!note) return;
                        updateParalegalTask(task.id, {
                          notes: task.notes ? `${task.notes} · ${note}` : note,
                        });
                        setNoteDrafts((prev) => ({ ...prev, [task.id]: "" }));
                        refresh();
                        setToast("Task note saved.");
                      }}
                    >
                      Save note
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted">
                    Due {task.dueDate} · {dueLabel(task.dueDate)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/matters`}>
                      <Button size="sm" variant="ghost">
                        Open related matter
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={conflictBlocked}
                      onClick={() => {
                        submitTaskForReview(task.id);
                        refresh();
                        setToast("Submitted for attorney review.");
                      }}
                    >
                      Submit for Review
                    </Button>
                  </div>
                </div>
              </Card>
              </div>
            );
          })}
        </section>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

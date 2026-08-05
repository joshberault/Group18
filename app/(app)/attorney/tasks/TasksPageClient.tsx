"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { todayIsoDate, isPastDate } from "@/lib/attorney/dates";
import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Tab = "today" | "all" | "deadlines";

export function TasksPageClient() {
  const { tasks, deadlines, matters, profileId, addTask, addDeadline, completeTask } =
    useAttorneyData();
  const [tab, setTab] = useState<Tab>("today");
  const today = todayIsoDate();

  const myTasks = useMemo(
    () => tasks.filter((task) => !task.profile_id || task.profile_id === profileId),
    [tasks, profileId],
  );

  const todaysTasks = myTasks.filter(
    (task) => task.status !== "completed" && task.due_date && task.due_date <= today,
  );

  const [taskForm, setTaskForm] = useState({
    matterId: matters[0]?.id ?? "",
    title: "",
    description: "",
    dueDate: today,
  });

  const [deadlineForm, setDeadlineForm] = useState({
    matterId: matters[0]?.id ?? "",
    title: "",
    description: "",
    dueDate: today,
  });

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    addTask({
      matter_id: taskForm.matterId,
      profile_id: profileId,
      title: taskForm.title,
      description: taskForm.description || null,
      due_date: taskForm.dueDate,
      status: "open",
    });
    setTaskForm((prev) => ({ ...prev, title: "", description: "" }));
  }

  function handleAddDeadline(e: React.FormEvent) {
    e.preventDefault();
    addDeadline({
      matter_id: deadlineForm.matterId,
      title: deadlineForm.title,
      description: deadlineForm.description || null,
      due_date: deadlineForm.dueDate,
    });
    setDeadlineForm((prev) => ({ ...prev, title: "", description: "" }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks & Deadlines"
        description="Track daily work, completion status, and filing deadlines."
      />

      <div className="flex flex-wrap gap-2">
        {([
          ["today", "Today's Tasks"],
          ["all", "All Tasks"],
          ["deadlines", "Deadlines"],
        ] as const).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "today" && (
        <section className="space-y-3">
          {todaysTasks.length === 0 ? (
            <EmptyState title="Nothing due today" description="You're caught up for today." />
          ) : (
            todaysTasks.map((task) => (
              <Card key={task.id} padding="md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link href={`/attorney/tasks/${task.id}`} className="text-lg font-semibold text-navy-900 hover:underline">
                      {task.title}
                    </Link>
                    <p className="text-sm text-muted">{task.matter?.title}</p>
                    <p className="mt-2 text-sm text-muted">Due {formatDate(task.due_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}`}>
                      {task.status.replace("_", " ")}
                    </span>
                    {task.status !== "completed" && (
                      <Button size="sm" onClick={() => completeTask(task.id)}>
                        Mark complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </section>
      )}

      {tab === "all" && (
        <section className="space-y-6">
          <Card padding="md">
            <h2 className="mb-4 text-lg font-semibold text-navy-900">Add Task</h2>
            <form onSubmit={handleAddTask} className="grid gap-4 md:grid-cols-2">
              <Select
                label="Matter"
                value={taskForm.matterId}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, matterId: e.target.value }))}
                options={matters.map((m) => ({ value: m.id, label: m.title }))}
              />
              <Input
                label="Due date"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
              <Input
                label="Title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                className="md:col-span-2"
                required
              />
              <Textarea
                label="Description"
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                className="md:col-span-2"
              />
              <Button type="submit">Create Task</Button>
            </form>
          </Card>

          <div className="space-y-3">
            {myTasks.map((task) => (
              <Card key={task.id} padding="md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link href={`/attorney/tasks/${task.id}`} className="font-semibold text-navy-900 hover:underline">
                      {task.title}
                    </Link>
                    <p className="text-sm text-muted">{task.matter?.title}</p>
                    <p className="mt-2 text-sm text-muted">Due {formatDate(task.due_date)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {tab === "deadlines" && (
        <section className="space-y-6">
          <Card padding="md">
            <h2 className="mb-4 text-lg font-semibold text-navy-900">Add Deadline</h2>
            <form onSubmit={handleAddDeadline} className="grid gap-4 md:grid-cols-2">
              <Select
                label="Matter"
                value={deadlineForm.matterId}
                onChange={(e) => setDeadlineForm((prev) => ({ ...prev, matterId: e.target.value }))}
                options={matters.map((m) => ({ value: m.id, label: m.title }))}
              />
              <Input
                label="Due date"
                type="date"
                value={deadlineForm.dueDate}
                onChange={(e) => setDeadlineForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
              <Input
                label="Title"
                value={deadlineForm.title}
                onChange={(e) => setDeadlineForm((prev) => ({ ...prev, title: e.target.value }))}
                className="md:col-span-2"
                required
              />
              <Textarea
                label="Description"
                value={deadlineForm.description}
                onChange={(e) => setDeadlineForm((prev) => ({ ...prev, description: e.target.value }))}
                className="md:col-span-2"
              />
              <Button type="submit">Create Deadline</Button>
            </form>
          </Card>

          <div className="space-y-3">
            {deadlines.map((deadline) => (
              <Card key={deadline.id} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/attorney/deadlines/${deadline.id}`}
                    className="min-w-0 flex-1 rounded-md px-2 py-1 -mx-2 transition hover:bg-gray-50"
                  >
                    <h3 className="font-semibold text-navy-900">{deadline.title}</h3>
                    <p className="text-sm text-muted">{deadline.matter?.title}</p>
                    {deadline.description && (
                      <p className="mt-2 text-sm text-muted">{deadline.description}</p>
                    )}
                  </Link>
                  <Link
                    href={`/attorney/calendar?date=${deadline.due_date}`}
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium transition hover:opacity-80 ${
                      isPastDate(deadline.due_date)
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    Due {formatDate(deadline.due_date)}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

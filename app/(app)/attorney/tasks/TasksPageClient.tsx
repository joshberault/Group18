"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPageClient } from "@/app/(app)/attorney/calendar/CalendarPageClient";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { todayIsoDate, isPastDate, isDueSoon } from "@/lib/attorney/dates";
import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Tab = "today" | "all" | "deadlines";
type ListFilter = "overdue" | "deadlines_7" | "waiting_on_attorney" | null;
type MpView = "list" | "calendar";

function parseTab(value: string | null, filter: ListFilter): Tab {
  if (filter === "deadlines_7") return "deadlines";
  if (value === "all" || value === "deadlines") return value;
  if (filter === "overdue" || filter === "waiting_on_attorney") return "all";
  return "today";
}

function parseFilter(value: string | null): ListFilter {
  if (
    value === "overdue" ||
    value === "deadlines_7" ||
    value === "waiting_on_attorney"
  ) {
    return value;
  }
  return null;
}

function parseMpView(value: string | null): MpView {
  return value === "calendar" ? "calendar" : "list";
}

const FILTER_LABELS: Record<NonNullable<ListFilter>, string> = {
  overdue: "Overdue tasks",
  deadlines_7: "Deadlines within 7 days",
  waiting_on_attorney: "Tasks needing your input",
};

export function TasksPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRole } = useDemoRole();
  const isManagingPartner = selectedRole === "managing_partner";
  const mpView = parseMpView(searchParams.get("view"));
  const matterFilter = searchParams.get("matter");
  const listFilter = parseFilter(searchParams.get("filter"));
  const { tasks, deadlines, matters, profileId, addTask, addDeadline, completeTask } =
    useAttorneyData();
  const [tab, setTab] = useState<Tab>(() =>
    parseTab(searchParams.get("tab"), listFilter),
  );
  const today = todayIsoDate();

  const myTasks = useMemo(
    () => tasks.filter((task) => !task.profile_id || task.profile_id === profileId),
    [tasks, profileId],
  );

  const filteredTasks = useMemo(() => {
    if (!matterFilter) return myTasks;
    return myTasks.filter((task) => task.matter_id === matterFilter);
  }, [matterFilter, myTasks]);

  const filteredDeadlines = useMemo(() => {
    if (!matterFilter) return deadlines;
    return deadlines.filter((deadline) => deadline.matter_id === matterFilter);
  }, [deadlines, matterFilter]);

  const matterFilterLabel = matterFilter
    ? matters.find((matter) => matter.id === matterFilter)?.title
    : null;

  const activeFilterLabel = listFilter ? FILTER_LABELS[listFilter] : null;

  const filteredByList = useMemo(() => {
    let taskList = filteredTasks.filter((task) => task.status !== "completed");
    let deadlineList = [...filteredDeadlines];

    if (listFilter === "overdue") {
      taskList = taskList.filter((task) => task.due_date && isPastDate(task.due_date));
    }
    if (listFilter === "waiting_on_attorney") {
      taskList = taskList.filter((task) => task.status === "in_progress");
    }
    if (listFilter === "deadlines_7") {
      deadlineList = deadlineList.filter((deadline) => isDueSoon(deadline.due_date, 7));
    }

    return { taskList, deadlineList };
  }, [filteredDeadlines, filteredTasks, listFilter]);

  const todaysTasks = filteredByList.taskList.filter(
    (task) => task.due_date && task.due_date <= today,
  );

  function updateTasksUrl(nextTab: Tab, clearFilters = false) {
    setTab(nextTab);
    const params = new URLSearchParams();
    if (isManagingPartner) params.set("view", "list");
    params.set("tab", nextTab);
    if (matterFilter) params.set("matter", matterFilter);
    if (!clearFilters && listFilter) params.set("filter", listFilter);
    router.replace(`/attorney/tasks?${params.toString()}`);
  }

  function setMpView(next: MpView) {
    const params = new URLSearchParams();
    params.set("view", next);
    if (next === "list") {
      params.set("tab", tab);
      if (listFilter) params.set("filter", listFilter);
    }
    if (matterFilter) params.set("matter", matterFilter);
    const date = searchParams.get("date");
    if (next === "calendar" && date) params.set("date", date);
    router.replace(`/attorney/tasks?${params.toString()}`);
  }

  function clearListFilter() {
    const params = new URLSearchParams();
    if (isManagingPartner) params.set("view", "list");
    params.set("tab", tab);
    if (matterFilter) params.set("matter", matterFilter);
    router.replace(`/attorney/tasks?${params.toString()}`);
  }

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

      {isManagingPartner ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mpView === "list" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMpView("list")}
          >
            List
          </Button>
          <Button
            variant={mpView === "calendar" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMpView("calendar")}
          >
            Calendar
          </Button>
        </div>
      ) : null}

      {isManagingPartner && mpView === "calendar" ? (
        <CalendarPageClient embedded dateQueryBase="tasks" />
      ) : (
        <>
      {matterFilterLabel && (
        <Card padding="md" className="border-gold-500/30 bg-gold-50/40">
          <p className="text-sm text-navy-900">
            Showing work for <span className="font-semibold">{matterFilterLabel}</span>.
          </p>
          <Link href="/attorney/tasks?tab=all" className="mt-2 inline-block text-sm font-medium text-navy-900 hover:underline">
            Clear matter filter
          </Link>
        </Card>
      )}

      {activeFilterLabel && (
        <Card padding="md" className="border-gold-500/30 bg-gold-50/40">
          <p className="text-sm text-navy-900">
            Showing <span className="font-semibold">{activeFilterLabel}</span>.
          </p>
          <button
            type="button"
            onClick={clearListFilter}
            className="mt-2 text-sm font-medium text-navy-900 hover:underline"
          >
            Clear filter
          </button>
        </Card>
      )}

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
            onClick={() => updateTasksUrl(key, true)}
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
            {(listFilter && listFilter !== "deadlines_7"
              ? filteredByList.taskList
              : filteredTasks
            ).map((task) => (
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
            {filteredByList.deadlineList.map((deadline) => (
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
                    href={
                      isManagingPartner
                        ? `/attorney/tasks?view=calendar&date=${deadline.due_date}`
                        : `/attorney/calendar?date=${deadline.due_date}`
                    }
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
        </>
      )}
    </div>
  );
}

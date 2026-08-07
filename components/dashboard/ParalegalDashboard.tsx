"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckSquare,
  Clock,
  Flag,
  ListTodo,
  PauseCircle,
  Plus,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  DEMO_PARALEGAL,
  PARALEGAL_ALERTS,
  PARALEGAL_ASSIGNED_MATTERS,
  type ParalegalTask,
} from "@/lib/paralegal/demo-data";
import { useParalegalWorkflow } from "@/hooks/useParalegalWorkflow";
import {
  DEADLINE_TYPE_LABELS,
  dueLabel,
  daysUntil,
  getParalegalSummaryCounts,
  getPriorityQueue,
  getReviewQueue,
  getTimeExpenseReminders,
  getUpcomingDeadlines,
  REVIEW_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/paralegal/metrics";

type FilterState = {
  attorney: string;
  matter: string;
  client: string;
  priority: string;
  dueRange: string;
};

const DEFAULT_FILTERS: FilterState = {
  attorney: "all",
  matter: "all",
  client: "all",
  priority: "all",
  dueRange: "all",
};

function matchesFilters(task: ParalegalTask, filters: FilterState) {
  if (filters.attorney !== "all" && task.attorneyName !== filters.attorney) return false;
  if (filters.matter !== "all" && task.matterId !== filters.matter) return false;
  if (filters.client !== "all" && task.clientId !== filters.client) return false;
  if (filters.priority !== "all" && task.priority !== filters.priority) return false;
  if (filters.dueRange !== "all") {
    const days = daysUntil(task.dueDate);
    if (filters.dueRange === "overdue" && days >= 0) return false;
    if (filters.dueRange === "today" && days !== 0) return false;
    if (filters.dueRange === "7" && (days < 0 || days > 7)) return false;
    if (filters.dueRange === "30" && (days < 0 || days > 30)) return false;
  }
  return true;
}

function urgencyBadge(iso: string) {
  const label = dueLabel(iso);
  const days = daysUntil(iso);
  const variant =
    days < 0 ? "danger" : days === 0 ? "warning" : days <= 3 ? "gold" : "neutral";
  return <Badge variant={variant as "danger" | "warning" | "gold" | "neutral"}>{label}</Badge>;
}

export function ParalegalDashboard() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const workflow = useParalegalWorkflow();
  const workflowSnapshot = useMemo(
    () => ({
      tasks: workflow.tasks,
      reviews: workflow.reviews,
      timeEntries: workflow.timeEntries,
      expenses: workflow.expenses,
    }),
    [workflow.tasks, workflow.reviews, workflow.timeEntries, workflow.expenses],
  );
  const counts = getParalegalSummaryCounts(workflowSnapshot);
  const updatedAt = useMemo(
    () => new Date().toLocaleString(),
    [workflowSnapshot],
  );

  const attorneys = useMemo(
    () => [...new Set(PARALEGAL_ASSIGNED_MATTERS.map((m) => m.attorneyName))],
    [],
  );
  const clients = useMemo(
    () => [...new Set(PARALEGAL_ASSIGNED_MATTERS.map((m) => m.clientName))],
    [],
  );

  const priorityQueue = useMemo(
    () =>
      getPriorityQueue(workflowSnapshot).filter((t) =>
        matchesFilters(t, filters),
      ),
    [filters, workflowSnapshot],
  );
  const deadlines = getUpcomingDeadlines();
  const reviews = getReviewQueue(workflowSnapshot).filter(
    (r) => r.status !== "approved",
  );
  const timeReminders = getTimeExpenseReminders(workflowSnapshot);

  const summaryCards = [
    {
      title: "Tasks Due Today",
      value: counts.tasksDueToday,
      href: "/attorney/tasks?filter=due_today",
      icon: CheckSquare,
    },
    {
      title: "Overdue Tasks",
      value: counts.overdueTasks,
      href: "/attorney/tasks?filter=overdue",
      icon: AlertTriangle,
    },
    {
      title: "Deadlines Within 7 Days",
      value: counts.deadlinesWithin7,
      href: "/attorney/tasks?filter=deadlines_7",
      icon: Flag,
    },
    {
      title: "Waiting on Attorney",
      value: counts.waitingOnAttorney,
      href: "/attorney/tasks?filter=waiting_attorney",
      icon: PauseCircle,
    },
    {
      title: "Missing or Draft Time",
      value: counts.draftOrMissingTime,
      href: "/attorney/time?filter=drafts",
      icon: Clock,
    },
    {
      title: "Blocked Tasks",
      value: counts.blockedTasks,
      href: "/attorney/tasks?filter=blocked",
      icon: ListTodo,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Paralegal view — Manage assigned tasks, upcoming deadlines, attorney reviews, and time-entry responsibilities.`}
      >
        <div className="text-right text-xs text-muted">
          <p className="font-medium text-navy-900">{DEMO_PARALEGAL.fullName}</p>
          <p>Last updated {updatedAt}</p>
        </div>
      </PageHeader>

      <Card className="border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">Paralegal daily action center</p>
          <p className="mt-2 max-w-3xl text-sm text-gray-200">
            Focused on Parker Legal&apos;s assigned clients and matters. Use summary cards
            and queues below to jump into Tasks, Time, Clients, or Attorney Hub — without
            duplicating those modules here.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Only activities permitted for the Paralegal role.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link href="/attorney/time?action=add">
            <Button>
              <Plus className="h-4 w-4" /> Add Time Entry
            </Button>
          </Link>
          <Link href="/attorney/expenses?action=add">
            <Button variant="secondary">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </Link>
          <Link href="/attorney/tasks">
            <Button variant="secondary">
              <ListTodo className="h-4 w-4" /> View My Tasks
            </Button>
          </Link>
          <Link href="/attorney/tasks?filter=deadlines_7">
            <Button variant="secondary">
              <Flag className="h-4 w-4" /> View Upcoming Deadlines
            </Button>
          </Link>
          <Link href="/attorney/dashboard?focus=reviews">
            <Button variant="secondary">
              <Send className="h-4 w-4" /> Request Attorney Review
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <Link key={card.title} href={card.href} className="block transition hover:opacity-95">
            <KPICard
              title={card.title}
              value={String(card.value)}
              icon={card.icon}
              subtitle="Open filtered work in the related module"
            />
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard filters</CardTitle>
          <CardDescription>
            Defaults to {DEMO_PARALEGAL.fullName}&apos;s assigned work only (not firm-wide).
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Select
            label="Assigned attorney"
            value={filters.attorney}
            onChange={(e) => setFilters((f) => ({ ...f, attorney: e.target.value }))}
            options={[
              { value: "all", label: "All assigned attorneys" },
              ...attorneys.map((a) => ({ value: a, label: a })),
            ]}
          />
          <Select
            label="Matter"
            value={filters.matter}
            onChange={(e) => setFilters((f) => ({ ...f, matter: e.target.value }))}
            options={[
              { value: "all", label: "All assigned matters" },
              ...PARALEGAL_ASSIGNED_MATTERS.map((m) => ({
                value: m.id,
                label: m.title,
              })),
            ]}
          />
          <Select
            label="Client"
            value={filters.client}
            onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
            options={[
              { value: "all", label: "All assigned clients" },
              ...clients.map((c) => {
                const id =
                  PARALEGAL_ASSIGNED_MATTERS.find((m) => m.clientName === c)?.clientId ?? c;
                return { value: id, label: c };
              }),
            ]}
          />
          <Select
            label="Priority"
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            options={[
              { value: "all", label: "All priorities" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <Select
            label="Due-date range"
            value={filters.dueRange}
            onChange={(e) => setFilters((f) => ({ ...f, dueRange: e.target.value }))}
            options={[
              { value: "all", label: "Any due date" },
              { value: "overdue", label: "Overdue" },
              { value: "today", label: "Due today" },
              { value: "7", label: "Next 7 days" },
              { value: "30", label: "Next 30 days" },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-navy-900">Priority Work Queue</h2>
          <p className="mt-1 text-sm text-muted">
            Overdue and near-term assigned work. Completing work is not the same as attorney approval.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Matter</TableHead>
              <TableHead>Assigned Attorney</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priorityQueue.length === 0 ? (
              <TableRow>
                <TableCell className="px-4 py-8 text-muted">
                  No priority items match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              priorityQueue.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <StatusBadge status={task.priority} />
                  </TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{task.clientName}</TableCell>
                  <TableCell>{task.matterTitle}</TableCell>
                  <TableCell>{task.attorneyName}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div>{task.dueDate}</div>
                      {urgencyBadge(task.dueDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{TASK_STATUS_LABELS[task.status]}</Badge>
                    {task.requiresAttorneyApproval && (
                      <p className="mt-1 text-[11px] text-muted">Needs attorney approval</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Link href={`/attorney/tasks?task=${task.id}`}>
                        <Button size="sm" variant="secondary">
                          View Task
                        </Button>
                      </Link>
                      <Link href="/attorney/dashboard?focus=reviews">
                        <Button size="sm" variant="ghost">
                          Submit for Review
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Structured dates for assigned matters — not buried in notes.</CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {deadlines.map((d) => (
              <li
                key={d.id}
                className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-navy-900">
                    {DEADLINE_TYPE_LABELS[d.type]}: {d.label}
                  </p>
                  {urgencyBadge(d.dueAt)}
                </div>
                <p className="mt-1 text-muted">
                  {d.clientName} · {d.matterTitle}
                </p>
                <p className="mt-1 text-xs text-muted">Attorney: {d.attorneyName}</p>
                <p className="mt-2 text-navy-900">Required action: {d.requiredAction}</p>
                <Link
                  href="/attorney/tasks?filter=deadlines_7"
                  className="mt-2 inline-block text-xs font-medium text-navy-800 underline"
                >
                  Open Tasks &amp; Deadlines
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attorney Review Queue</CardTitle>
            <CardDescription>
              Structured review requests tied to clients/matters — not general chat.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {reviews.map((r) => {
              const waitingDays = Math.max(0, -daysUntil(r.submittedAt));
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-navy-900">{r.title}</p>
                    <Badge
                      variant={
                        r.status === "returned_for_revision"
                          ? "danger"
                          : r.urgent
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {REVIEW_STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted">
                    {r.clientName} · {r.matterTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    To {r.attorneyName} · Submitted {r.submittedAt}
                    {waitingDays > 2 ? ` · Waiting ${waitingDays} days` : null}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href="/attorney/dashboard?focus=reviews">
                      <Button size="sm" variant="secondary">
                        Open Attorney Hub
                      </Button>
                    </Link>
                    {r.status === "returned_for_revision" && (
                      <Link href={`/attorney/tasks?task=${r.relatedTaskId ?? ""}`}>
                        <Button size="sm" variant="ghost">
                          Resubmit Revision
                        </Button>
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time &amp; Expense Reminders</CardTitle>
            <CardDescription>
              You can enter time and expenses; you cannot approve your own entries or edit invoiced time.
            </CardDescription>
          </CardHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Time entered today</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.hoursToday.toFixed(1)} hrs
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Draft entries</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.drafts.length}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Rejected entries</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.rejected.length}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Expenses missing receipts</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.expensesMissingReceipt.length}
              </dd>
            </div>
          </dl>
          {timeReminders.rejected[0] && (
            <p className="mt-3 text-sm text-red-800">
              Latest rejection: {timeReminders.rejected[0].rejectionReason}
            </p>
          )}
          {timeReminders.billingCutoff && (
            <p className="mt-2 text-sm text-muted">
              Billing cutoff: {dueLabel(timeReminders.billingCutoff.dueAt)} —{" "}
              {timeReminders.billingCutoff.requiredAction}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/attorney/time?action=add">
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add Time Entry
              </Button>
            </Link>
            <Link href="/attorney/expenses?action=add">
              <Button size="sm" variant="secondary">
                Add Expense
              </Button>
            </Link>
            <Link href="/attorney/time?filter=drafts">
              <Button size="sm" variant="ghost">
                Review Draft Entries
              </Button>
            </Link>
            <Link href="/attorney/time?filter=rejected">
              <Button size="sm" variant="ghost">
                Correct Rejected Entries
              </Button>
            </Link>
            <Link href="/attorney/expenses?filter=missing_receipt">
              <Button size="sm" variant="ghost">
                Expenses missing receipts
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client &amp; Matter Alerts</CardTitle>
            <CardDescription>
              Operational and risk warnings. Paralegal can report issues — not clear conflicts or change engagement terms.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {PARALEGAL_ALERTS.map((alert) => (
              <li key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
                <p className="font-medium text-navy-900">{alert.title}</p>
                <p className="mt-1 text-amber-950">{alert.detail}</p>
                <p className="mt-2 text-xs text-muted">Next: {alert.recommendedAction}</p>
                <Link href={alert.href} className="mt-2 inline-block">
                  <Button size="sm" variant="secondary">
                    Open related module
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

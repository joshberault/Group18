"use client";

import Link from "next/link";
import { Briefcase, Calendar, Clock, ListTodo, StickyNote } from "lucide-react";
import { useAttorneyData, useTodaysTasks } from "@/components/attorney/AttorneyDataProvider";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { hoursByAttorney, hoursByMatter } from "@/lib/attorney/calculations";
import { isPastDate } from "@/lib/attorney/dates";
import { formatDate, statusBadgeClass } from "@/lib/attorney/format";
import { DEMO_PROFILE } from "@/lib/attorney/demo-data";
import { canAccessFirmDashboard } from "@/lib/auth/role-routes";
import { USER_ROLE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const ROLE_WELCOME: Partial<Record<string, string>> = {
  attorney: "Your personal work hub — matters, time, tasks, and deadlines assigned to you.",
  paralegal: "Your task and document workflow hub for assigned matters.",
  managing_partner: "Your hub plus firm-wide attorney utilization below.",
};

export function AttorneyDashboardClient() {
  const { role } = useDemoRole();
  const { matters, timeEntries, tasks, deadlines, attorneys, profileId } =
    useAttorneyData();
  const todaysTasks = useTodaysTasks();

  const myEntries = timeEntries.filter((e) => e.profile_id === profileId);
  const myTasks = tasks.filter((t) => !t.profile_id || t.profile_id === profileId);
  const pendingTime = myEntries.filter((e) => e.status === "pending").length;
  const openTasks = myTasks.filter((t) => t.status !== "completed").length;
  const upcomingDeadlines = deadlines
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  const matterHours = hoursByMatter(myEntries, matters);
  const attorneyHours = hoursByAttorney(timeEntries, attorneys);

  const cards = [
    {
      label: "Assigned matters",
      value: String(matters.length),
      href: "/attorney/matters",
      icon: Briefcase,
    },
    {
      label: "Pending time entries",
      value: String(pendingTime),
      href: "/attorney/time",
      icon: Clock,
    },
    {
      label: "Open tasks",
      value: String(openTasks),
      href: "/attorney/tasks",
      icon: ListTodo,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "managing_partner" ? "Attorney Hub" : "My Dashboard"}
        description={`${USER_ROLE_LABELS[role]} — ${ROLE_WELCOME[role] ?? "Track your assigned legal work."}`}
      />

      {canAccessFirmDashboard(role) && role === "managing_partner" && (
        <Card className="border-gold-500/30 bg-gold-100/20" padding="md">
          <p className="text-sm text-navy-900">
            Need firm-wide A/R and collections?{" "}
            <Link href="/dashboard" className="font-medium underline">
              Open firm dashboard
            </Link>
          </p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/attorney/time">
          <Button size="sm">
            <Clock className="mr-2 h-4 w-4" />
            Start / Log Time
          </Button>
        </Link>
        <Link href="/attorney/tasks">
          <Button size="sm" variant="secondary">
            <ListTodo className="mr-2 h-4 w-4" />
            Today&apos;s Tasks
          </Button>
        </Link>
        <Link href="/attorney/calendar">
          <Button size="sm" variant="secondary">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
        </Link>
        <Link href="/attorney/notes">
          <Button size="sm" variant="secondary">
            <StickyNote className="mr-2 h-4 w-4" />
            Case Notes
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="block transition hover:opacity-95">
            <KPICard title={card.label} value={card.value} icon={card.icon} />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">Today&apos;s Tasks</h2>
              <p className="text-sm text-muted">Due today or overdue — {DEMO_PROFILE.full_name}</p>
            </div>
            <Link href="/attorney/tasks" className="text-sm font-medium text-navy-900 hover:underline">
              View all
            </Link>
          </div>
          {todaysTasks.length === 0 ? (
            <p className="text-sm text-muted">No tasks due today.</p>
          ) : (
            <ul className="space-y-3">
              {todaysTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <Link
                      href={`/attorney/tasks/${task.id}`}
                      className="font-medium text-navy-900 hover:underline"
                    >
                      {task.title}
                    </Link>
                    <p className="text-sm text-muted">{task.matter?.title}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusBadgeClass(task.status)}`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">Upcoming Deadlines</h2>
              <p className="text-sm text-muted">Filing and matter deadlines</p>
            </div>
            <Link href="/attorney/tasks" className="text-sm font-medium text-navy-900 hover:underline">
              Manage
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted">No deadlines on file.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <Link
                    href={`/attorney/deadlines/${deadline.id}`}
                    className="min-w-0 flex-1 rounded-md px-2 py-1 -mx-2 transition hover:bg-gray-50"
                  >
                    <p className="font-medium text-navy-900">{deadline.title}</p>
                    <p className="text-sm text-muted">{deadline.matter?.title}</p>
                  </Link>
                  <Link
                    href={`/attorney/calendar?date=${deadline.due_date}`}
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium transition hover:opacity-80 ${
                      isPastDate(deadline.due_date)
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {formatDate(deadline.due_date)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h2 className="mb-4 text-lg font-semibold text-navy-900">My Hours by Matter</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Billable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matterHours.map((row) => (
                <TableRow key={row.matterId}>
                  <TableCell className="font-medium">{row.matterTitle}</TableCell>
                  <TableCell>{row.totalHours.toFixed(1)}h</TableCell>
                  <TableCell>{row.billableHours.toFixed(1)}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {role === "managing_partner" && (
          <Card padding="md">
            <h2 className="mb-4 text-lg font-semibold text-navy-900">Hours by Attorney</h2>
            <p className="mb-3 text-xs text-muted">
              Firm-wide view — only visible to managing partner in demo mode.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attorney</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Billable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attorneyHours.map((row) => (
                  <TableRow key={row.attorneyId}>
                    <TableCell className="font-medium">{row.attorneyName}</TableCell>
                    <TableCell>{row.totalHours.toFixed(1)}h</TableCell>
                    <TableCell>{row.billableHours.toFixed(1)}h</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

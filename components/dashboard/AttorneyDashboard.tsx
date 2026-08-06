"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckSquare,
  Clock,
  Flag,
  Inbox,
  Receipt,
  Scale,
  StickyNote,
  UserPlus,
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
import type {
  ParalegalAlert,
  ParalegalDeadline,
  ParalegalReviewItem,
} from "@/lib/paralegal/demo-data";
import {
  DEADLINE_TYPE_LABELS,
  dueLabel,
  daysUntil,
  REVIEW_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/paralegal/metrics";
import {
  DEMO_ATTORNEY,
  getAttorneyAlerts,
  getAttorneyMatters,
  getAttorneyMatterIdForTitle,
  getAttorneyPriorityActions,
  getAttorneyReviewInbox,
  getAttorneyReviewMatterHref,
  getAttorneyReviewRelatedWorkHref,
  getAttorneySummaryCounts,
  getAttorneyTimeExpenseReminders,
  getUpcomingAttorneyDeadlines,
} from "@/lib/attorney/dashboard-data";

type FilterState = {
  matter: string;
  client: string;
  priority: string;
};

const DEFAULT_FILTERS: FilterState = {
  matter: "all",
  client: "all",
  priority: "all",
};

function matchesReviewFilters(
  review: ParalegalReviewItem,
  filters: FilterState,
  matters: ReturnType<typeof getAttorneyMatters>,
) {
  if (filters.matter !== "all") {
    const matter = matters.find((m) => m.id === filters.matter);
    if (matter && review.matterTitle !== matter.title) return false;
  }
  if (filters.client !== "all") {
    const clientMatter = matters.find((m) => m.clientId === filters.client);
    if (clientMatter && review.clientName !== clientMatter.clientName) return false;
  }
  return true;
}

function matchesDeadlineFilters(
  deadline: ParalegalDeadline,
  filters: FilterState,
  matters: ReturnType<typeof getAttorneyMatters>,
) {
  if (filters.matter !== "all") {
    if (!deadline.matterId || deadline.matterId !== filters.matter) return false;
  }
  if (filters.client !== "all") {
    const clientMatter = matters.find((m) => m.clientId === filters.client);
    if (
      clientMatter &&
      deadline.clientName !== clientMatter.clientName &&
      deadline.clientName !== "—"
    ) {
      return false;
    }
  }
  return true;
}

function matchesAlertFilters(
  alert: ParalegalAlert,
  filters: FilterState,
  matters: ReturnType<typeof getAttorneyMatters>,
) {
  if (filters.matter !== "all") {
    if (alert.matterId && alert.matterId !== filters.matter) return false;
    if (!alert.matterId && filters.matter !== "all") return false;
  }
  if (filters.client !== "all") {
    if (alert.clientId && alert.clientId !== filters.client) return false;
    if (!alert.clientId) {
      const clientMatter = matters.find((m) => m.clientId === filters.client);
      if (clientMatter && alert.clientName !== clientMatter.clientName) return false;
    }
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

export function AttorneyDashboard() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const counts = getAttorneySummaryCounts();
  const timeReminders = getAttorneyTimeExpenseReminders();
  const updatedAt = useMemo(() => new Date().toLocaleString(), []);
  const matters = getAttorneyMatters();
  const clients = useMemo(() => {
    const byId = new Map<string, string>();
    for (const matter of matters) {
      byId.set(matter.clientId, matter.clientName);
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [matters]);

  const priorityQueue = useMemo(
    () => getAttorneyPriorityActions(filters),
    [filters],
  );
  const reviews = useMemo(
    () => getAttorneyReviewInbox().filter((r) => matchesReviewFilters(r, filters, matters)),
    [filters, matters],
  );
  const deadlines = useMemo(
    () =>
      getUpcomingAttorneyDeadlines()
        .filter((d) => matchesDeadlineFilters(d, filters, matters)),
    [filters, matters],
  );
  const alerts = useMemo(
    () => getAttorneyAlerts().filter((a) => matchesAlertFilters(a, filters, matters)),
    [filters, matters],
  );

  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus === "reviews" || focus === "issue") {
      document.getElementById("review-inbox")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [searchParams]);

  const summaryCards = [
    {
      title: "Reviews Awaiting Me",
      value: counts.awaitingMyReview,
      href: "#review-inbox",
      icon: Inbox,
      subtitle: "Submitted / under review",
    },
    {
      title: "Waiting on My Decision",
      value: counts.waitingOnMe,
      href: "/attorney/tasks?filter=waiting_on_attorney",
      icon: Scale,
      subtitle: "Paralegal blocked on legal input",
    },
    {
      title: "Overdue / Critical Items",
      value: counts.overdueCritical,
      href: "/attorney/tasks?filter=overdue",
      icon: AlertTriangle,
      subtitle: "Past-due work on your matters",
    },
    {
      title: "Deadlines Within 7 Days",
      value: counts.deadlines7,
      href: "/attorney/tasks?filter=deadlines_7",
      icon: Flag,
      subtitle: "Court, filing, and review dates",
    },
    {
      title: "Time Needing Attention",
      value: counts.unbilledOrPendingTime,
      href: "/attorney/time",
      icon: Clock,
      subtitle: "Draft or submitted entries",
    },
    {
      title: "Risk Alerts",
      value: counts.riskAlerts,
      href: "/clients",
      icon: Briefcase,
      subtitle: "Conflict, hold, or scope flags",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Attorney view — Decide on reviews, own deadlines and matters, and keep billable work moving without doing paralegal prep work twice."
      >
        <div className="text-right text-xs text-muted">
          <p className="font-medium text-navy-900">
            {DEMO_ATTORNEY.fullName}, {DEMO_ATTORNEY.title}
          </p>
          <p>Last updated {updatedAt}</p>
        </div>
      </PageHeader>

      <Card className="border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="p-6">
          <p className="text-sm font-medium text-gold-500">Attorney daily action center</p>
          <p className="mt-2 max-w-3xl text-sm text-gray-200">
            Focused on {DEMO_ATTORNEY.fullName}&apos;s matters. Approve or return paralegal
            submissions, act on deadlines, and escalate conflict or engagement risk — without
            clearing conflicts or changing firm administration settings.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Daily shortcuts for {DEMO_ATTORNEY.fullName} — assigned matters, billable time, tasks, deadlines, and paralegal submissions awaiting your review.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link href="/attorney/tasks">
            <Button>
              <CheckSquare className="h-4 w-4" /> Review Assigned Tasks
            </Button>
          </Link>
          <Link href="/attorney/time">
            <Button variant="secondary">
              <Clock className="h-4 w-4" /> Log Time
            </Button>
          </Link>
          <Link href="/attorney/matters">
            <Button variant="secondary">
              <Briefcase className="h-4 w-4" /> My Matters
            </Button>
          </Link>
          <Link href="/attorney/calendar">
            <Button variant="secondary">
              <Calendar className="h-4 w-4" /> Calendar
            </Button>
          </Link>
          <Link href="/attorney/notes">
            <Button variant="secondary">
              <StickyNote className="h-4 w-4" /> Case Notes
            </Button>
          </Link>
          <Link href="/clients/new">
            <Button variant="secondary">
              <UserPlus className="h-4 w-4" /> Add Client
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="secondary">
              <Briefcase className="h-4 w-4" /> Manage Clients
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
              subtitle={card.subtitle}
            />
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard filters</CardTitle>
          <CardDescription>
            Defaults to {DEMO_ATTORNEY.fullName}&apos;s assigned matters (not firm-wide).
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="Matter"
            value={filters.matter}
            onChange={(e) => setFilters((f) => ({ ...f, matter: e.target.value }))}
            options={[
              { value: "all", label: "All my matters" },
              ...matters.map((m) => ({ value: m.id, label: m.title })),
            ]}
          />
          <Select
            label="Client"
            value={filters.client}
            onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))}
            options={[
              { value: "all", label: "All my clients" },
              ...clients.map((client) => ({
                value: client.id,
                label: client.name,
              })),
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
        </div>
      </Card>

      <div id="review-inbox">
        <Card>
          <CardHeader>
            <CardTitle>Review inbox</CardTitle>
            <CardDescription>
              Work submitted by the paralegal for your decision. Approve, return, or request clarification from the related matter.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {reviews.length === 0 ? (
              <li className="text-sm text-muted">No open review items.</li>
            ) : (
              reviews.map((r) => {
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
                      Submitted {r.submittedAt}
                      {waitingDays > 2 ? ` · Waiting ${waitingDays} days` : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link href={getAttorneyReviewMatterHref(r)}>
                        <Button size="sm">Review</Button>
                      </Link>
                      <Link href={getAttorneyReviewRelatedWorkHref(r)}>
                        <Button size="sm" variant="secondary">
                          Open related work
                        </Button>
                      </Link>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Time &amp; expense reminders</CardTitle>
            <CardDescription>
              Track billable work on your matters and review team submissions. You cannot approve your own write-downs or edit invoiced entries.
            </CardDescription>
          </CardHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Time on my matters today</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.hoursToday.toFixed(1)} hrs
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Entries awaiting review</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.pendingReview.length}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">My draft entries</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.drafts.length}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs font-semibold uppercase text-muted">Expenses needing attention</dt>
              <dd className="mt-1 text-lg font-semibold text-navy-900">
                {timeReminders.expensesNeedingReview.length}
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
            <Link href="/attorney/time">
              <Button size="sm">
                <Clock className="h-3.5 w-3.5" /> Log Time
              </Button>
            </Link>
            <Link href="/attorney/time">
              <Button size="sm" variant="secondary">
                Review Time Entries
              </Button>
            </Link>
            <Link href="/attorney/expenses">
              <Button size="sm" variant="secondary">
                <Receipt className="h-3.5 w-3.5" /> Add Expense
              </Button>
            </Link>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming deadlines</CardTitle>
            <CardDescription>Your matters — structured filing and review dates.</CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {deadlines.map((d) => {
              const matterId = getAttorneyMatterIdForTitle(d.matterTitle);
              return (
              <li
                key={d.id}
                className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-navy-900">
                    {DEADLINE_TYPE_LABELS[d.type]}: {d.label}
                  </p>
                  {matterId ? (
                    <Link href={`/attorney/calendar?date=${d.dueAt.slice(0, 10)}`}>
                      {urgencyBadge(d.dueAt)}
                    </Link>
                  ) : (
                    urgencyBadge(d.dueAt)
                  )}
                </div>
                <p className="mt-1 text-muted">
                  {d.clientName} · {d.matterTitle}
                </p>
                <p className="mt-2 text-navy-900">Required action: {d.requiredAction}</p>
                {matterId && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/attorney/tasks?tab=deadlines&matter=${matterId}`}>
                      <Button size="sm" variant="secondary">
                        View deadline
                      </Button>
                    </Link>
                    <Link href={`/attorney/matters/${matterId}`}>
                      <Button size="sm" variant="ghost">
                        Open matter
                      </Button>
                    </Link>
                  </div>
                )}
              </li>
            );
            })}
          </ul>
        </Card>
      </div>

      <Card padding="none">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-navy-900">Matter action queue</h2>
          <p className="mt-1 text-sm text-muted">
            Overdue items and work waiting on your legal direction. Your approval is separate from paralegal task completion.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Matter</TableHead>
              <TableHead>Due</TableHead>
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
                  <TableCell>
                    <div className="space-y-1">
                      <div>{task.dueDate}</div>
                      {urgencyBadge(task.dueDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{TASK_STATUS_LABELS[task.status]}</Badge>
                    {task.requiresAttorneyApproval && (
                      <p className="mt-1 text-[11px] text-muted">Requires your approval</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/attorney/tasks?tab=all&matter=${task.matterId}`}>
                      <Button size="sm" variant="secondary">
                        Open
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk & matter alerts</CardTitle>
          <CardDescription>
            You can escalate and advise. You cannot clear conflicts or change firm admin settings from this dashboard.
          </CardDescription>
        </CardHeader>
        <ul className="space-y-3">
          {alerts.length === 0 ? (
            <li className="text-sm text-muted">No alerts on your assigned matters.</li>
          ) : (
            alerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm"
              >
                <p className="font-medium text-navy-900">{alert.title}</p>
                <p className="mt-1 text-amber-950">{alert.detail}</p>
                <p className="mt-2 text-xs text-muted">Recommended: {alert.recommendedAction}</p>
                <Link href={alert.href} className="mt-2 inline-block">
                  <Button size="sm" variant="secondary">
                    Open related module
                  </Button>
                </Link>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}

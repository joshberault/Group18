"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Gauge,
  UserMinus,
} from "lucide-react";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import { JobApplicationsPanel } from "@/components/admin/JobApplicationsPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  buildAttentionItems,
  buildRecentAdminActivity,
  buildUpcomingLeaveCoverage,
  calculateWorkloadPercentage,
  countActiveAssignmentsForEmployee,
  countBusinessDaysAge,
  getAttorneysAvailableForAssignment,
  getOpenAssignmentsForEmployee,
  getOverdueAssignments,
  getPendingApprovalsSorted,
  isApprovalAgingOverdue,
} from "@/lib/admin/calculations";
import type { AttentionPriority } from "@/lib/admin/types";

function priorityBadge(priority: AttentionPriority | "urgent" | "normal") {
  if (priority === "urgent") return <Badge variant="danger">Urgent</Badge>;
  if (priority === "high") return <Badge variant="warning">High</Badge>;
  return <Badge variant="neutral">Normal</Badge>;
}

function coverageBadge(status: string) {
  if (status === "Covered") return <Badge variant="success">{status}</Badge>;
  if (status === "Missing coverage")
    return <Badge variant="danger">{status}</Badge>;
  return <Badge variant="warning">{status}</Badge>;
}

export function ManagerDashboard() {
  const { data, loading, error, refresh } = useAdminData();

  const dataset = data;
  const summary = dataset?.summary;

  const overdueAssignments = useMemo(
    () =>
      dataset
        ? getOverdueAssignments(dataset.assignments, dataset.referenceDate).filter(
            (a) =>
              a.status === "active" ||
              a.status === "pending" ||
              a.status === "overdue",
          )
        : [],
    [dataset],
  );

  const attentionItems = useMemo(
    () =>
      dataset
        ? buildAttentionItems({
            employees: dataset.employees,
            assignments: dataset.assignments,
            approvals: dataset.approvals,
            unassignedMatters: dataset.unassignedMatters,
            vacations: dataset.vacations,
            referenceDate: dataset.referenceDate,
            limit: 8,
          })
        : [],
    [dataset],
  );

  const pendingApprovalsPreview = useMemo(() => {
    if (!dataset) return [];
    return getPendingApprovalsSorted(dataset.approvals).slice(0, 5);
  }, [dataset]);

  const workloadAlerts = useMemo(() => {
    if (!dataset) return [];
    return dataset.employees
      .map((employee) => {
        const pct = calculateWorkloadPercentage(
          employee.assignedHours,
          employee.weeklyCapacityHours,
        );
        const open = getOpenAssignmentsForEmployee(
          employee.id,
          dataset.assignments,
        );
        let status: string | null = null;
        if (employee.status === "inactive" && open.length > 0) {
          status = "Inactive with Active Assignments";
        } else if (employee.status === "on_leave") {
          status = "On Leave";
        } else if (pct > 100) {
          status = "Over Capacity";
        } else if (pct >= 90) {
          status = "Near Capacity";
        }
        if (!status) return null;
        return { employee, pct, status };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => {
        const rank = (s: string) =>
          s.startsWith("Inactive")
            ? 0
            : s === "Over Capacity"
              ? 1
              : s === "Near Capacity"
                ? 2
                : 3;
        return rank(a.status) - rank(b.status) || b.pct - a.pct;
      })
      .slice(0, 5);
  }, [dataset]);

  const availableAttorneys = useMemo(() => {
    if (!dataset) return [];
    return getAttorneysAvailableForAssignment(dataset.employees).slice(0, 5);
  }, [dataset]);

  const upcomingLeave = useMemo(
    () =>
      dataset
        ? buildUpcomingLeaveCoverage({
            vacations: dataset.vacations,
            employees: dataset.employees,
            assignments: dataset.assignments,
            approvals: dataset.approvals,
            referenceDate: dataset.referenceDate,
          }).slice(0, 5)
        : [],
    [dataset],
  );

  const recentActivity = useMemo(
    () =>
      dataset
        ? buildRecentAdminActivity({
            approvals: dataset.approvals,
            assignments: dataset.assignments,
            limit: 5,
          })
        : [],
    [dataset],
  );

  if (loading) {
    return <LoadingState message="Loading Firm Administrator dashboard..." />;
  }

  if (error || !dataset || !summary) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load dashboard</CardTitle>
          <CardDescription className="text-red-700">
            {error || "The Firm Administrator Dashboard could not load firm data."}
          </CardDescription>
        </CardHeader>
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Live firm data:</strong>{" "}
        Staffing overview from shared Supabase tables (profiles, matters,
        assignments, time entries, expenses, leave, and job applications).
        Reference date {dataset.referenceDate}. Estimated assigned hours are not
        mixed with actual hours worked.
      </div>

      <JobApplicationsPanel />

      {/* TOP SUMMARY ROW — exactly six cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/approvals" className="block h-full">
          <KPICard
            title="Pending Approvals"
            value={String(summary.pendingApprovals)}
            subtitle={`${summary.urgentPendingApprovals} urgent · open queue`}
            icon={CheckSquare}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/workload" className="block h-full">
          <KPICard
            title="Over Capacity"
            value={String(summary.overloadedEmployees)}
            subtitle="Employees above 100% workload"
            icon={Gauge}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/workload" className="block h-full">
          <KPICard
            title="Employees on Leave"
            value={String(summary.employeesOnApprovedLeave)}
            subtitle="Currently on approved leave"
            icon={UserMinus}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/assignments" className="block h-full">
          <KPICard
            title="Assignments Due Soon"
            value={String(summary.assignmentsDueWithin7Days)}
            subtitle="Open assignments due within 7 days"
            icon={CalendarDays}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/assignments" className="block h-full">
          <KPICard
            title="Overdue Assignments"
            value={String(summary.overdueAssignments)}
            subtitle="Open assignments past due"
            icon={AlertTriangle}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/assignments" className="block h-full">
          <KPICard
            title="Unassigned Matters"
            value={String(summary.unassignedMatters)}
            subtitle="No lead attorney / responsible employee"
            icon={Briefcase}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
      </div>

      {/* SECTION 1: Items Requiring Attention */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Items Requiring Attention</CardTitle>
          <CardDescription>
            Urgent first, then high priority, then oldest. Showing up to eight
            issues.
          </CardDescription>
        </CardHeader>
        {attentionItems.length === 0 ? (
          <EmptyState
            title="No attention items"
            description="No overloaded staff, overdue work, or coverage gaps in the current demo data."
            moduleLabel="Admin · Dashboard"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Employee or Matter</TableHead>
                  <TableHead>Date or Age</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{priorityBadge(item.priority)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-start gap-1.5">
                        {(item.priority === "urgent" ||
                          item.priority === "high") && (
                          <AlertTriangle
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
                            aria-hidden
                          />
                        )}
                        <span className="font-medium text-navy-900">
                          {item.issue}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.subjectHref ? (
                        <Link
                          href={item.subjectHref}
                          className="text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                        >
                          {item.subjectLabel}
                        </Link>
                      ) : (
                        item.subjectLabel
                      )}
                    </TableCell>
                    <TableCell>{item.dateOrAge}</TableCell>
                    <TableCell>
                      <Link href={item.actionHref}>
                        <Button size="sm" variant="secondary">
                          {item.actionLabel}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* SECTION 2: Approvals + Workload */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card padding="md" className="h-full">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Approval Queue Preview</CardTitle>
              <CardDescription>
                Five most important pending approvals (urgent, then oldest).
              </CardDescription>
            </div>
            <Link href="/admin/approvals">
              <Button size="sm">View All Approvals</Button>
            </Link>
          </CardHeader>
          {pendingApprovalsPreview.length === 0 ? (
            <EmptyState
              title="No pending approvals"
              description="The approval queue is clear in demo data."
              moduleLabel="Admin · Approvals"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovalsPreview.map((row) => {
                    const age = countBusinessDaysAge(
                      row.submittedAt,
                      dataset.referenceDate,
                    );
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[160px] font-medium text-navy-900">
                          {row.title}
                          {isApprovalAgingOverdue(age) && (
                            <span className="mt-1 block text-xs font-medium text-red-700">
                              &gt;3 business days
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/employees/${row.employeeId}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {row.submittedBy}
                          </Link>
                        </TableCell>
                        <TableCell className="capitalize">
                          {row.type.replaceAll("_", " ")}
                        </TableCell>
                        <TableCell>{priorityBadge(row.priority)}</TableCell>
                        <TableCell>
                          {age} business day{age === 1 ? "" : "s"}
                        </TableCell>
                        <TableCell>
                          <Link href="/admin/approvals">
                            <Button size="sm" variant="secondary">
                              Review Approval
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card padding="md" className="h-full">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Workload Alerts</CardTitle>
              <CardDescription>
                Employees who need attention — over capacity, near capacity, on
                leave, or inactive with work.
              </CardDescription>
            </div>
            <Link href="/admin/workload">
              <Button size="sm">View Workload Board</Button>
            </Link>
          </CardHeader>
          {workloadAlerts.length === 0 ? (
            <EmptyState
              title="No workload alerts"
              description="No capacity or leave alerts in the current demo data."
              moduleLabel="Admin · Workload"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Practice Area</TableHead>
                    <TableHead>Workload Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workloadAlerts.map(({ employee, pct, status }) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Link
                          href={`/admin/employees/${employee.id}`}
                          className="font-medium text-navy-900 underline-offset-2 hover:underline"
                        >
                          {employee.fullName}
                        </Link>
                      </TableCell>
                      <TableCell>{employee.practiceArea}</TableCell>
                      <TableCell>
                        <span
                          className={
                            pct > 100
                              ? "font-semibold text-red-700"
                              : pct >= 90
                                ? "font-semibold text-amber-800"
                                : "text-navy-900"
                          }
                        >
                          {employee.weeklyCapacityHours > 0 ? `${pct}%` : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            status.startsWith("Over") ||
                            status.startsWith("Inactive")
                              ? "danger"
                              : status.startsWith("Near")
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href="/admin/workload">
                          <Button size="sm" variant="secondary">
                            View Workload
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* SECTION 3: Available attorneys + Upcoming leave */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card padding="md" className="h-full">
          <CardHeader>
            <CardTitle>Attorneys Available for Assignment</CardTitle>
            <CardDescription>
              Active, not on leave, and below 90% workload (estimated assigned ÷
              weekly capacity).
            </CardDescription>
          </CardHeader>
          {availableAttorneys.length === 0 ? (
            <EmptyState
              title="No available attorneys"
              description="No attorneys currently meet the available criteria."
              moduleLabel="Admin · Assignments"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attorney</TableHead>
                    <TableHead>Practice Area</TableHead>
                    <TableHead>Available Hours</TableHead>
                    <TableHead>Workload Percentage</TableHead>
                    <TableHead>Active Matters</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableAttorneys.map((attorney) => {
                    const pct = calculateWorkloadPercentage(
                      attorney.assignedHours,
                      attorney.weeklyCapacityHours,
                    );
                    const remaining =
                      attorney.weeklyCapacityHours - attorney.assignedHours;
                    return (
                      <TableRow key={attorney.id}>
                        <TableCell>
                          <Link
                            href={`/admin/employees/${attorney.id}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {attorney.fullName}
                          </Link>
                        </TableCell>
                        <TableCell>{attorney.practiceArea}</TableCell>
                        <TableCell>{Math.max(0, remaining)}</TableCell>
                        <TableCell>{pct}%</TableCell>
                        <TableCell>
                          {countActiveAssignmentsForEmployee(
                            attorney.id,
                            dataset.assignments,
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/assignments?employeeId=${attorney.id}&intent=new`}
                          >
                            <Button size="sm">Assign Matter</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card padding="md" className="h-full">
          <CardHeader>
            <CardTitle>Upcoming Leave and Coverage</CardTitle>
            <CardDescription>
              Approved leave beginning after {dataset.referenceDate}. Flags
              missing coverage, deadline conflicts, and over-capacity backups.
            </CardDescription>
          </CardHeader>
          {upcomingLeave.length === 0 ? (
            <EmptyState
              title="No upcoming leave"
              description="No approved future leave in the demo dataset."
              moduleLabel="Admin · Leave"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Dates</TableHead>
                    <TableHead>Active Matters</TableHead>
                    <TableHead>Coverage Employee</TableHead>
                    <TableHead>Coverage Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingLeave.map((row) => (
                    <TableRow key={`${row.employeeId}-${row.startDate}`}>
                      <TableCell>
                        <Link
                          href={`/admin/employees/${row.employeeId}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {row.employeeName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {row.startDate} → {row.endDate}
                      </TableCell>
                      <TableCell>{row.activeMatters}</TableCell>
                      <TableCell>{row.coverageEmployee}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {coverageBadge(row.coverageStatus)}
                          {row.coverageStatus !== "Covered" && (
                            <Link
                              href={row.reviewHref}
                              className="block text-xs font-medium text-navy-900 underline-offset-2 hover:underline"
                            >
                              Review needed
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* FINAL: Recent activity */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Recent Administrative Activity</CardTitle>
          <CardDescription>
            Five most recent review and assignment actions from demo data.
          </CardDescription>
        </CardHeader>
        {recentActivity.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Administrative actions will appear here as reviews and assignments occur."
            moduleLabel="Admin · Activity"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Person who performed it</TableHead>
                  <TableHead>Employee or Matter affected</TableHead>
                  <TableHead>Date and time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 font-medium text-navy-900">
                        <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                        {row.action}
                      </span>
                    </TableCell>
                    <TableCell>{row.performedBy}</TableCell>
                    <TableCell>{row.affected}</TableCell>
                    <TableCell>
                      {new Date(row.at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted">
        Overdue open assignments in demo data: {overdueAssignments.length}. Full
        staff directory is on Employee Profiles — not repeated here.
      </p>


    </div>
  );
}

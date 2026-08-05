"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  RefreshCw,
  Scale,
  UserMinus,
  Users,
  Gauge,
} from "lucide-react";
import { ProductivityMetrics } from "@/components/admin/ProductivityMetrics";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import {
  buildDashboardSummary,
  buildProductivityMetrics,
  buildWorkloadItems,
  deriveCapacityStatus,
  filterEmployeesForDashboard,
  getAvailableAttorneys,
  getPendingApprovalsSorted,
  getUpcomingVacations,
  getWorkloadAlerts,
  getAssignmentsDueSoon,
  uniquePracticeAreas,
} from "@/lib/admin/calculations";
import {
  ADMIN_UI_FLAGS,
  getAdminDashboardDataset,
} from "@/lib/admin/mock-data";
import type {
  AdminDashboardFilters,
  WorkloadCapacityStatus,
} from "@/lib/admin/types";

const WORKLOAD_FILTER_OPTIONS: Array<{
  value: AdminDashboardFilters["workloadStatus"];
  label: string;
}> = [
  { value: "all", label: "All workload statuses" },
  { value: "available", label: "Available (< 90%)" },
  { value: "near_capacity", label: "Near capacity (90–100%)" },
  { value: "overloaded", label: "Overloaded (> 100%)" },
  { value: "on_leave", label: "On approved leave" },
  { value: "inactive", label: "Inactive" },
];

function capacityBadge(status: WorkloadCapacityStatus) {
  if (status === "overloaded") return <Badge variant="danger">Overloaded</Badge>;
  if (status === "near_capacity")
    return <Badge variant="warning">Near capacity</Badge>;
  if (status === "on_leave") return <Badge variant="neutral">On leave</Badge>;
  if (status === "inactive") return <Badge variant="neutral">Inactive</Badge>;
  return <Badge variant="success">Available</Badge>;
}

export function ManagerDashboard() {
  const [filters, setFilters] = useState<AdminDashboardFilters>({
    practiceArea: "all",
    workloadStatus: "all",
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [hasError, setHasError] = useState(ADMIN_UI_FLAGS.forceError);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dataset = useMemo(() => {
    // refreshToken forces recalculation from the existing mock dataset.
    void refreshToken;
    return getAdminDashboardDataset();
  }, [refreshToken]);

  const practiceAreas = useMemo(
    () => uniquePracticeAreas(dataset.employees),
    [dataset.employees],
  );

  const filteredEmployees = useMemo(
    () => filterEmployeesForDashboard(dataset.employees, filters),
    [dataset.employees, filters],
  );

  const filteredEmployeeIds = useMemo(
    () => new Set(filteredEmployees.map((e) => e.id)),
    [filteredEmployees],
  );

  const filteredAssignments = useMemo(() => {
    return dataset.assignments.filter((assignment) => {
      if (
        filters.practiceArea !== "all" &&
        assignment.practiceArea !== filters.practiceArea
      ) {
        return false;
      }
      if (filters.workloadStatus === "all") return true;
      return filteredEmployeeIds.has(assignment.employeeId);
    });
  }, [dataset.assignments, filters, filteredEmployeeIds]);

  const filteredApprovals = useMemo(() => {
    return dataset.approvals.filter((approval) => {
      if (!approval.employeeId) {
        return filters.practiceArea === "all" && filters.workloadStatus === "all";
      }
      return filteredEmployeeIds.has(approval.employeeId);
    });
  }, [dataset.approvals, filters, filteredEmployeeIds]);

  const filteredUnassigned = useMemo(() => {
    if (filters.practiceArea === "all") return dataset.unassignedMatters;
    return dataset.unassignedMatters.filter(
      (m) => m.practiceArea === filters.practiceArea,
    );
  }, [dataset.unassignedMatters, filters.practiceArea]);

  const filteredVacations = useMemo(() => {
    return dataset.vacations.filter((vacation) => {
      if (
        filters.practiceArea !== "all" &&
        vacation.practiceArea !== filters.practiceArea
      ) {
        return false;
      }
      if (filters.workloadStatus === "all") return true;
      return filteredEmployeeIds.has(vacation.employeeId);
    });
  }, [dataset.vacations, filters, filteredEmployeeIds]);

  const summary = useMemo(
    () =>
      buildDashboardSummary({
        employees: filteredEmployees,
        approvals: filteredApprovals,
        assignments: filteredAssignments,
        unassignedMatters: filteredUnassigned,
        referenceDate: dataset.referenceDate,
      }),
    [
      filteredEmployees,
      filteredApprovals,
      filteredAssignments,
      filteredUnassigned,
      dataset.referenceDate,
    ],
  );

  const productivity = useMemo(
    () => buildProductivityMetrics(filteredEmployees),
    [filteredEmployees],
  );

  const workload = useMemo(
    () => buildWorkloadItems(filteredEmployees),
    [filteredEmployees],
  );

  const urgentAndPendingApprovals = useMemo(
    () => getPendingApprovalsSorted(filteredApprovals),
    [filteredApprovals],
  );

  const workloadAlerts = useMemo(() => getWorkloadAlerts(workload), [workload]);

  const upcomingVacations = useMemo(
    () => getUpcomingVacations(filteredVacations, dataset.referenceDate),
    [filteredVacations, dataset.referenceDate],
  );

  const recentAssignments = useMemo(() => {
    return [...filteredAssignments]
      .sort(
        (a, b) =>
          new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime(),
      )
      .slice(0, 5);
  }, [filteredAssignments]);

  const availableAttorneys = useMemo(
    () => getAvailableAttorneys(filteredEmployees),
    [filteredEmployees],
  );

  const dueSoonCount = useMemo(
    () =>
      getAssignmentsDueSoon(filteredAssignments, dataset.referenceDate, 7)
        .length,
    [filteredAssignments, dataset.referenceDate],
  );

  function handleRefresh() {
    setIsRefreshing(true);
    setHasError(false);
    // Recalculate from the existing mock dataset (no duplicate data).
    setRefreshToken((value) => value + 1);
    window.setTimeout(() => setIsRefreshing(false), 250);
  }

  if (ADMIN_UI_FLAGS.forceLoading || isRefreshing) {
    return <LoadingState message="Loading manager dashboard..." />;
  }

  if (hasError || ADMIN_UI_FLAGS.forceError) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load dashboard</CardTitle>
          <CardDescription className="text-red-700">
            The Manager Dashboard could not recalculate from the current mock
            dataset. Try Refresh, or reconnect Supabase queries later.
          </CardDescription>
        </CardHeader>
        <Button onClick={handleRefresh} variant="secondary">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry refresh
        </Button>
      </Card>
    );
  }

  if (ADMIN_UI_FLAGS.forceEmpty || filteredEmployees.length === 0) {
    return (
      <div className="space-y-4">
        <DashboardFilters
          filters={filters}
          practiceAreas={practiceAreas}
          onChange={setFilters}
          onRefresh={handleRefresh}
        />
        <EmptyState
          title="No employees match these filters"
          description="Adjust practice area or workload status, or refresh the mock dataset."
          moduleLabel="Admin · Dashboard"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Mock data:</strong> This
        Manager Dashboard currently uses temporary admin mock data. It will later
        be replaced by Supabase queries. Assigned hours (planned load) are shown
        separately from actual hours worked. Utilization = actual hours worked ÷
        available work hours.
      </div>

      <DashboardFilters
        filters={filters}
        practiceAreas={practiceAreas}
        onChange={setFilters}
        onRefresh={handleRefresh}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Active Employees"
          value={String(summary.activeEmployees)}
          subtitle="Status = active"
          icon={Users}
        />
        <KPICard
          title="Available Attorneys"
          value={String(summary.availableAttorneys)}
          subtitle="Workload < 90%, not on leave"
          icon={Scale}
        />
        <KPICard
          title="Employees on Approved Leave"
          value={String(summary.employeesOnApprovedLeave)}
          subtitle="Employment status on leave"
          icon={UserMinus}
        />
        <KPICard
          title="Pending Approvals"
          value={String(summary.pendingApprovals)}
          subtitle="Awaiting manager action"
          icon={ClipboardCheck}
        />
        <KPICard
          title="Overloaded Employees"
          value={String(summary.overloadedEmployees)}
          subtitle="Assigned load > 100%"
          icon={AlertTriangle}
        />
        <KPICard
          title="Assignments Due Within 7 Days"
          value={String(summary.assignmentsDueWithin7Days)}
          subtitle={`${dueSoonCount} open items due soon`}
          icon={CalendarDays}
        />
        <KPICard
          title="Unassigned Matters"
          value={String(summary.unassignedMatters)}
          subtitle="Need attorney staffing"
          icon={Briefcase}
        />
        <KPICard
          title="Average Attorney Utilization"
          value={`${summary.averageAttorneyUtilization}%`}
          subtitle="Actual hrs ÷ available hrs"
          icon={Gauge}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card padding="md">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Urgent Approval Requests</CardTitle>
              <CardDescription>
                Urgent first, then oldest pending within the same priority.
              </CardDescription>
            </div>
            <Link
              href="/admin/approvals"
              className="text-sm font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
            >
              Open approval queue
            </Link>
          </CardHeader>
          {urgentAndPendingApprovals.length === 0 ? (
            <EmptyState
              title="No pending approvals"
              description="The filtered mock approval queue is clear."
              moduleLabel="Admin · Approvals"
              className="border-0 py-8 shadow-none"
            />
          ) : (
            <ul className="space-y-3">
              {urgentAndPendingApprovals.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link
                    href="/admin/approvals"
                    className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-surface px-4 py-3 transition-colors hover:border-gold-500 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-navy-900">{item.summary}</p>
                      <p className="text-sm text-muted">
                        {item.submittedBy} · {item.type.replaceAll("_", " ")} ·{" "}
                        {new Date(item.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={item.priority === "urgent" ? "danger" : "warning"}
                    >
                      {item.priority}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Workload Alerts</CardTitle>
              <CardDescription>
                Attorneys at near capacity (90–100%) or overloaded (&gt;100%).
              </CardDescription>
            </div>
            <Link
              href="/admin/workload"
              className="text-sm font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
            >
              Open workload board
            </Link>
          </CardHeader>
          {workloadAlerts.length === 0 ? (
            <EmptyState
              title="No workload alerts"
              description="No near-capacity or overloaded attorneys in the current filter."
              moduleLabel="Admin · Workload"
              className="border-0 py-8 shadow-none"
            />
          ) : (
            <ul className="space-y-3">
              {workloadAlerts.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/admin/employees?employee=${item.employeeId}`}
                      className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                    >
                      {item.attorneyName}
                    </Link>
                    <p className="text-sm text-muted">
                      {item.practiceArea} · Assigned {item.assignedHours} hrs ·
                      Actual {item.actualHoursWorked} hrs · Available{" "}
                      {item.availableWorkHours} hrs
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {capacityBadge(item.capacityStatus)}
                    <Link
                      href="/admin/workload"
                      className="text-xs font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Upcoming Vacations</CardTitle>
            <CardDescription>
              Approved leave that is current or upcoming (mock vacation records).
            </CardDescription>
          </CardHeader>
          {upcomingVacations.length === 0 ? (
            <EmptyState
              title="No upcoming vacations"
              description="No approved leave matches the current filters."
              moduleLabel="Admin · Leave"
              className="border-0 py-8 shadow-none"
            />
          ) : (
            <ul className="space-y-3">
              {upcomingVacations.map((vacation) => (
                <li
                  key={vacation.id}
                  className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/admin/employees?employee=${vacation.employeeId}`}
                      className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                    >
                      {vacation.employeeName}
                    </Link>
                    <p className="text-sm text-muted">
                      {vacation.practiceArea} · {vacation.days} day
                      {vacation.days === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-navy-900">
                    {vacation.startDate} → {vacation.endDate}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card padding="md">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recent Matter Assignments</CardTitle>
              <CardDescription>
                Newest staffing assignments from the mock assignment list.
              </CardDescription>
            </div>
            <Link
              href="/admin/assignments"
              className="text-sm font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
            >
              Open assignments
            </Link>
          </CardHeader>
          {recentAssignments.length === 0 ? (
            <EmptyState
              title="No recent assignments"
              description="No matter assignments match the current filters."
              moduleLabel="Admin · Assignments"
              className="border-0 py-8 shadow-none"
            />
          ) : (
            <ul className="space-y-3">
              {recentAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    href="/admin/assignments"
                    className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-surface px-4 py-3 transition-colors hover:border-gold-500 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-navy-900">
                        {assignment.matterLabel}
                      </p>
                      <p className="text-sm text-muted">
                        {assignment.matterReference} ·{" "}
                        <span className="font-medium text-navy-800">
                          {assignment.attorneyName}
                        </span>{" "}
                        · Due {assignment.dueDate}
                      </p>
                    </div>
                    <Badge
                      variant={
                        assignment.status === "overdue" ? "danger" : "gold"
                      }
                    >
                      {assignment.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle>Attorney Availability</CardTitle>
          <CardDescription>
            Attorneys with assigned workload below 90% who are not on approved
            leave. Capacity uses assigned hours ÷ available work hours.
          </CardDescription>
        </CardHeader>
        {availableAttorneys.length === 0 ? (
          <EmptyState
            title="No available attorneys"
            description="Every attorney in the current filter is on leave, inactive, near capacity, or overloaded."
            moduleLabel="Admin · Availability"
            className="border-0 py-8 shadow-none"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {availableAttorneys.map((attorney) => {
              const status = deriveCapacityStatus(attorney);
              const load = attorney.availableWorkHours
                ? Math.round(
                    (attorney.assignedHours / attorney.availableWorkHours) *
                      1000,
                  ) / 10
                : 0;
              return (
                <div
                  key={attorney.id}
                  className="rounded-lg border border-gray-100 bg-surface px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/admin/employees?employee=${attorney.id}`}
                      className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                    >
                      {attorney.fullName}
                    </Link>
                    {capacityBadge(status)}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {attorney.practiceArea}
                  </p>
                  <p className="mt-2 text-xs text-navy-800">
                    Assigned {attorney.assignedHours} hrs · Actual{" "}
                    {attorney.actualHoursWorked} hrs · Load {load}%
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {filteredUnassigned.length > 0 && (
        <Card padding="md">
          <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Unassigned matters</CardTitle>
              <CardDescription>
                Matters waiting for attorney assignment (links to Assignments).
              </CardDescription>
            </div>
            <Link
              href="/admin/assignments"
              className="text-sm font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
            >
              Assign from board
            </Link>
          </CardHeader>
          <ul className="space-y-2">
            {filteredUnassigned.map((matter) => (
              <li key={matter.id}>
                <Link
                  href="/admin/assignments"
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm hover:border-gold-500"
                >
                  <span className="font-medium text-navy-900">
                    {matter.matterLabel}{" "}
                    <span className="font-normal text-muted">
                      ({matter.matterReference})
                    </span>
                  </span>
                  <Badge
                    variant={
                      matter.urgency === "high"
                        ? "danger"
                        : matter.urgency === "medium"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {matter.urgency}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ProductivityMetrics metrics={productivity} />
    </div>
  );
}

function DashboardFilters({
  filters,
  practiceAreas,
  onChange,
  onRefresh,
}: {
  filters: AdminDashboardFilters;
  practiceAreas: string[];
  onChange: (next: AdminDashboardFilters) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <Select
          label="Practice area"
          value={filters.practiceArea}
          onChange={(event) =>
            onChange({ ...filters, practiceArea: event.target.value })
          }
          options={[
            { value: "all", label: "All practice areas" },
            ...practiceAreas.map((area) => ({ value: area, label: area })),
          ]}
        />
        <Select
          label="Workload status"
          value={filters.workloadStatus}
          onChange={(event) =>
            onChange({
              ...filters,
              workloadStatus: event.target
                .value as AdminDashboardFilters["workloadStatus"],
            })
          }
          options={WORKLOAD_FILTER_OPTIONS}
        />
      </div>
      <Button type="button" onClick={onRefresh} className="shrink-0">
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}

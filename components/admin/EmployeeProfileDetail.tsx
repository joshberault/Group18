import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { ProductivityMetrics } from "@/components/admin/ProductivityMetrics";
import {
  buildEmployeeProfileProductivity,
  calculateWorkloadPercentage,
  getAssignmentsDueSoon,
  getEmployeeById,
  getOverdueAssignments,
  getUpcomingVacations,
  getVacationStatusLabel,
} from "@/lib/admin/calculations";
import {
  ADMIN_REFERENCE_DATE,
  MOCK_APPROVALS,
  MOCK_ASSIGNMENTS,
  MOCK_EMPLOYEES,
  MOCK_ROLE_PERMISSIONS,
  MOCK_VACATIONS,
} from "@/lib/admin/mock-data";

function statusVariant(status: string) {
  if (status === "active") return "success" as const;
  if (status === "on_leave") return "warning" as const;
  if (status === "overdue") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "neutral" as const;
}

function statusLabel(status: string) {
  if (status === "on_leave") return "On Leave";
  return status.replaceAll("_", " ");
}

interface EmployeeProfileDetailProps {
  employeeId: string;
}

export function EmployeeProfileDetail({ employeeId }: EmployeeProfileDetailProps) {
  const employee = getEmployeeById(MOCK_EMPLOYEES, employeeId);

  if (!employee) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Employee not found"
          description="No staff profile matches this employee ID in the local mock data."
        />
        <EmptyState
          title="Invalid employee ID"
          description={`“${employeeId}” is not a known employee. Return to the roster and open a valid profile.`}
          moduleLabel="Admin · Employees"
        />
        <Link href="/admin/employees">
          <Button variant="secondary">Back to Employees</Button>
        </Link>
      </div>
    );
  }

  const manager = employee.managerId
    ? getEmployeeById(MOCK_EMPLOYEES, employee.managerId)
    : undefined;
  const role = MOCK_ROLE_PERMISSIONS.find((r) => r.roleKey === employee.roleKey);

  const myAssignments = MOCK_ASSIGNMENTS.filter(
    (a) => a.employeeId === employee.id,
  );
  const currentAssignments = myAssignments.filter(
    (a) =>
      a.status === "active" || a.status === "pending" || a.status === "overdue",
  );
  const upcomingDeadlines = getAssignmentsDueSoon(
    myAssignments,
    ADMIN_REFERENCE_DATE,
    7,
  );
  const overdueAssignments = getOverdueAssignments(
    myAssignments,
    ADMIN_REFERENCE_DATE,
  );
  const pendingApprovals = MOCK_APPROVALS.filter(
    (a) => a.employeeId === employee.id && a.status === "pending",
  );
  const upcomingVacation = getUpcomingVacations(
    MOCK_VACATIONS.filter((v) => v.employeeId === employee.id),
    ADMIN_REFERENCE_DATE,
  );
  const vacationStatus = getVacationStatusLabel(
    employee,
    MOCK_VACATIONS,
    ADMIN_REFERENCE_DATE,
  );
  const workloadPct = calculateWorkloadPercentage(
    employee.assignedHours,
    employee.weeklyCapacityHours,
  );
  const productivity = buildEmployeeProfileProductivity(
    employee,
    MOCK_ASSIGNMENTS,
    ADMIN_REFERENCE_DATE,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          className="mb-0"
          title={employee.fullName}
          description="Employee profile — work information only. No sensitive personal data is shown."
        />
        <Link href="/admin/employees" className="shrink-0">
          <Button variant="secondary">Back to Employees</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Mock data:</strong> This
        profile is assembled from existing admin mock employees, assignments,
        approvals, and vacations. It will later be replaced by Supabase queries.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <CardHeader>
            <CardTitle>Employee information</CardTitle>
            <CardDescription>Internal work profile</CardDescription>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <InfoRow label="Full name" value={employee.fullName} />
            <InfoRow label="Employee number" value={employee.employeeNumber} />
            <InfoRow label="Job title" value={employee.title} />
            <InfoRow label="Role" value={employee.roleLabel} />
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="Practice area" value={employee.practiceArea} />
            <InfoRow label="Work email" value={employee.email} />
            <InfoRow label="Work phone" value={employee.phone || "—"} />
            <InfoRow
              label="Manager"
              value={
                manager ? (
                  <Link
                    href={`/admin/employees/${manager.id}`}
                    className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                  >
                    {manager.fullName}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Employment status"
              value={
                <Badge variant={statusVariant(employee.status)}>
                  {statusLabel(employee.status)}
                </Badge>
              }
            />
            <InfoRow label="Hire date" value={employee.hireDate} />
            {employee.barNumber ? (
              <InfoRow label="Bar number" value={employee.barNumber} />
            ) : null}
          </dl>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Capacity and rates</CardTitle>
            <CardDescription>
              Assigned hours are planned load; actual hours are hours worked.
            </CardDescription>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <InfoRow
              label="Weekly capacity hours"
              value={String(employee.weeklyCapacityHours)}
            />
            <InfoRow
              label="Target billable hours"
              value={String(employee.targetBillableHours)}
            />
            <InfoRow
              label="Standard billable rate"
              value={`$${employee.standardBillableRate.toFixed(2)}`}
            />
            <InfoRow
              label="Internal cost rate"
              value={
                <span>
                  ${employee.internalHourlyCostRate.toFixed(2)}{" "}
                  <Badge variant="warning">Restricted internal information</Badge>
                </span>
              }
            />
          </dl>
        </Card>
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle>Workload</CardTitle>
          <CardDescription>
            Workload % = open assigned hours ÷ weekly capacity hours.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Current workload %"
            value={`${workloadPct}%`}
            subtitle={`Assigned ${employee.assignedHours} hrs`}
          />
          <KPICard
            title="Assigned hours"
            value={String(employee.assignedHours)}
            subtitle="Planned matter load"
          />
          <KPICard
            title="Available hours"
            value={String(employee.availableWorkHours)}
            subtitle="Capacity denominator"
          />
          <KPICard
            title="Active matters"
            value={String(currentAssignments.length)}
            subtitle={`${upcomingDeadlines.length} due in 7 days · ${overdueAssignments.length} overdue`}
          />
        </div>
        <p className="mt-4 text-sm text-muted">
          Vacation / leave status:{" "}
          <span className="font-medium text-navy-900">{vacationStatus}</span>
        </p>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">
            Current Assignments
          </h2>
          <Link
            href="/admin/assignments"
            className="text-sm font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
          >
            Open assignments
          </Link>
        </div>
        {currentAssignments.length === 0 ? (
          <EmptyState
            title="No current assignments"
            description="This employee has no active, pending, or overdue matter assignments in the mock data."
            moduleLabel="Admin · Assignments"
          />
        ) : (
          <Card padding="md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <Link
                        href="/admin/assignments"
                        className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                      >
                        {assignment.matterLabel}
                      </Link>
                      <div className="text-xs text-muted">
                        {assignment.matterReference}
                      </div>
                    </TableCell>
                    <TableCell>{assignment.roleOnMatter}</TableCell>
                    <TableCell>{assignment.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">
          Upcoming Deadlines
        </h2>
        {upcomingDeadlines.length === 0 ? (
          <EmptyState
            title="No deadlines in the next 7 days"
            description="No open assignments for this employee are due within 7 days."
            moduleLabel="Admin · Deadlines"
          />
        ) : (
          <Card padding="md">
            <ul className="space-y-2">
              {upcomingDeadlines.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    href="/admin/assignments"
                    className="flex flex-col justify-between gap-1 rounded-lg border border-gray-100 px-4 py-3 text-sm hover:border-gold-500 sm:flex-row sm:items-center"
                  >
                    <span className="font-medium text-navy-900">
                      {assignment.matterLabel}
                    </span>
                    <span className="text-muted">Due {assignment.dueDate}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy-900">
            Pending Approval Requests
          </h2>
          <Link
            href="/admin/approvals"
            className="text-sm font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
          >
            Open approval queue
          </Link>
        </div>
        {pendingApprovals.length === 0 ? (
          <EmptyState
            title="No pending approvals"
            description="This employee has no pending approval requests in the mock queue."
            moduleLabel="Admin · Approvals"
          />
        ) : (
          <Card padding="md">
            <ul className="space-y-2">
              {pendingApprovals.map((approval) => (
                <li key={approval.id}>
                  <Link
                    href="/admin/approvals"
                    className="flex flex-col justify-between gap-2 rounded-lg border border-gray-100 px-4 py-3 text-sm hover:border-gold-500 sm:flex-row sm:items-center"
                  >
                    <span>
                      <span className="font-medium text-navy-900">
                        {approval.summary}
                      </span>
                      <span className="mt-1 block text-muted">
                        {approval.type.replaceAll("_", " ")} · {approval.priority}
                      </span>
                    </span>
                    <Badge
                      variant={
                        approval.priority === "urgent" ? "danger" : "warning"
                      }
                    >
                      {approval.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">
          Upcoming Approved Vacation
        </h2>
        {upcomingVacation.length === 0 ? (
          <EmptyState
            title="No upcoming approved vacation"
            description="No approved leave records are scheduled for this employee."
            moduleLabel="Admin · Leave"
          />
        ) : (
          <Card padding="md">
            <ul className="space-y-2 text-sm">
              {upcomingVacation.map((vacation) => (
                <li
                  key={vacation.id}
                  className="flex flex-col justify-between gap-1 rounded-lg border border-gray-100 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <span className="font-medium text-navy-900">
                    {vacation.days} day{vacation.days === 1 ? "" : "s"} approved
                  </span>
                  <span className="text-muted">
                    {vacation.startDate} → {vacation.endDate}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">
          Productivity Metrics
        </h2>
        <ProductivityMetrics
          profileMetrics={productivity}
          employeeName={employee.fullName}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">
          Role and Permission Summary
        </h2>
        {role ? (
          <Card padding="md">
            <CardHeader>
              <CardTitle>{role.roleLabel}</CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-2">
              <PermissionChip
                label="Manage employees"
                allowed={role.canManageEmployees}
              />
              <PermissionChip
                label="Assign matters"
                allowed={role.canAssignMatters}
              />
              <PermissionChip
                label="Approve work"
                allowed={role.canApproveWork}
              />
              <PermissionChip
                label="View workload"
                allowed={role.canViewWorkload}
              />
              <PermissionChip
                label="Manage roles"
                allowed={role.canManageRoles}
              />
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No role permissions mapped"
            description="This employee’s role key is not in the mock role matrix."
            moduleLabel="Admin · Roles"
          />
        )}
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
    </div>
  );
}

function PermissionChip({
  label,
  allowed,
}: {
  label: string;
  allowed: boolean;
}) {
  return (
    <Badge variant={allowed ? "success" : "neutral"}>
      {label}: {allowed ? "Allowed" : "Denied"}
    </Badge>
  );
}

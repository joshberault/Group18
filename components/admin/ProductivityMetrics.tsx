import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { KPICard } from "@/components/ui/KPICard";
import type {
  AdminProductivityMetric,
  EmployeeProfileProductivity,
  WorkloadCapacityStatus,
} from "@/lib/admin/types";

interface ProductivityMetricsProps {
  metrics?: AdminProductivityMetric[];
  /** Single-employee profile metrics (Employee Profile page). */
  profileMetrics?: EmployeeProfileProductivity;
  employeeName?: string;
}

function capacityBadge(status: WorkloadCapacityStatus) {
  if (status === "overloaded") {
    return <Badge variant="danger">Over capacity</Badge>;
  }
  if (status === "near_capacity") {
    return <Badge variant="warning">Near capacity</Badge>;
  }
  if (status === "on_leave") {
    return <Badge variant="neutral">Unavailable — leave</Badge>;
  }
  if (status === "inactive") {
    return <Badge variant="neutral">Unavailable — inactive</Badge>;
  }
  return <Badge variant="success">Available</Badge>;
}

/**
 * Attorney utilization table for management review.
 * Utilization uses actual hours ÷ available work hours (not estimated assigned load).
 * Restricted cost rates are never shown here.
 */
export function ProductivityMetrics({
  metrics,
  profileMetrics,
  employeeName,
}: ProductivityMetricsProps) {
  if (profileMetrics) {
    return (
      <Card padding="md">
        <CardHeader>
          <CardTitle>
            {employeeName ? `${employeeName} — productivity` : "Productivity"}
          </CardTitle>
          <CardDescription>
            Utilization = billable hours ÷ available work hours. Target
            attainment = billable hours ÷ target billable hours. Completion rate
            = completed ÷ assignments due. On-time rate = completed on/before due
            ÷ completed. Division by zero returns 0%. Mock data for now.
          </CardDescription>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Utilization rate"
            value={`${profileMetrics.utilizationRate}%`}
            subtitle={`${profileMetrics.billableHours} / ${profileMetrics.availableWorkHours} hrs`}
          />
          <KPICard
            title="Target attainment"
            value={`${profileMetrics.targetAttainment}%`}
            subtitle={`${profileMetrics.billableHours} / ${profileMetrics.targetBillableHours} target hrs`}
          />
          <KPICard
            title="Assignment completion"
            value={`${profileMetrics.assignmentCompletionRate}%`}
            subtitle={`${profileMetrics.completedAssignments} / ${profileMetrics.assignmentsDue} due`}
          />
          <KPICard
            title="On-time completion"
            value={`${profileMetrics.onTimeCompletionRate}%`}
            subtitle={`${profileMetrics.completedOnTime} on-time completed`}
          />
        </div>
      </Card>
    );
  }

  const rows = metrics ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No productivity metrics"
        description="Metrics will appear once attorney utilization data is available from Supabase."
        moduleLabel="Admin · Productivity"
      />
    );
  }

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Attorney utilization</CardTitle>
        <CardDescription>
          Management view of billable hours versus available capacity. Pro bono
          (non-billable) hours are shown separately. Assigned hours are estimated
          load — not mixed into utilization. Cost rates are not shown.
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Attorney</TableHead>
            <TableHead>Practice area</TableHead>
            <TableHead>Assigned hrs (estimated)</TableHead>
            <TableHead>Actual billable hrs</TableHead>
            <TableHead>Pro bono hrs</TableHead>
            <TableHead>Available hrs</TableHead>
            <TableHead>Utilization</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Matters closed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/admin/employees/${row.employeeId}`}
                  className="text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                >
                  {row.attorneyName}
                </Link>
              </TableCell>
              <TableCell>{row.practiceArea}</TableCell>
              <TableCell>{row.assignedHours}</TableCell>
              <TableCell>{row.actualHoursWorked}</TableCell>
              <TableCell>{row.proBonoHours}</TableCell>
              <TableCell>{row.availableWorkHours}</TableCell>
              <TableCell>
                <span
                  className={
                    row.utilizationRate > 100
                      ? "inline-flex items-center gap-1 font-medium text-red-700"
                      : row.utilizationRate >= 90
                        ? "inline-flex items-center gap-1 font-medium text-amber-800"
                        : "text-navy-900"
                  }
                >
                  {(row.utilizationRate > 100 || row.utilizationRate >= 90) && (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {row.utilizationRate}%
                  {row.utilizationRate > 100
                    ? " (over capacity)"
                    : row.utilizationRate >= 90
                      ? " (near capacity)"
                      : ""}
                </span>
              </TableCell>
              <TableCell>{capacityBadge(row.capacityStatus)}</TableCell>
              <TableCell>{row.mattersClosed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

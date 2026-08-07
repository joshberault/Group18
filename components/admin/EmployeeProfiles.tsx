"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
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
  calculateWorkloadPercentage,
  countActiveAssignmentsForEmployee,
  countPendingApprovalsForEmployee,
  deriveCapacityStatus,
  getVacationStatusLabel,
  uniquePracticeAreas,
} from "@/lib/admin/calculations";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import type { EmploymentStatus, WorkloadCapacityStatus } from "@/lib/admin/types";

function statusVariant(status: EmploymentStatus) {
  if (status === "active") return "success" as const;
  if (status === "on_leave") return "warning" as const;
  return "neutral" as const;
}

function statusLabel(status: EmploymentStatus) {
  if (status === "on_leave") return "On Leave";
  if (status === "inactive") return "Inactive";
  return "Active";
}

export function EmployeeProfiles() {
  const { data, loading, error, refresh } = useAdminData();
  const [searchName, setSearchName] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EmploymentStatus>(
    "all",
  );
  const [workloadFilter, setWorkloadFilter] = useState<
    WorkloadCapacityStatus | "all"
  >("all");

  const practiceAreas = useMemo(
    () => uniquePracticeAreas(data?.employees ?? []),
    [data?.employees],
  );

  const filtered = useMemo(() => {
    return (data?.employees ?? []).filter((employee) => {
      if (
        searchName &&
        !employee.fullName.toLowerCase().includes(searchName.toLowerCase())
      ) {
        return false;
      }
      if (roleFilter !== "all" && employee.roleKey !== roleFilter) return false;
      if (practiceFilter !== "all" && employee.practiceArea !== practiceFilter) {
        return false;
      }
      if (statusFilter !== "all" && employee.status !== statusFilter) {
        return false;
      }
      if (
        workloadFilter !== "all" &&
        deriveCapacityStatus(employee) !== workloadFilter
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [
    data?.employees,
    searchName,
    roleFilter,
    practiceFilter,
    statusFilter,
    workloadFilter,
  ]);

  function clearFilters() {
    setSearchName("");
    setRoleFilter("all");
    setPracticeFilter("all");
    setStatusFilter("all");
    setWorkloadFilter("all");
  }

  if (loading) {
    return <LoadingState message="Loading employee profiles..." />;
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load employees</CardTitle>
          <CardDescription className="text-red-700">
            {error ?? "Live firm data could not be loaded for this page."}
          </CardDescription>
        </CardHeader>
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Live firm data:</strong>{" "}
        Employee Profiles are loaded from the Supabase{" "}
        <code className="rounded bg-white/70 px-1">profiles</code> table for
        every internal role.
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle>Employee profiles</CardTitle>
          <CardDescription>
            Search and filter the firm roster, then open a profile for role and
            capacity detail.
          </CardDescription>
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            label="Search by employee name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Name"
          />
          <Select
            label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: "all", label: "All roles" },
              ...data.rolePermissions.map((role) => ({
                value: role.roleKey,
                label: role.roleLabel,
              })),
            ]}
          />
          <Select
            label="Filter by practice area"
            value={practiceFilter}
            onChange={(e) => setPracticeFilter(e.target.value)}
            options={[
              { value: "all", label: "All practice areas" },
              ...practiceAreas.map((area) => ({ value: area, label: area })),
            ]}
          />
          <Select
            label="Filter by employment status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | EmploymentStatus)
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "on_leave", label: "On Leave" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Select
            label="Filter by workload status"
            value={workloadFilter}
            onChange={(e) =>
              setWorkloadFilter(
                e.target.value as WorkloadCapacityStatus | "all",
              )
            }
            options={[
              { value: "all", label: "All workload statuses" },
              { value: "available", label: "Available (< 90%)" },
              { value: "near_capacity", label: "Near capacity (90–100%)" },
              { value: "overloaded", label: "Overloaded (> 100%)" },
              { value: "on_leave", label: "On leave" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>

        <div className="mb-4">
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No employees match your filters"
            description="Clear filters or adjust search to see staff profiles."
            moduleLabel="Admin · Employees"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee name</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Practice area</TableHead>
                <TableHead>Employment status</TableHead>
                <TableHead>Current workload %</TableHead>
                <TableHead>Active assignments</TableHead>
                <TableHead>Pending approvals</TableHead>
                <TableHead>Vacation status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((employee) => {
                const workload = calculateWorkloadPercentage(
                  employee.assignedHours,
                  employee.weeklyCapacityHours,
                );
                const activeAssignments = countActiveAssignmentsForEmployee(
                  employee.id,
                  data.assignments,
                );
                const pendingApprovals = countPendingApprovalsForEmployee(
                  employee.id,
                  data.approvals,
                );
                const vacation = getVacationStatusLabel(
                  employee,
                  data.vacations,
                  data.referenceDate,
                );

                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Link
                        href={`/admin/employees/${employee.id}`}
                        className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                      >
                        {employee.fullName}
                      </Link>
                      <div className="text-xs text-muted">{employee.email}</div>
                    </TableCell>
                    <TableCell>{employee.title}</TableCell>
                    <TableCell>{employee.roleLabel}</TableCell>
                    <TableCell>{employee.practiceArea}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(employee.status)}>
                        {statusLabel(employee.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          workload > 100
                            ? "font-medium text-red-700"
                            : workload >= 90
                              ? "font-medium text-amber-700"
                              : undefined
                        }
                      >
                        {workload}%
                      </span>
                    </TableCell>
                    <TableCell>{activeAssignments}</TableCell>
                    <TableCell>{pendingApprovals}</TableCell>
                    <TableCell>{vacation}</TableCell>
                    <TableCell>
                      <Link href={`/admin/employees/${employee.id}`}>
                        <Button size="sm" variant="secondary">
                          View Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

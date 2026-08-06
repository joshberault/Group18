"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CircleAlert,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
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
  buildWorkloadBoardRows,
  sortWorkloadBoardRows,
  uniquePracticeAreas,
  workloadBoardClassificationLabel,
} from "@/lib/admin/calculations";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import type {
  AdminWorkloadBoardRow,
  EmploymentStatus,
  WorkloadBoardClassification,
  WorkloadBoardSortKey,
  WorkloadLeaveDisplay,
} from "@/lib/admin/types";
import { USER_ROLE_LABELS } from "@/lib/types";
import { ProductivityMetrics } from "@/components/admin/ProductivityMetrics";

/** Role filter options for legal staffing on the Workload Board. */
const WORKLOAD_ROLE_FILTERS = [
  USER_ROLE_LABELS.attorney,
  USER_ROLE_LABELS.managing_partner,
  USER_ROLE_LABELS.paralegal,
] as const;

function classificationVariant(c: WorkloadBoardClassification) {
  if (c === "over_capacity") return "danger" as const;
  if (c === "near_capacity") return "warning" as const;
  if (c === "balanced") return "gold" as const;
  if (c === "unavailable") return "neutral" as const;
  return "success" as const;
}

function statusLabel(status: EmploymentStatus) {
  if (status === "on_leave") return "On leave";
  if (status === "inactive") return "Inactive";
  return "Active";
}

export function WorkloadBoard() {
  const { data, loading, error, refresh } = useAdminData();
  const [nameFilter, setNameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [employmentFilter, setEmploymentFilter] = useState<
    "all" | EmploymentStatus
  >("all");
  const [classificationFilter, setClassificationFilter] = useState<
    "all" | WorkloadBoardClassification
  >("all");
  const [leaveFilter, setLeaveFilter] = useState<"all" | WorkloadLeaveDisplay>(
    "all",
  );
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortKey, setSortKey] = useState<WorkloadBoardSortKey>("workload_high");
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      buildWorkloadBoardRows(
        data?.employees ?? [],
        data?.assignments ?? [],
        data?.vacations ?? [],
        data?.referenceDate ?? "",
      ),
    [data],
  );

  const roleOptions = useMemo(() => {
    const fromData = new Set(
      (data?.employees ?? [])
        .filter(
          (e) =>
            e.roleKey === "attorney" ||
            e.roleKey === "managing_partner" ||
            e.roleKey === "paralegal",
        )
        .map((e) => e.roleLabel),
    );
    // Always offer Attorney, Managing Partner, and Paralegal in the Role filter.
    for (const label of WORKLOAD_ROLE_FILTERS) fromData.add(label);
    return [...fromData].sort((a, b) => a.localeCompare(b));
  }, [data?.employees]);

  const practiceOptions = useMemo(() => {
    const legalStaff = (data?.employees ?? []).filter(
      (e) =>
        e.roleKey === "attorney" ||
        e.roleKey === "managing_partner" ||
        e.roleKey === "paralegal",
    );
    return uniquePracticeAreas(legalStaff);
  }, [data?.employees]);

  const filtered = useMemo(() => {
    const next = rows.filter((row) => {
      if (
        nameFilter &&
        !row.employeeName.toLowerCase().includes(nameFilter.toLowerCase())
      ) {
        return false;
      }
      if (roleFilter !== "all" && row.roleLabel !== roleFilter) return false;
      if (practiceFilter !== "all" && row.practiceArea !== practiceFilter) {
        return false;
      }
      if (
        employmentFilter !== "all" &&
        row.employmentStatus !== employmentFilter
      ) {
        return false;
      }
      if (
        classificationFilter !== "all" &&
        row.classification !== classificationFilter
      ) {
        return false;
      }
      if (leaveFilter !== "all" && row.leaveStatus !== leaveFilter) return false;
      if (overdueOnly && row.overdueCount <= 0) return false;
      return true;
    });
    return sortWorkloadBoardRows(next, sortKey);
  }, [
    rows,
    nameFilter,
    roleFilter,
    practiceFilter,
    employmentFilter,
    classificationFilter,
    leaveFilter,
    overdueOnly,
    sortKey,
  ]);

  const selected = useMemo(
    () => rows.find((r) => r.employeeId === detailId) ?? null,
    [rows, detailId],
  );

  function clearFilters() {
    setNameFilter("");
    setRoleFilter("all");
    setPracticeFilter("all");
    setEmploymentFilter("all");
    setClassificationFilter("all");
    setLeaveFilter("all");
    setOverdueOnly(false);
    setSortKey("workload_high");
  }

  if (loading) {
    return <LoadingState message="Loading workload board..." />;
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load workload</CardTitle>
          <CardDescription className="text-red-700">
            {error ?? "Live firm data could not be loaded."}
          </CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => void refresh()}
        >
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Live firm data:</strong>{" "}
        Workload for attorneys, managing partners, and paralegals. Workload % =
        open estimated assignment hours ÷ weekly capacity. Actual hours are
        shown separately and are not mixed into the percentage.
      </div>

      <Card padding="md">
        <CardHeader className="gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Workload board</CardTitle>
            <CardDescription>
              Available &lt;60% · Balanced 60–89% · Near Capacity 90–100% · Over
              Capacity &gt;100% · Unavailable = inactive or current approved
              leave. Reference date {data.referenceDate}.
            </CardDescription>
          </div>
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as WorkloadBoardSortKey)}
            options={[
              { value: "name", label: "Employee name" },
              { value: "workload_high", label: "Highest workload %" },
              { value: "workload_low", label: "Lowest workload %" },
              { value: "overdue", label: "Most overdue assignments" },
              { value: "due_soon", label: "Most due-soon assignments" },
              { value: "available_hours", label: "Most available hours" },
            ]}
          />
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            label="Employee name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Search name"
          />
          <Select
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: "all", label: "All roles" },
              ...roleOptions.map((role) => ({ value: role, label: role })),
            ]}
          />
          <Select
            label="Practice area"
            value={practiceFilter}
            onChange={(e) => setPracticeFilter(e.target.value)}
            options={[
              { value: "all", label: "All practice areas" },
              ...practiceOptions.map((area) => ({ value: area, label: area })),
            ]}
          />
          <Select
            label="Employment status"
            value={employmentFilter}
            onChange={(e) =>
              setEmploymentFilter(e.target.value as "all" | EmploymentStatus)
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "on_leave", label: "On leave" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Select
            label="Workload classification"
            value={classificationFilter}
            onChange={(e) =>
              setClassificationFilter(
                e.target.value as "all" | WorkloadBoardClassification,
              )
            }
            options={[
              { value: "all", label: "All classifications" },
              { value: "available", label: "Available" },
              { value: "balanced", label: "Balanced" },
              { value: "near_capacity", label: "Near Capacity" },
              { value: "over_capacity", label: "Over Capacity" },
              { value: "unavailable", label: "Unavailable" },
            ]}
          />
          <Select
            label="Current leave status"
            value={leaveFilter}
            onChange={(e) =>
              setLeaveFilter(e.target.value as "all" | WorkloadLeaveDisplay)
            }
            options={[
              { value: "all", label: "All leave statuses" },
              { value: "None", label: "None" },
              { value: "Current Leave", label: "Current Leave" },
              { value: "Upcoming Leave", label: "Upcoming Leave" },
              {
                value: "Leave pending approval",
                label: "Leave pending approval",
              },
            ]}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            Employees with overdue assignments
          </label>
          <Button variant="secondary" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No employees match your filters"
            description="Clear filters or adjust search criteria to see workload rows."
            moduleLabel="Admin · Workload"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Practice area</TableHead>
                  <TableHead>Employment status</TableHead>
                  <TableHead>Weekly capacity hours</TableHead>
                  <TableHead>Open assigned hours</TableHead>
                  <TableHead>Actual hours worked</TableHead>
                  <TableHead>Remaining available hours</TableHead>
                  <TableHead>Workload percentage</TableHead>
                  <TableHead>Active matter count</TableHead>
                  <TableHead>Due within 7 days</TableHead>
                  <TableHead>Overdue assignments</TableHead>
                  <TableHead>Vacation / leave</TableHead>
                  <TableHead>Workload classification</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>
                      <Link
                        href={`/admin/employees/${row.employeeId}`}
                        className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                      >
                        {row.employeeName}
                      </Link>
                      {row.warnings.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {row.warnings.slice(0, 2).map((w) => (
                            <WarningChip key={w} text={w} />
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.jobTitle}</TableCell>
                    <TableCell>{row.roleLabel}</TableCell>
                    <TableCell>{row.practiceArea}</TableCell>
                    <TableCell>{statusLabel(row.employmentStatus)}</TableCell>
                    <TableCell>{row.weeklyCapacityHours}</TableCell>
                    <TableCell>{row.openEstimatedHours}</TableCell>
                    <TableCell>{row.actualHoursWorked}</TableCell>
                    <TableCell>
                      {row.remainingAvailableHours == null
                        ? "—"
                        : row.remainingAvailableHours}
                    </TableCell>
                    <TableCell>
                      {row.workloadPercentage == null ? (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                          Data warning
                        </span>
                      ) : (
                        <span
                          className={
                            row.classification === "over_capacity"
                              ? "font-semibold text-red-700"
                              : row.classification === "near_capacity"
                                ? "font-semibold text-amber-800"
                                : "text-navy-900"
                          }
                        >
                          {row.workloadPercentage}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{row.activeMatterCount}</TableCell>
                    <TableCell>{row.dueSoonCount}</TableCell>
                    <TableCell>
                      {row.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 font-medium text-red-700">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          {row.overdueCount} overdue
                        </span>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell>
                      <LeaveCell row={row} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={classificationVariant(row.classification)}>
                        {workloadBoardClassificationLabel(row.classification)}
                      </Badge>
                      {row.classification === "over_capacity" && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700">
                          <Ban className="h-3 w-3" aria-hidden />
                          Above 100% capacity
                        </span>
                      )}
                      {row.classification === "near_capacity" && (
                        <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-800">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          90–100% capacity
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[150px] flex-col gap-1">
                        <Link href={`/admin/employees/${row.employeeId}`}>
                          <Button size="sm" variant="ghost">
                            View profile
                          </Button>
                        </Link>
                        <Link
                          href={`/admin/assignments?employeeId=${row.employeeId}`}
                          title={`Assignments for ${row.employeeName}`}
                        >
                          <Button size="sm" variant="ghost">
                            View assignments
                          </Button>
                        </Link>
                        <Link
                          href={`/admin/assignments?employeeId=${row.employeeId}&intent=new`}
                          title={`Start assignment for ${row.employeeName}`}
                        >
                          <Button size="sm" variant="secondary">
                            New assignment
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => setDetailId(row.employeeId)}
                        >
                          Workload details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <ProductivityMetrics metrics={data.productivity} />

      <p className="text-xs text-muted">
        Assignment links include <code>employeeId</code> (and{" "}
        <code>intent=new</code> for new assignment). The Assignments page does
        not yet read those query parameters — open the page and select{" "}
        <strong>the intended employee</strong> until that wiring is added.
      </p>

      <Modal
        isOpen={!!selected}
        onClose={() => setDetailId(null)}
        title={
          selected
            ? `Workload details — ${selected.employeeName}`
            : "Workload details"
        }
        description="Open estimated hours drive workload %. Actual hours are informational only."
        className="max-w-3xl"
      >
        {selected && <WorkloadDetailPanel row={selected} />}
      </Modal>
    </div>
  );
}

function LeaveCell({ row }: { row: AdminWorkloadBoardRow }) {
  if (row.leaveStatus === "Current Leave") {
    return (
      <span className="inline-flex items-center gap-1 text-navy-900">
        <CalendarClock className="h-3.5 w-3.5 text-amber-700" aria-hidden />
        Current Leave
      </span>
    );
  }
  if (row.leaveStatus === "Upcoming Leave") {
    return (
      <span className="inline-flex items-center gap-1 text-navy-900">
        <CalendarClock className="h-3.5 w-3.5 text-navy-700" aria-hidden />
        Upcoming Leave
      </span>
    );
  }
  return <span>{row.leaveStatus}</span>;
}

function WarningChip({ text }: { text: string }) {
  return (
    <span className="inline-flex max-w-[220px] items-start gap-1 text-xs text-amber-900">
      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span>{text}</span>
    </span>
  );
}

function WorkloadDetailPanel({ row }: { row: AdminWorkloadBoardRow }) {
  return (
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
      {row.warnings.map((w) => (
        <div
          key={w}
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{w}</span>
        </div>
      ))}

      <DetailGrid
        rows={[
          ["Weekly capacity", `${row.weeklyCapacityHours} hrs`],
          ["Open estimated hours", `${row.openEstimatedHours} hrs`],
          ["Actual hours worked", `${row.actualHoursWorked} hrs`],
          [
            "Remaining capacity",
            row.remainingAvailableHours == null
              ? "—"
              : `${row.remainingAvailableHours} hrs`,
          ],
          [
            "Workload percentage",
            row.workloadPercentage == null
              ? "Data warning — capacity missing/zero"
              : `${row.workloadPercentage}%`,
          ],
          ["Active matters", String(row.activeMatterCount)],
          ["Due-soon assignments", String(row.dueSoonCount)],
          ["Overdue assignments", String(row.overdueCount)],
          ["Classification", workloadBoardClassificationLabel(row.classification)],
          ["Employment status", statusLabel(row.employmentStatus)],
          [
            "Current leave",
            row.currentLeave
              ? `${row.currentLeave.startDate} → ${row.currentLeave.endDate}`
              : "None",
          ],
          [
            "Upcoming leave",
            row.upcomingLeave.length
              ? row.upcomingLeave
                  .map((v) => `${v.startDate} → ${v.endDate}`)
                  .join("; ")
              : "None",
          ],
        ]}
      />

      <div className="rounded-lg border border-gray-100 bg-surface p-3">
        <p className="mb-2 font-semibold text-navy-900">
          Practice-area distribution of assigned work
        </p>
        {row.practiceAreaDistribution.length === 0 ? (
          <p className="text-muted">No open assignments.</p>
        ) : (
          <ul className="space-y-1">
            {row.practiceAreaDistribution.map((share) => (
              <li
                key={share.practiceArea}
                className="flex justify-between gap-3 border-b border-gray-100 py-1"
              >
                <span>
                  {share.practiceArea}{" "}
                  <span className="text-muted">
                    ({share.assignmentCount} assignment
                    {share.assignmentCount === 1 ? "" : "s"})
                  </span>
                </span>
                <span className="font-medium text-navy-900">
                  {share.estimatedHours} est. hrs
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/admin/employees/${row.employeeId}`}>
          <Button variant="secondary">
            View employee profile
            <ExternalLink className="ml-1 inline h-3.5 w-3.5" aria-hidden />
          </Button>
        </Link>
        <Link
          href={`/admin/assignments?employeeId=${row.employeeId}`}
          title={`Assignments for ${row.employeeName}`}
        >
          <Button variant="secondary">View active assignments</Button>
        </Link>
        <Link
          href={`/admin/assignments?employeeId=${row.employeeId}&intent=new`}
          title={`Start assignment for ${row.employeeName}`}
        >
          <Button>Start new assignment</Button>
        </Link>
      </div>
    </div>
  );
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="space-y-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:justify-between sm:gap-4"
        >
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Users } from "lucide-react";
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
  ADMIN_REFERENCE_DATE,
  ADMIN_UI_FLAGS,
  MOCK_ASSIGNMENTS,
  MOCK_MATTERS,
  MOCK_UNASSIGNED_MATTERS,
} from "@/lib/admin/mock-data";
import type {
  AdminAssignment,
  AdminMatter,
  MatterLifecycleStatus,
} from "@/lib/admin/types";

type StaffingFilter = "all" | "staffed" | "unassigned";

function statusVariant(status: MatterLifecycleStatus) {
  if (status === "open") return "success" as const;
  if (status === "closed") return "neutral" as const;
  return "warning" as const;
}

function engagementLabel(status: AdminMatter["engagementStatus"]) {
  switch (status) {
    case "signed":
      return "Signed";
    case "pending":
      return "Pending";
    case "expired":
      return "Expired";
    default:
      return "Not required";
  }
}

function openAssignmentsFor(
  matterId: string,
  assignments: AdminAssignment[],
): AdminAssignment[] {
  return assignments.filter(
    (a) =>
      a.matterId === matterId &&
      (a.status === "active" || a.status === "pending" || a.status === "overdue"),
  );
}

export function MattersPanel() {
  const [matters, setMatters] = useState<AdminMatter[]>(() =>
    MOCK_MATTERS.map((m) => ({ ...m })),
  );
  const [hasError, setHasError] = useState(ADMIN_UI_FLAGS.forceError);
  const [search, setSearch] = useState("");
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | MatterLifecycleStatus>(
    "all",
  );
  const [staffingFilter, setStaffingFilter] = useState<StaffingFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const practiceOptions = useMemo(
    () =>
      [...new Set(matters.map((m) => m.practiceArea))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [matters],
  );

  const unassignedIds = useMemo(() => {
    const fromList = new Set(MOCK_UNASSIGNED_MATTERS.map((m) => m.id));
    for (const matter of matters) {
      if (matter.status !== "open") continue;
      const staffed = openAssignmentsFor(matter.id, MOCK_ASSIGNMENTS).length > 0;
      if (!staffed) fromList.add(matter.id);
    }
    return fromList;
  }, [matters]);

  const filtered = useMemo(() => {
    return matters.filter((matter) => {
      const haystack =
        `${matter.matterLabel} ${matter.matterReference} ${matter.clientName}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (practiceFilter !== "all" && matter.practiceArea !== practiceFilter) {
        return false;
      }
      if (statusFilter !== "all" && matter.status !== statusFilter) return false;
      const isUnassigned = unassignedIds.has(matter.id);
      if (staffingFilter === "unassigned" && !isUnassigned) return false;
      if (staffingFilter === "staffed" && isUnassigned) return false;
      return true;
    });
  }, [matters, search, practiceFilter, statusFilter, staffingFilter, unassignedIds]);

  const selected = useMemo(
    () => matters.find((m) => m.id === selectedId) ?? null,
    [matters, selectedId],
  );

  const selectedTeam = useMemo(
    () =>
      selected ? openAssignmentsFor(selected.id, MOCK_ASSIGNMENTS) : [],
    [selected],
  );

  function clearFilters() {
    setSearch("");
    setPracticeFilter("all");
    setStatusFilter("all");
    setStaffingFilter("all");
  }

  function updateStatus(matterId: string, status: MatterLifecycleStatus) {
    setMatters((prev) =>
      prev.map((m) => (m.id === matterId ? { ...m, status } : m)),
    );
    const label = matters.find((m) => m.id === matterId)?.matterReference;
    setSuccessMessage(
      `Updated ${label ?? "matter"} status to ${status} (local mock only).`,
    );
  }

  if (ADMIN_UI_FLAGS.forceLoading) {
    return <LoadingState message="Loading matters..." />;
  }

  if (hasError) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load matters</CardTitle>
          <CardDescription className="text-red-700">
            Local mock matter data could not be loaded.
          </CardDescription>
        </CardHeader>
        <Button variant="secondary" onClick={() => setHasError(false)}>
          Retry with mock data
        </Button>
      </Card>
    );
  }

  if (ADMIN_UI_FLAGS.forceEmpty || matters.length === 0) {
    return (
      <EmptyState
        title="No matters available"
        description="Matter records for staffing and engagement tracking will appear here."
        moduleLabel="Admin · Matters"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Mock data:</strong>{" "}
        Admin Matters covers engagement status, matter lifecycle, and staffing
        coverage using existing admin matter/assignment mocks. Reference date{" "}
        {ADMIN_REFERENCE_DATE}. Full CRM matter management can still wire to
        Supabase later.
      </div>

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
          <button
            type="button"
            className="ml-3 font-medium underline"
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <Card padding="md">
        <CardHeader>
          <CardTitle>Firm matters</CardTitle>
          <CardDescription>
            Matter status, engagement agreements, responsible counsel, and
            whether the matter still needs staffing.
          </CardDescription>
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label="Search matter / client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, reference, or client"
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
            label="Matter status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | MatterLifecycleStatus)
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <Select
            label="Staffing"
            value={staffingFilter}
            onChange={(e) => setStaffingFilter(e.target.value as StaffingFilter)}
            options={[
              { value: "all", label: "All staffing" },
              { value: "staffed", label: "Staffed" },
              { value: "unassigned", label: "Needs staffing" },
            ]}
          />
        </div>

        <div className="mb-4">
          <Button variant="secondary" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No matters match your filters"
            description="Clear filters or adjust search criteria."
            moduleLabel="Admin · Matters"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Practice area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Responsible attorney</TableHead>
                  <TableHead>Staffing</TableHead>
                  <TableHead>Team size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((matter) => {
                  const team = openAssignmentsFor(matter.id, MOCK_ASSIGNMENTS);
                  const needsStaffing = unassignedIds.has(matter.id);
                  return (
                    <TableRow key={matter.id}>
                      <TableCell>
                        <div className="font-medium text-navy-900">
                          {matter.matterLabel}
                        </div>
                        <div className="text-xs text-muted">
                          {matter.matterReference}
                        </div>
                        {matter.conflictWarning && (
                          <span className="mt-1 inline-flex items-start gap-1 text-xs text-amber-800">
                            <AlertTriangle
                              className="mt-0.5 h-3 w-3 shrink-0"
                              aria-hidden
                            />
                            Conflict note
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{matter.clientName}</TableCell>
                      <TableCell>{matter.practiceArea}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(matter.status)}>
                          {matter.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {engagementLabel(matter.engagementStatus)}
                      </TableCell>
                      <TableCell>{matter.openedDate}</TableCell>
                      <TableCell>
                        {matter.responsibleEmployeeId ? (
                          <Link
                            href={`/admin/employees/${matter.responsibleEmployeeId}`}
                            className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                          >
                            {matter.responsibleAttorneyName}
                          </Link>
                        ) : (
                          <span className="text-muted">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {needsStaffing ? (
                          <Badge variant="warning">Needs staffing</Badge>
                        ) : (
                          <Badge variant="success">Staffed</Badge>
                        )}
                        <div className="mt-1 text-xs capitalize text-muted">
                          Urgency: {matter.staffingUrgency}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {team.length}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[130px] flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedId(matter.id)}
                          >
                            View details
                          </Button>
                          <Link
                            href={`/admin/assignments?matterId=${matter.id}`}
                            title={`Assignments for ${matter.matterReference}`}
                          >
                            <Button size="sm" variant="secondary">
                              View assignments
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted">
        Assignment links include <code>matterId</code>. The Assignments page may
        not read that query yet — select the matter there until wiring is added.
      </p>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.matterLabel : "Matter details"}
        description={
          selected
            ? `${selected.matterReference} · ${selected.clientName}`
            : undefined
        }
        className="max-w-2xl"
      >
        {selected && (
          <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
            {selected.conflictWarning && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{selected.conflictWarning}</span>
              </div>
            )}

            <dl className="space-y-2">
              {[
                ["Practice area", selected.practiceArea],
                ["Status", selected.status],
                [
                  "Engagement agreement",
                  engagementLabel(selected.engagementStatus),
                ],
                ["Engagement date", selected.engagementDate ?? "—"],
                ["Opened", selected.openedDate],
                [
                  "Responsible attorney",
                  selected.responsibleAttorneyName ?? "Unassigned",
                ],
                ["Staffing urgency", selected.staffingUrgency],
                [
                  "Staffing coverage",
                  unassignedIds.has(selected.id)
                    ? "Needs staffing"
                    : "Staffed",
                ],
                ["Summary", selected.summary],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:justify-between sm:gap-4"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-medium text-navy-900 sm:max-w-[60%] sm:text-right">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="rounded-lg border border-gray-100 bg-surface p-3">
              <p className="mb-2 font-semibold text-navy-900">
                Current staffing assignments
              </p>
              {selectedTeam.length === 0 ? (
                <p className="text-muted">
                  No open assignments. Use Assignments to staff this matter.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedTeam.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <Link
                          href={`/admin/employees/${a.employeeId}`}
                          className="font-medium text-navy-900 underline-offset-2 hover:underline"
                        >
                          {a.attorneyName}
                        </Link>
                        <div className="text-xs text-muted">
                          {a.roleOnMatter} · due {a.dueDate}
                        </div>
                      </div>
                      <Badge
                        variant={
                          a.status === "overdue" ? "danger" : "neutral"
                        }
                      >
                        {a.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-navy-900">Update matter status</p>
              <div className="flex flex-wrap gap-2">
                {(["open", "closed", "archived"] as MatterLifecycleStatus[]).map(
                  (status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={
                        selected.status === status ? "primary" : "secondary"
                      }
                      disabled={selected.status === status}
                      onClick={() => updateStatus(selected.id, status)}
                    >
                      Mark {status}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedId(null)}>
                Close
              </Button>
              <Link href={`/admin/assignments?matterId=${selected.id}`}>
                <Button>Go to assignments</Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

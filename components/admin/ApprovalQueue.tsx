"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/Textarea";
import {
  countBusinessDaysAge,
  getConflictingAssignmentsForVacation,
  hasOverlappingApprovedVacation,
  isApprovalAgingOverdue,
  sortApprovalsForQueue,
} from "@/lib/admin/calculations";
import {
  ADMIN_REFERENCE_DATE,
  ADMIN_UI_FLAGS,
  MOCK_APPROVALS,
  MOCK_ASSIGNMENTS,
  MOCK_EMPLOYEES,
  MOCK_MATTERS,
  MOCK_VACATIONS,
} from "@/lib/admin/mock-data";
import { invoiceApprovedBillableTime } from "@/lib/billing/approved-time-billing";
import {
  getMergedApprovals,
  isDemoSessionApproval,
  resolveDemoTimeApproval,
  subscribeTimeWorkflow,
} from "@/lib/demo/time-workflow-store";
import type {
  AdminApproval,
  AdminEmployee,
  AdminVacation,
  ApprovalPriority,
  ApprovalStatus,
  ApprovalType,
} from "@/lib/admin/types";

type ModalMode = "view" | "confirm_approve" | "confirm_reject" | "confirm_return" | null;

const TYPE_LABELS: Record<ApprovalType, string> = {
  time_entry: "Time Entry",
  expense: "Expense",
  vacation: "Vacation",
  write_down: "Write-Down",
  additional_work: "Additional Work",
  matter_closure: "Matter Closure",
  reassignment: "Reassignment",
};

const LARGE_EXPENSE = 1000;
const HIGH_DAILY_HOURS = 12;

function statusVariant(status: ApprovalStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "returned") return "warning" as const;
  return "gold" as const;
}

function priorityVariant(priority: ApprovalPriority) {
  return priority === "urgent" ? ("danger" as const) : ("neutral" as const);
}

function typeLabel(type: ApprovalType) {
  return TYPE_LABELS[type] ?? type;
}

export function ApprovalQueue() {
  const [approvals, setApprovals] = useState<AdminApproval[]>(() =>
    getMergedApprovals().map((row) => ({ ...row })),
  );

  useEffect(() => {
    return subscribeTimeWorkflow(() => {
      setApprovals((prev) => {
        const edited = new Map(prev.map((row) => [row.id, row]));
        return getMergedApprovals().map((row) => edited.get(row.id) ?? row);
      });
    });
  }, []);
  const [employees, setEmployees] = useState<AdminEmployee[]>(() =>
    MOCK_EMPLOYEES.map((row) => ({ ...row })),
  );
  const [vacations, setVacations] = useState<AdminVacation[]>(() =>
    MOCK_VACATIONS.map((row) => ({ ...row })),
  );

  const [actingReviewerId, setActingReviewerId] = useState("emp-001");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchRequester, setSearchRequester] = useState("");
  const [searchMatter, setSearchMatter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ApprovalType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | ApprovalPriority>(
    "all",
  );
  const [approverFilter, setApproverFilter] = useState("all");
  const [submittedDateFilter, setSubmittedDateFilter] = useState("");
  const [agingOnly, setAgingOnly] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const processingLock = useRef(false);
  const [hasError, setHasError] = useState(ADMIN_UI_FLAGS.forceError);

  const actingReviewer = useMemo(
    () => employees.find((e) => e.id === actingReviewerId),
    [employees, actingReviewerId],
  );

  const selected = useMemo(
    () => approvals.find((a) => a.id === selectedId) ?? null,
    [approvals, selectedId],
  );

  const approverOptions = useMemo(() => {
    const names = new Map<string, string>();
    approvals.forEach((a) =>
      names.set(a.assignedApproverId, a.assignedApproverName),
    );
    return [...names.entries()];
  }, [approvals]);

  const filtered = useMemo(() => {
    const rows = approvals.filter((row) => {
      const age = countBusinessDaysAge(row.submittedAt, ADMIN_REFERENCE_DATE);
      if (
        searchTitle &&
        !row.title.toLowerCase().includes(searchTitle.toLowerCase())
      ) {
        return false;
      }
      if (
        searchRequester &&
        !row.submittedBy.toLowerCase().includes(searchRequester.toLowerCase())
      ) {
        return false;
      }
      if (
        searchMatter &&
        !`${row.matterLabel ?? ""} ${row.matterReference ?? ""}`
          .toLowerCase()
          .includes(searchMatter.toLowerCase())
      ) {
        return false;
      }
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (priorityFilter !== "all" && row.priority !== priorityFilter) {
        return false;
      }
      if (
        approverFilter !== "all" &&
        row.assignedApproverId !== approverFilter
      ) {
        return false;
      }
      if (
        submittedDateFilter &&
        !row.submittedAt.startsWith(submittedDateFilter)
      ) {
        return false;
      }
      if (
        agingOnly &&
        (row.status !== "pending" || !isApprovalAgingOverdue(age))
      ) {
        return false;
      }
      return true;
    });
    return sortApprovalsForQueue(rows);
  }, [
    approvals,
    searchTitle,
    searchRequester,
    searchMatter,
    typeFilter,
    statusFilter,
    priorityFilter,
    approverFilter,
    submittedDateFilter,
    agingOnly,
  ]);

  function clearFilters() {
    setSearchTitle("");
    setSearchRequester("");
    setSearchMatter("");
    setTypeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setApproverFilter("all");
    setSubmittedDateFilter("");
    setAgingOnly(false);
  }

  function openView(row: AdminApproval) {
    setSelectedId(row.id);
    setReviewNotes("");
    setNotesError(null);
    setActionError(null);
    setModalMode("view");
  }

  function closeModal() {
    if (processingId) return;
    setModalMode(null);
    setSelectedId(null);
    setReviewNotes("");
    setNotesError(null);
    setActionError(null);
  }

  function assertCanReview(row: AdminApproval): string | null {
    if (!actingReviewer) return "Select an acting reviewer.";
    if (row.employeeId === actingReviewer.id) {
      return "A requester cannot approve, reject, or return their own request.";
    }
    if (row.status !== "pending" && row.status !== "returned") {
      return "Only pending or returned requests can be reviewed.";
    }
    return null;
  }

  function beginDecision(
    row: AdminApproval,
    mode: "confirm_approve" | "confirm_reject" | "confirm_return",
  ) {
    const blocked = assertCanReview(row);
    if (blocked) {
      setActionError(blocked);
      setSelectedId(row.id);
      setModalMode("view");
      return;
    }
    setSelectedId(row.id);
    setReviewNotes("");
    setNotesError(null);
    setActionError(null);
    setModalMode(mode);
  }

  function applyDecision(decision: "approved" | "rejected" | "returned") {
    if (!selected || !actingReviewer || processingLock.current) return;

    const blocked = assertCanReview(selected);
    if (blocked) {
      setActionError(blocked);
      return;
    }

    if (
      (decision === "rejected" || decision === "returned") &&
      !reviewNotes.trim()
    ) {
      setNotesError("Review notes are required for this decision.");
      return;
    }

    if (
      decision === "approved" &&
      selected.type === "time_entry" &&
      (selected.timeEntryHours == null || selected.timeEntryHours <= 0)
    ) {
      setActionError("Hours must be greater than zero for time-entry approval.");
      return;
    }

    if (
      decision === "approved" &&
      selected.type === "vacation" &&
      selected.vacationStartDate &&
      selected.vacationEndDate &&
      new Date(selected.vacationEndDate) < new Date(selected.vacationStartDate)
    ) {
      setActionError("End date cannot be before start date.");
      return;
    }

    let approvedInvoice:
      | { invoiceNumber: string; amount: number; alreadyInvoiced: boolean }
      | undefined;
    if (
      decision === "approved" &&
      selected.type === "time_entry" &&
      selected.timeEntryBillable
    ) {
      const employee = employees.find((row) => row.id === selected.employeeId);
      const matter = MOCK_MATTERS.find((row) => row.id === selected.matterId);
      if (!employee || !matter) {
        setActionError(
          "The employee or matter record needed to create the invoice was not found.",
        );
        return;
      }

      const billingResult = invoiceApprovedBillableTime({
        approval: selected,
        employee,
        matter,
        invoiceDate: ADMIN_REFERENCE_DATE,
      });
      if (!billingResult.ok) {
        setActionError(billingResult.error);
        return;
      }
      approvedInvoice = billingResult;
    }

    processingLock.current = true;
    setProcessingId(selected.id);
    const reviewedAt = `${ADMIN_REFERENCE_DATE}T18:00:00Z`;
    const title = selected.title;
    const reviewerName = actingReviewer.fullName;

    if (isDemoSessionApproval(selected.id) && selected.type === "time_entry") {
      resolveDemoTimeApproval(
        selected.id,
        decision,
        reviewerName,
        reviewNotes.trim() || undefined,
      );
    }

    setApprovals((prev) =>
      prev.map((row) => {
        if (row.id !== selected.id) return row;
        // Preserve original submitted fields; only attach review metadata + status.
        return {
          ...row,
          status:
            decision === "approved"
              ? "approved"
              : decision === "rejected"
                ? "rejected"
                : "returned",
          decision,
          reviewerId: actingReviewer.id,
          reviewerName,
          reviewedAt,
          reviewNotes: reviewNotes.trim() || undefined,
        };
      }),
    );

    if (decision === "approved" && selected.type === "vacation") {
      const startDate = selected.vacationStartDate;
      const endDate = selected.vacationEndDate;
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selected.employeeId
            ? {
                ...emp,
                status: "on_leave",
                availableWorkHours: 0,
                assignedHours: emp.assignedHours,
              }
            : emp,
        ),
      );
      if (startDate && endDate) {
        const practiceArea =
          employees.find((e) => e.id === selected.employeeId)?.practiceArea ??
          "Administration";
        setVacations((prev) => [
          ...prev,
          {
            id: `vac-apr-${selected.id}`,
            employeeId: selected.employeeId,
            employeeName: selected.submittedBy,
            practiceArea,
            startDate,
            endDate,
            status: "approved",
            days: selected.vacationWorkdays ?? 0,
          },
        ]);
      }
    }

    const invoiceMessage = approvedInvoice
      ? ` Invoice ${approvedInvoice.invoiceNumber} was ${approvedInvoice.alreadyInvoiced ? "already present" : "created"} for ${new Intl.NumberFormat(
          "en-US",
          { style: "currency", currency: "USD" },
        ).format(approvedInvoice.amount)}, and the client was notified.`
      : "";
    setSuccessMessage(
      `${decision === "approved" ? "Approved" : decision === "rejected" ? "Rejected" : "Returned"} “${title}” as ${reviewerName}.${invoiceMessage}`,
    );
    processingLock.current = false;
    setProcessingId(null);
    setModalMode(null);
    setSelectedId(null);
    setReviewNotes("");
    setNotesError(null);
    setActionError(null);
  }

  const vacationConflicts = useMemo(() => {
    if (!selected || selected.type !== "vacation") return null;
    if (!selected.vacationStartDate || !selected.vacationEndDate) return null;
    const conflicts = getConflictingAssignmentsForVacation(
      selected.employeeId,
      selected.vacationStartDate,
      selected.vacationEndDate,
      MOCK_ASSIGNMENTS,
    );
    const overlapVacation = hasOverlappingApprovedVacation(
      selected.employeeId,
      selected.vacationStartDate,
      selected.vacationEndDate,
      vacations,
    );
    const coverageProblem =
      !selected.backupEmployeeId && conflicts.length > 0;
    return { conflicts, overlapVacation, coverageProblem };
  }, [selected, vacations]);

  if (ADMIN_UI_FLAGS.forceLoading) {
    return <LoadingState message="Loading approval queue..." />;
  }

  if (hasError) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load approvals</CardTitle>
          <CardDescription className="text-red-700">
            Local mock approval data could not be loaded.
          </CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => {
            setHasError(false);
            setApprovals(MOCK_APPROVALS.map((row) => ({ ...row })));
          }}
        >
          Retry with mock data
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Mock data:</strong>{" "}
        Approval Queue uses existing admin mock requests. Decisions update local
        page state only. Original submitted details are preserved after review.
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
        <CardHeader className="gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>
              Urgent requests first; oldest within the same priority. Aging over
              3 business days is flagged.
            </CardDescription>
          </div>
          <Select
            label="Acting as reviewer"
            value={actingReviewerId}
            onChange={(e) => setActingReviewerId(e.target.value)}
            options={employees
              .filter((e) => e.status !== "inactive")
              .map((e) => ({
                value: e.id,
                label: `${e.fullName} (${e.roleLabel})`,
              }))}
          />
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            label="Search request title"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
          />
          <Input
            label="Search requested employee"
            value={searchRequester}
            onChange={(e) => setSearchRequester(e.target.value)}
          />
          <Input
            label="Search related matter"
            value={searchMatter}
            onChange={(e) => setSearchMatter(e.target.value)}
          />
          <Select
            label="Approval type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | ApprovalType)}
            options={[
              { value: "all", label: "All types" },
              ...Object.entries(TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | ApprovalStatus)
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "returned", label: "Returned" },
            ]}
          />
          <Select
            label="Priority"
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as "all" | ApprovalPriority)
            }
            options={[
              { value: "all", label: "All priorities" },
              { value: "urgent", label: "Urgent" },
              { value: "normal", label: "Normal" },
            ]}
          />
          <Select
            label="Assigned approver"
            value={approverFilter}
            onChange={(e) => setApproverFilter(e.target.value)}
            options={[
              { value: "all", label: "All approvers" },
              ...approverOptions.map(([id, name]) => ({
                value: id,
                label: name,
              })),
            ]}
          />
          <Input
            label="Submission date"
            type="date"
            value={submittedDateFilter}
            onChange={(e) => setSubmittedDateFilter(e.target.value)}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={agingOnly}
              onChange={(e) => setAgingOnly(e.target.checked)}
            />
            Pending more than 3 business days
          </label>
          <Button variant="secondary" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No approval requests match your filters"
            description="Clear filters or adjust search criteria to see requests."
            moduleLabel="Admin · Approvals"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request title</TableHead>
                <TableHead>Approval type</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Related matter</TableHead>
                <TableHead>Amount or hours</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned approver</TableHead>
                <TableHead>Date submitted</TableHead>
                <TableHead>Age of request</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const age = countBusinessDaysAge(
                  row.submittedAt,
                  ADMIN_REFERENCE_DATE,
                );
                const aging = isApprovalAgingOverdue(age);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium text-navy-900">{row.title}</div>
                      {aging && row.status === "pending" && (
                        <Badge variant="danger" className="mt-1">
                          &gt;3 business days
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{typeLabel(row.type)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/employees/${row.employeeId}`}
                        className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                      >
                        {row.submittedBy}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.matterReference ? (
                        <Link
                          href="/admin/assignments"
                          className="text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                        >
                          <div className="font-medium">
                            {row.matterLabel}
                          </div>
                          <div className="text-xs text-muted">
                            {row.matterReference}
                          </div>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{row.amountOrHours ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant(row.priority)}>
                        {row.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.assignedApproverName}</TableCell>
                    <TableCell>
                      {new Date(row.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          aging && row.status === "pending"
                            ? "font-medium text-red-700"
                            : undefined
                        }
                      >
                        {age} business day{age === 1 ? "" : "s"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[120px] flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openView(row)}
                        >
                          View
                        </Button>
                        {(row.status === "pending" ||
                          row.status === "returned") && (
                          <>
                            <Button
                              size="sm"
                              disabled={processingId === row.id}
                              onClick={() =>
                                beginDecision(row, "confirm_approve")
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={processingId === row.id}
                              onClick={() =>
                                beginDecision(row, "confirm_reject")
                              }
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={processingId === row.id}
                              onClick={() =>
                                beginDecision(row, "confirm_return")
                              }
                            >
                              Return
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={modalMode === "view" && !!selected}
        onClose={closeModal}
        title="Approval request details"
        description="Original submitted information is preserved after review."
        className="max-w-3xl"
      >
        {selected && (
          <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
            {actionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                {actionError}
              </div>
            )}
            <DetailGrid
              rows={[
                ["Title", selected.title],
                ["Type", typeLabel(selected.type)],
                ["Requested by", selected.submittedBy],
                ["Status", selected.status],
                ["Priority", selected.priority],
                ["Assigned approver", selected.assignedApproverName],
                [
                  "Submitted",
                  new Date(selected.submittedAt).toLocaleString(),
                ],
                ["Original snapshot", selected.originalSnapshot],
                [
                  "Related matter",
                  selected.matterReference
                    ? `${selected.matterLabel} (${selected.matterReference})`
                    : "—",
                ],
              ]}
            />

            {selected.type === "time_entry" && (
              <TypeSection title="Time entry details">
                <DetailGrid
                  rows={[
                    ["Date worked", selected.timeEntryDate ?? "—"],
                    ["Hours", String(selected.timeEntryHours ?? "—")],
                    [
                      "Billable",
                      selected.timeEntryBillable == null
                        ? "—"
                        : selected.timeEntryBillable
                          ? "Billable"
                          : "Non-billable",
                    ],
                    ["Description", selected.timeEntryDescription ?? "—"],
                  ]}
                />
                {(selected.timeEntryHours ?? 0) > HIGH_DAILY_HOURS && (
                  <Alert>
                    Warning: unusually high daily hours (
                    {selected.timeEntryHours}).
                  </Alert>
                )}
                {(selected.matterStatus === "closed" ||
                  selected.matterStatus === "archived") && (
                  <Alert>
                    Warning: time entry submitted against a{" "}
                    {selected.matterStatus} matter.
                  </Alert>
                )}
              </TypeSection>
            )}

            {selected.type === "expense" && (
              <TypeSection title="Expense details">
                <DetailGrid
                  rows={[
                    [
                      "Expense amount",
                      selected.expenseAmount != null
                        ? `$${selected.expenseAmount.toFixed(2)}`
                        : "—",
                    ],
                    ["Category", selected.expenseCategory ?? "—"],
                    ["Business purpose", selected.expensePurpose ?? "—"],
                    ["Receipt status", selected.receiptStatus ?? "—"],
                    [
                      "Related matter",
                      selected.matterReference
                        ? `${selected.matterLabel} (${selected.matterReference})`
                        : "Missing — required for matter-specific expenses",
                    ],
                  ]}
                />
                {selected.receiptStatus === "missing" && (
                  <Alert>Warning: supporting documentation is missing.</Alert>
                )}
                {(selected.expenseAmount ?? 0) >= LARGE_EXPENSE && (
                  <Alert>
                    Flag: unusually large expense ($
                    {selected.expenseAmount?.toFixed(2)}).
                  </Alert>
                )}
                {!selected.matterId && (
                  <Alert>
                    Warning: matter-specific expenses should include a related
                    matter.
                  </Alert>
                )}
              </TypeSection>
            )}

            {selected.type === "vacation" && (
              <TypeSection title="Vacation details">
                <DetailGrid
                  rows={[
                    ["Start date", selected.vacationStartDate ?? "—"],
                    ["End date", selected.vacationEndDate ?? "—"],
                    ["Workdays", String(selected.vacationWorkdays ?? "—")],
                    ["Employee comments", selected.vacationComments ?? "—"],
                    [
                      "Backup employee",
                      selected.backupEmployeeName ?? "None listed",
                    ],
                  ]}
                />
                {selected.vacationStartDate &&
                  selected.vacationEndDate &&
                  new Date(selected.vacationEndDate) <
                    new Date(selected.vacationStartDate) && (
                    <Alert>Error: end date cannot be before start date.</Alert>
                  )}
                {vacationConflicts?.overlapVacation && (
                  <Alert>
                    Warning: overlapping approved vacation already exists for
                    this employee.
                  </Alert>
                )}
                {vacationConflicts && vacationConflicts.conflicts.length > 0 && (
                  <Alert>
                    Warning: vacation overlaps {vacationConflicts.conflicts.length}{" "}
                    active assignment/deadline
                    {vacationConflicts.conflicts.length === 1 ? "" : "s"} (
                    {vacationConflicts.conflicts
                      .map((c) => `${c.matterReference} due ${c.dueDate}`)
                      .join("; ")}
                    ).
                  </Alert>
                )}
                {vacationConflicts?.coverageProblem && (
                  <Alert>
                    Coverage problem: approving leave would leave conflicting
                    matters without a backup employee.
                  </Alert>
                )}
              </TypeSection>
            )}

            {selected.requestDetails && (
              <TypeSection title="Request details">
                <p className="text-navy-900">{selected.requestDetails}</p>
              </TypeSection>
            )}

            {selected.decision && (
              <TypeSection title="Review record">
                <DetailGrid
                  rows={[
                    ["Reviewer", selected.reviewerName ?? "—"],
                    [
                      "Reviewed",
                      selected.reviewedAt
                        ? new Date(selected.reviewedAt).toLocaleString()
                        : "—",
                    ],
                    ["Decision", selected.decision],
                    ["Notes", selected.reviewNotes ?? "—"],
                  ]}
                />
              </TypeSection>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={closeModal}>
                Close
              </Button>
              {(selected.status === "pending" ||
                selected.status === "returned") && (
                <>
                  <Button
                    disabled={!!processingId}
                    onClick={() => beginDecision(selected, "confirm_approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!!processingId}
                    onClick={() => beginDecision(selected, "confirm_reject")}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!!processingId}
                    onClick={() => beginDecision(selected, "confirm_return")}
                  >
                    Return
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <DecisionModal
        open={modalMode === "confirm_approve"}
        title="Confirm approval"
        description={
          selected?.type === "time_entry" && selected.timeEntryBillable
            ? "Final approval will calculate the title-based fee, add a sent invoice, and notify the client."
            : "Final approval will update local status and preserve the original submission."
        }
        notesRequired={false}
        reviewNotes={reviewNotes}
        notesError={notesError}
        actionError={actionError}
        processing={!!processingId}
        onNotesChange={setReviewNotes}
        onCancel={closeModal}
        onConfirm={() => applyDecision("approved")}
        confirmLabel="Confirm approve"
        warnings={selected ? buildApprovalWarnings(selected, vacationConflicts) : []}
      />
      <DecisionModal
        open={modalMode === "confirm_reject"}
        title="Confirm rejection"
        description="Rejection requires review notes. Original request details are preserved."
        notesRequired
        reviewNotes={reviewNotes}
        notesError={notesError}
        actionError={actionError}
        processing={!!processingId}
        onNotesChange={setReviewNotes}
        onCancel={closeModal}
        onConfirm={() => applyDecision("rejected")}
        confirmLabel="Confirm reject"
        danger
      />
      <DecisionModal
        open={modalMode === "confirm_return"}
        title="Return for correction"
        description="Returning a request requires review notes explaining what to correct."
        notesRequired
        reviewNotes={reviewNotes}
        notesError={notesError}
        actionError={actionError}
        processing={!!processingId}
        onNotesChange={setReviewNotes}
        onCancel={closeModal}
        onConfirm={() => applyDecision("returned")}
        confirmLabel="Confirm return"
      />
    </div>
  );
}

function buildApprovalWarnings(
  row: AdminApproval,
  vacationConflicts: {
    conflicts: { matterReference: string; dueDate: string }[];
    overlapVacation: boolean;
    coverageProblem: boolean;
  } | null,
): string[] {
  const warnings: string[] = [];
  if (row.type === "time_entry") {
    if (row.timeEntryHours == null || row.timeEntryHours <= 0) {
      warnings.push("Hours must be greater than zero — approval will be blocked.");
    } else if (row.timeEntryHours > HIGH_DAILY_HOURS) {
      warnings.push(`Unusually high daily hours (${row.timeEntryHours}).`);
    }
    if (row.matterStatus === "closed" || row.matterStatus === "archived") {
      warnings.push(`Time entry is against a ${row.matterStatus} matter.`);
    }
  }
  if (row.type === "expense") {
    if (row.receiptStatus === "missing") {
      warnings.push("Supporting documentation is missing.");
    }
    if ((row.expenseAmount ?? 0) >= LARGE_EXPENSE) {
      warnings.push(`Unusually large expense ($${(row.expenseAmount ?? 0).toFixed(2)}).`);
    }
    if (!row.matterId) {
      warnings.push("Matter-specific expenses should include a related matter.");
    }
  }
  if (row.type === "vacation") {
    if (
      row.vacationStartDate &&
      row.vacationEndDate &&
      new Date(row.vacationEndDate) < new Date(row.vacationStartDate)
    ) {
      warnings.push("End date cannot be before start date — approval will be blocked.");
    }
    if (vacationConflicts?.overlapVacation) {
      warnings.push("Overlapping approved vacation already exists.");
    }
    if (vacationConflicts && vacationConflicts.conflicts.length > 0) {
      warnings.push(
        `Overlaps ${vacationConflicts.conflicts.length} assignment/deadline(s): ${vacationConflicts.conflicts
          .map((c) => `${c.matterReference} due ${c.dueDate}`)
          .join("; ")}.`,
      );
    }
    if (vacationConflicts?.coverageProblem) {
      warnings.push(
        "Approving leave may leave conflicting matters without coverage (no backup).",
      );
    }
  }
  return warnings;
}

function DecisionModal({
  open,
  title,
  description,
  notesRequired,
  reviewNotes,
  notesError,
  actionError,
  processing,
  onNotesChange,
  onCancel,
  onConfirm,
  confirmLabel,
  danger,
  warnings = [],
}: {
  open: boolean;
  title: string;
  description: string;
  notesRequired: boolean;
  reviewNotes: string;
  notesError: string | null;
  actionError: string | null;
  processing: boolean;
  onNotesChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  danger?: boolean;
  warnings?: string[];
}) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title} description={description}>
      <div className="space-y-3">
        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {actionError}
          </div>
        )}
        {warnings.map((warning) => (
          <Alert key={warning}>{warning}</Alert>
        ))}
        <Textarea
          label={
            notesRequired
              ? "Review notes (required)"
              : "Approval notes (optional)"
          }
          value={reviewNotes}
          error={notesError ?? undefined}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={processing}
          >
            {processing ? "Processing…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TypeSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-surface p-3">
      <p className="mb-2 font-semibold text-navy-900">{title}</p>
      <div className="space-y-2">{children}</div>
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

function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
      {children}
    </div>
  );
}

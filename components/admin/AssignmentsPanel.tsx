"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  calculateWorkloadPercentage,
  evaluateAssignmentConflicts,
  findDuplicateActiveAssignment,
  getVacationStatusLabel,
  uniquePracticeAreas,
} from "@/lib/admin/calculations";
import {
  createMatterAssignment,
  deleteMatterAssignment,
  fetchAdminAssignmentsCatalog,
  updateMatterAssignment,
} from "@/lib/admin/assignments-supabase";
import {
  ADMIN_REFERENCE_DATE,
  ADMIN_UI_FLAGS,
} from "@/lib/admin/mock-data";
import type {
  AdminAssignment,
  AdminEmployee,
  AdminMatter,
  AssignmentPriority,
  AssignmentStatus,
} from "@/lib/admin/types";

/** Live staff profiles don't share mock vacation IDs — skip seed vacation checks. */
const LIVE_VACATIONS: import("@/lib/admin/types").AdminVacation[] = [];

type ModalMode =
  | "view"
  | "create"
  | "edit"
  | "reassign"
  | "cancel"
  | "confirm_overload"
  | "confirm_vacation"
  | "confirm_duplicate"
  | "confirm_closed_matter"
  | null;

interface AssignmentFormState {
  matterId: string;
  employeeId: string;
  roleOnMatter: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  assignedDate: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  managerInstructions: string;
  cancelReason: string;
  authorizeClosedMatter: boolean;
  confirmDuplicate: boolean;
  duplicateReason: string;
  confirmOverload: boolean;
  confirmVacationConflict: boolean;
}

type FormErrors = Partial<Record<keyof AssignmentFormState, string>> & {
  form?: string;
};

const ROLE_OPTIONS = [
  "Lead Counsel",
  "Deal Counsel",
  "Supervising Partner",
  "Partner",
  "IP Counsel",
  "Associate",
  "Of Counsel",
];

function emptyForm(defaultMatterId = ""): AssignmentFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    matterId: defaultMatterId,
    employeeId: "",
    roleOnMatter: "Lead Counsel",
    priority: "medium",
    status: "active",
    assignedDate: today,
    startDate: today,
    dueDate: today,
    estimatedHours: "20",
    managerInstructions: "",
    cancelReason: "",
    authorizeClosedMatter: false,
    confirmDuplicate: false,
    duplicateReason: "",
    confirmOverload: false,
    confirmVacationConflict: false,
  };
}

function assignmentToForm(assignment: AdminAssignment): AssignmentFormState {
  return {
    matterId: assignment.matterId,
    employeeId: assignment.employeeId,
    roleOnMatter: assignment.roleOnMatter,
    priority: assignment.priority,
    status: assignment.status === "canceled" ? "active" : assignment.status,
    assignedDate: assignment.assignedDate,
    startDate: assignment.startDate,
    dueDate: assignment.dueDate,
    estimatedHours: String(assignment.estimatedHours),
    managerInstructions: assignment.managerInstructions ?? "",
    cancelReason: "",
    authorizeClosedMatter: false,
    confirmDuplicate: false,
    duplicateReason: "",
    confirmOverload: false,
    confirmVacationConflict: false,
  };
}

function statusVariant(status: AssignmentStatus) {
  if (status === "active") return "success" as const;
  if (status === "pending") return "warning" as const;
  if (status === "overdue") return "danger" as const;
  if (status === "canceled") return "neutral" as const;
  return "gold" as const;
}

function priorityVariant(priority: AssignmentPriority) {
  if (priority === "urgent") return "danger" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "gold" as const;
  return "neutral" as const;
}

function workloadImpactLabel(
  estimatedHours: number,
  weeklyCapacity: number,
): string {
  if (weeklyCapacity <= 0) return `${estimatedHours} hrs (no capacity)`;
  const pts = Math.round((estimatedHours / weeklyCapacity) * 1000) / 10;
  return `+${estimatedHours} hrs (~${pts}% of capacity)`;
}

export function AssignmentsPanel() {
  const [matters, setMatters] = useState<AdminMatter[]>([]);
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchMatter, setSearchMatter] = useState("");
  const [searchEmployee, setSearchEmployee] = useState("");
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AssignmentStatus>(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | AssignmentPriority
  >("all");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AssignmentFormState>(() => emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(ADMIN_UI_FLAGS.forceError);
  const [pendingSave, setPendingSave] = useState<AdminAssignment | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    const result = await fetchAdminAssignmentsCatalog();
    setMatters(result.matters);
    setEmployees(result.employees);
    setAssignments(result.assignments);
    setCatalogError(result.error);
    setHasError(ADMIN_UI_FLAGS.forceError || Boolean(result.error && result.matters.length === 0));
    setLoadingCatalog(false);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const practiceAreas = useMemo(
    () => uniquePracticeAreas(employees),
    [employees],
  );

  const selected = useMemo(
    () => assignments.find((a) => a.id === selectedId) ?? null,
    [assignments, selectedId],
  );

  const selectedMatter = useMemo(
    () => matters.find((m) => m.id === form.matterId),
    [matters, form.matterId],
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === form.employeeId),
    [employees, form.employeeId],
  );

  const impactPreview = useMemo(() => {
    if (!selectedEmployee || !form.startDate || !form.dueDate) return null;
    const est = Number(form.estimatedHours) || 0;
    const priorEst =
      modalMode === "edit" || modalMode === "reassign"
        ? selected?.estimatedHours ?? 0
        : 0;
    const conflicts = evaluateAssignmentConflicts({
      employee: selectedEmployee,
      estimatedHours: est,
      priorEstimatedHours: priorEst,
      startDate: form.startDate,
      dueDate: form.dueDate,
      vacations: LIVE_VACATIONS,
    });
    const projectedAssigned = Math.max(
      0,
      selectedEmployee.assignedHours - priorEst + est,
    );
    const vacationStatus = getVacationStatusLabel(
      selectedEmployee,
      LIVE_VACATIONS,
      ADMIN_REFERENCE_DATE,
    );
    return {
      weeklyCapacity: selectedEmployee.weeklyCapacityHours,
      currentAssigned: selectedEmployee.assignedHours,
      projectedAssigned,
      projectedPct: conflicts.workloadPercent,
      vacationStatus,
      conflicts,
      active: selectedEmployee.status === "active",
      onLeave: selectedEmployee.status === "on_leave",
      employeePractice: selectedEmployee.practiceArea,
      matterPractice: selectedMatter?.practiceArea ?? "",
      practiceMismatch:
        !!selectedMatter &&
        selectedEmployee.practiceArea !== selectedMatter.practiceArea,
      conflictWarning: selectedMatter?.conflictWarning,
      matterStatus: selectedMatter?.status,
    };
  }, [selectedEmployee, selectedMatter, form, modalMode, selected]);

  const filtered = useMemo(() => {
    return assignments
      .filter((row) => {
        if (
          searchMatter &&
          !`${row.matterLabel} ${row.matterReference}`
            .toLowerCase()
            .includes(searchMatter.toLowerCase())
        ) {
          return false;
        }
        if (
          searchEmployee &&
          !row.attorneyName.toLowerCase().includes(searchEmployee.toLowerCase())
        ) {
          return false;
        }
        if (practiceFilter !== "all" && row.practiceArea !== practiceFilter) {
          return false;
        }
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (priorityFilter !== "all" && row.priority !== priorityFilter) {
          return false;
        }
        if (dueDateFilter && row.dueDate !== dueDateFilter) return false;
        if (overdueOnly && row.status !== "overdue") return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime(),
      );
  }, [
    assignments,
    searchMatter,
    searchEmployee,
    practiceFilter,
    statusFilter,
    priorityFilter,
    dueDateFilter,
    overdueOnly,
  ]);

  function clearFilters() {
    setSearchMatter("");
    setSearchEmployee("");
    setPracticeFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDueDateFilter("");
    setOverdueOnly(false);
  }

  function updateField<K extends keyof AssignmentFormState>(
    key: K,
    value: AssignmentFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setSelectedId(null);
    setPendingSave(null);
    const defaultMatterId =
      matters.find((m) => m.status === "open")?.id ?? matters[0]?.id ?? "";
    setForm(emptyForm(defaultMatterId));
    setErrors({});
    setModalMode("create");
  }

  function openView(row: AdminAssignment) {
    setSelectedId(row.id);
    setForm(assignmentToForm(row));
    setErrors({});
    setModalMode("view");
  }

  function openEdit(row: AdminAssignment) {
    setSelectedId(row.id);
    setPendingSave(null);
    setForm(assignmentToForm(row));
    setErrors({});
    setModalMode("edit");
  }

  function openReassign(row: AdminAssignment) {
    setSelectedId(row.id);
    setPendingSave(null);
    setForm(assignmentToForm(row));
    setErrors({});
    setModalMode("reassign");
  }

  function openCancel(row: AdminAssignment) {
    setSelectedId(row.id);
    setForm({ ...assignmentToForm(row), cancelReason: "" });
    setErrors({});
    setModalMode("cancel");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setPendingSave(null);
    setErrors({});
  }

  function buildAssignmentFromForm(
    matter: AdminMatter,
    employee: AdminEmployee,
    existing: AdminAssignment | null,
  ): AdminAssignment {
    const estimatedHours = Number(form.estimatedHours);
    return {
      id: existing?.id ?? `asg-${String(assignments.length + 100).padStart(3, "0")}`,
      matterId: matter.id,
      matterLabel: matter.matterLabel,
      matterReference: matter.matterReference,
      clientName: matter.clientName,
      attorneyName: employee.fullName,
      employeeId: employee.id,
      roleOnMatter: form.roleOnMatter.trim(),
      practiceArea: matter.practiceArea,
      priority: form.priority,
      status: form.status === "completed" ? "active" : form.status,
      assignedDate: form.assignedDate,
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedHours,
      actualHours: existing?.actualHours,
      managerInstructions: form.managerInstructions.trim(),
      matterStatus: matter.status,
      completedDate: existing?.completedDate,
      profileId: employee.profileId,
      cancelReason: existing?.cancelReason,
    };
  }

  function validateForm(mode: ModalMode): FormErrors {
    const next: FormErrors = {};
    if (!form.matterId) next.matterId = "Matter is required.";
    if (!form.employeeId) next.employeeId = "Assigned employee is required.";
    if (!form.roleOnMatter.trim()) {
      next.roleOnMatter = "Assignment role is required.";
    }
    if (!form.assignedDate) next.assignedDate = "Assigned date is required.";
    if (!form.startDate) next.startDate = "Start date is required.";
    if (!form.dueDate) next.dueDate = "Due date is required.";
    if (
      form.startDate &&
      form.dueDate &&
      new Date(form.startDate).getTime() > new Date(form.dueDate).getTime()
    ) {
      next.startDate = "Start date cannot be after due date.";
      next.dueDate = "Due date cannot be before start date.";
    }
    const est = Number(form.estimatedHours);
    if (!form.estimatedHours || Number.isNaN(est) || est <= 0) {
      next.estimatedHours = "Estimated hours must be greater than zero.";
    }

    const employee = employees.find((e) => e.id === form.employeeId);
    if (employee && employee.status === "inactive") {
      next.employeeId = "Inactive employees cannot be assigned.";
    }

    if (mode === "cancel" && !form.cancelReason.trim()) {
      next.cancelReason = "A cancel reason is required.";
    }

    return next;
  }

  function attemptSave(mode: "create" | "edit" | "reassign") {
    const nextErrors = validateForm(mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const matter = matters.find((m) => m.id === form.matterId);
    const employee = employees.find((e) => e.id === form.employeeId);
    if (!matter || !employee) {
      setErrors({ form: "Matter and employee are required." });
      return;
    }

    if (
      (matter.status === "closed" || matter.status === "archived") &&
      !form.authorizeClosedMatter
    ) {
      setPendingSave(
        buildAssignmentFromForm(
          matter,
          employee,
          mode === "create" ? null : selected,
        ),
      );
      setModalMode("confirm_closed_matter");
      return;
    }

    const duplicate = findDuplicateActiveAssignment(assignments, {
      employeeId: employee.id,
      matterId: matter.id,
      roleOnMatter: form.roleOnMatter,
      excludeAssignmentId: mode === "create" ? undefined : selected?.id,
    });
    if (duplicate && !form.confirmDuplicate) {
      setPendingSave(
        buildAssignmentFromForm(
          matter,
          employee,
          mode === "create" ? null : selected,
        ),
      );
      setModalMode("confirm_duplicate");
      return;
    }
    if (duplicate && form.confirmDuplicate && !form.duplicateReason.trim()) {
      setErrors({
        duplicateReason:
          "A reason is required before allowing a duplicate active assignment.",
      });
      setModalMode(mode);
      return;
    }

    const priorEst = mode === "create" ? 0 : selected?.estimatedHours ?? 0;
    const conflicts = evaluateAssignmentConflicts({
      employee,
      estimatedHours: Number(form.estimatedHours),
      priorEstimatedHours: priorEst,
      startDate: form.startDate,
      dueDate: form.dueDate,
      vacations: LIVE_VACATIONS,
    });

    const pending = buildAssignmentFromForm(
      matter,
      employee,
      mode === "create" ? null : selected,
    );

    if (
      (conflicts.onLeave || conflicts.vacationOverlap) &&
      !form.confirmVacationConflict
    ) {
      setPendingSave(pending);
      setModalMode("confirm_vacation");
      return;
    }

    if (conflicts.workloadLevel === "critical" && !form.confirmOverload) {
      setPendingSave(pending);
      setModalMode("confirm_overload");
      return;
    }

    void commitSave(pending, mode);
  }

  async function commitSave(
    row: AdminAssignment,
    mode: "create" | "edit" | "reassign",
  ) {
    setSaving(true);
    setErrors({});

    if (mode === "create") {
      const result = await createMatterAssignment({
        matterId: row.matterId,
        profileId: row.employeeId,
        roleOnMatter: row.roleOnMatter,
      });
      if (result.error) {
        setSaving(false);
        setErrors({ form: result.error });
        setModalMode("create");
        return;
      }
      setSuccessMessage(
        `Created assignment for ${row.attorneyName} on ${row.matterLabel}.`,
      );
    } else {
      const result = await updateMatterAssignment({
        id: row.id,
        matterId: row.matterId,
        profileId: row.employeeId,
        roleOnMatter: row.roleOnMatter,
      });
      if (result.error) {
        setSaving(false);
        setErrors({ form: result.error });
        setModalMode(mode);
        return;
      }
      setSuccessMessage(
        mode === "reassign"
          ? `Reassigned ${row.matterLabel} to ${row.attorneyName}.`
          : `Updated assignment ${row.matterReference}.`,
      );
    }

    setSaving(false);
    closeModal();
    await loadCatalog();
  }

  function resolveSaveMode(): "create" | "edit" | "reassign" {
    if (!selectedId || !selected) return "create";
    if (form.employeeId && form.employeeId !== selected.employeeId) {
      return "reassign";
    }
    return "edit";
  }

  function continuePendingSave(
    flags: Partial<
      Pick<
        AssignmentFormState,
        | "authorizeClosedMatter"
        | "confirmDuplicate"
        | "confirmOverload"
        | "confirmVacationConflict"
      >
    >,
  ) {
    if (!pendingSave) return;
    const merged = { ...form, ...flags };
    setForm(merged);

    const matter = matters.find((m) => m.id === pendingSave.matterId);
    const employee = employees.find((e) => e.id === pendingSave.employeeId);
    if (!matter || !employee) {
      setErrors({ form: "Matter and employee are required." });
      return;
    }

    const saveMode = resolveSaveMode();

    if (
      (matter.status === "closed" || matter.status === "archived") &&
      !merged.authorizeClosedMatter
    ) {
      setModalMode("confirm_closed_matter");
      return;
    }

    const duplicate = findDuplicateActiveAssignment(assignments, {
      employeeId: employee.id,
      matterId: matter.id,
      roleOnMatter: pendingSave.roleOnMatter,
      excludeAssignmentId: selectedId ?? undefined,
    });
    if (duplicate && !merged.confirmDuplicate) {
      setModalMode("confirm_duplicate");
      return;
    }
    if (duplicate && merged.confirmDuplicate && !merged.duplicateReason.trim()) {
      setErrors({
        duplicateReason:
          "A reason is required before allowing a duplicate active assignment.",
      });
      setModalMode("confirm_duplicate");
      return;
    }

    const priorEst = saveMode === "create" ? 0 : selected?.estimatedHours ?? 0;
    const conflicts = evaluateAssignmentConflicts({
      employee,
      estimatedHours: pendingSave.estimatedHours,
      priorEstimatedHours: priorEst,
      startDate: pendingSave.startDate,
      dueDate: pendingSave.dueDate,
      vacations: LIVE_VACATIONS,
    });

    if (
      (conflicts.onLeave || conflicts.vacationOverlap) &&
      !merged.confirmVacationConflict
    ) {
      setModalMode("confirm_vacation");
      return;
    }

    if (conflicts.workloadLevel === "critical" && !merged.confirmOverload) {
      setModalMode("confirm_overload");
      return;
    }

    void commitSave(pendingSave, saveMode);
  }

  function confirmClosedMatter() {
    continuePendingSave({ authorizeClosedMatter: true });
  }

  function confirmDuplicate() {
    if (!form.duplicateReason.trim()) {
      setErrors({
        duplicateReason:
          "A reason is required before allowing a duplicate active assignment.",
      });
      return;
    }
    continuePendingSave({ confirmDuplicate: true });
  }

  function confirmVacation() {
    continuePendingSave({ confirmVacationConflict: true });
  }

  function confirmOverload() {
    continuePendingSave({ confirmOverload: true });
  }

  function markComplete(row: AdminAssignment) {
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: "completed",
              completedDate: ADMIN_REFERENCE_DATE,
              actualHours: item.actualHours ?? item.estimatedHours,
            }
          : item,
      ),
    );
    setSuccessMessage(`Marked ${row.matterLabel} complete on ${ADMIN_REFERENCE_DATE}.`);
  }

  async function confirmCancel() {
    const nextErrors = validateForm("cancel");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !selected) return;
    setSaving(true);
    const result = await deleteMatterAssignment(selected.id);
    setSaving(false);
    if (result.error) {
      setErrors({ form: result.error });
      return;
    }
    setSuccessMessage(
      `Removed assignment ${selected.matterReference} (${form.cancelReason.trim()}).`,
    );
    closeModal();
    await loadCatalog();
  }

  if (ADMIN_UI_FLAGS.forceLoading || loadingCatalog) {
    return <LoadingState message="Loading assignments from Supabase..." />;
  }

  if (hasError) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">
            Unable to load assignments
          </CardTitle>
          <CardDescription className="text-red-700">
            {catalogError ||
              "Could not load matters, employees, or assignments from Supabase."}
          </CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => {
            setHasError(false);
            void loadCatalog();
          }}
        >
          Retry
        </Button>
      </Card>
    );
  }

  const formMode =
    modalMode === "create" || modalMode === "edit" || modalMode === "reassign"
      ? modalMode
      : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-navy-800/10 bg-surface px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Live Supabase:</strong>{" "}
        Matter and employee options come from firm <code>matters</code> and{" "}
        <code>profiles</code>. Creating or updating an assignment writes to{" "}
        <code>matter_assignments</code>.
        {catalogError ? (
          <span className="mt-1 block text-amber-800">Note: {catalogError}</span>
        ) : null}
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
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Matter assignments</CardTitle>
            <CardDescription>
              Create, reassign, complete, or cancel staffing assignments with
              capacity and vacation checks.
            </CardDescription>
          </div>
          <Button
            onClick={openCreate}
            disabled={matters.length === 0 || employees.length === 0}
          >
            Create assignment
          </Button>
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            label="Search matter name"
            value={searchMatter}
            onChange={(e) => setSearchMatter(e.target.value)}
          />
          <Input
            label="Search employee name"
            value={searchEmployee}
            onChange={(e) => setSearchEmployee(e.target.value)}
          />
          <Select
            label="Practice area"
            value={practiceFilter}
            onChange={(e) => setPracticeFilter(e.target.value)}
            options={[
              { value: "all", label: "All practice areas" },
              ...practiceAreas.map((area) => ({ value: area, label: area })),
            ]}
          />
          <Select
            label="Assignment status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | AssignmentStatus)
            }
            options={[
              { value: "all", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
              { value: "overdue", label: "Overdue" },
              { value: "completed", label: "Completed" },
              { value: "canceled", label: "Canceled" },
            ]}
          />
          <Select
            label="Priority"
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as "all" | AssignmentPriority)
            }
            options={[
              { value: "all", label: "All priorities" },
              { value: "urgent", label: "Urgent" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <Input
            label="Due date"
            type="date"
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-navy-900">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
            />
            Overdue assignments only
          </label>
          <Button variant="secondary" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No assignments match your filters"
            description="Clear filters or create a new assignment from the firm matter catalog."
            moduleLabel="Admin · Assignments"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Assigned employee</TableHead>
                <TableHead>Assignment role</TableHead>
                <TableHead>Practice area</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned date</TableHead>
                <TableHead>Start date</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Estimated hours</TableHead>
                <TableHead>Actual hours</TableHead>
                <TableHead>Workload impact</TableHead>
                <TableHead>Conflicts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const employee = employees.find(
                  (e) => e.id === row.employeeId,
                );
                const rowConflicts = employee
                  ? evaluateAssignmentConflicts({
                      employee,
                      estimatedHours: 0,
                      priorEstimatedHours: 0,
                      startDate: row.startDate,
                      dueDate: row.dueDate,
                      vacations: LIVE_VACATIONS,
                    })
                  : null;
                const rowWorkload = employee
                  ? calculateWorkloadPercentage(
                      employee.assignedHours,
                      employee.weeklyCapacityHours,
                    )
                  : 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.matterLabel}</div>
                      <div className="text-xs text-muted">
                        {row.matterReference}
                      </div>
                    </TableCell>
                    <TableCell>{row.clientName || "—"}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/employees/${row.employeeId}`}
                        className="font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                      >
                        {row.attorneyName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.roleOnMatter}</TableCell>
                    <TableCell>{row.practiceArea}</TableCell>
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
                    <TableCell>{row.assignedDate}</TableCell>
                    <TableCell>{row.startDate}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>{row.estimatedHours}</TableCell>
                    <TableCell>{row.actualHours ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {workloadImpactLabel(
                          row.estimatedHours,
                          employee?.weeklyCapacityHours ?? 0,
                        )}
                        <div
                          className={
                            rowWorkload > 100
                              ? "font-medium text-red-700"
                              : rowWorkload >= 90
                                ? "font-medium text-amber-700"
                                : "text-muted"
                          }
                        >
                          Employee load {rowWorkload}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[120px] flex-col gap-1">
                        {rowWorkload > 100 && (
                          <Badge variant="danger">Overloaded</Badge>
                        )}
                        {rowWorkload >= 90 && rowWorkload <= 100 && (
                          <Badge variant="warning">Near capacity</Badge>
                        )}
                        {rowConflicts?.onLeave && (
                          <Badge variant="warning">On leave</Badge>
                        )}
                        {rowConflicts?.vacationOverlap && (
                          <Badge variant="danger">Vacation overlap</Badge>
                        )}
                        {!rowConflicts?.onLeave &&
                          !rowConflicts?.vacationOverlap &&
                          rowWorkload < 90 && (
                            <span className="text-xs text-muted">None</span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-[130px] flex-col gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openView(row)}>
                          View
                        </Button>
                        {row.status !== "canceled" && row.status !== "completed" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openReassign(row)}
                            >
                              Reassign
                            </Button>
                            <Button size="sm" onClick={() => markComplete(row)}>
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => openCancel(row)}
                            >
                              Cancel
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

      {/* View details */}
      <Modal
        isOpen={modalMode === "view" && !!selected}
        onClose={closeModal}
        title="Assignment details"
        description="Work assignment detail from local mock data."
        className="max-w-2xl"
      >
        {selected && (
          <div className="space-y-2 text-sm">
            <Detail label="Matter" value={`${selected.matterLabel} (${selected.matterReference})`} />
            <Detail label="Client" value={selected.clientName} />
            <Detail
              label="Assigned employee"
              value={
                <Link
                  href={`/admin/employees/${selected.employeeId}`}
                  className="underline-offset-2 hover:text-gold-500 hover:underline"
                >
                  {selected.attorneyName}
                </Link>
              }
            />
            <Detail label="Role" value={selected.roleOnMatter} />
            <Detail label="Priority" value={selected.priority} />
            <Detail label="Status" value={selected.status} />
            <Detail label="Assigned / start / due" value={`${selected.assignedDate} / ${selected.startDate} / ${selected.dueDate}`} />
            <Detail
              label="Estimated hours (planned)"
              value={String(selected.estimatedHours)}
            />
            <Detail
              label="Actual hours (worked)"
              value={selected.actualHours != null ? String(selected.actualHours) : "—"}
            />
            <Detail
              label="Manager instructions"
              value={selected.managerInstructions || "—"}
            />
            {selected.cancelReason && (
              <Detail label="Cancel reason" value={selected.cancelReason} />
            )}
            {selected.completedDate && (
              <Detail label="Completed date" value={selected.completedDate} />
            )}
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={closeModal}>
                Close
              </Button>
              {selected.status !== "canceled" && selected.status !== "completed" && (
                <Button onClick={() => openEdit(selected)}>Edit</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit / Reassign form */}
      <Modal
        isOpen={!!formMode}
        onClose={closeModal}
        title={
          formMode === "create"
            ? "Create assignment"
            : formMode === "reassign"
              ? "Reassign assignment"
              : "Edit assignment"
        }
        description="Review capacity and vacation impact before saving."
        className="max-w-3xl"
      >
        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          {errors.form && (
            <p className="text-sm text-red-600">{errors.form}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Matter"
              value={form.matterId}
              error={errors.matterId}
              disabled={saving || formMode === "edit"}
              onChange={(e) => updateField("matterId", e.target.value)}
              options={[
                { value: "", label: "Select matter" },
                ...matters.map((m) => ({
                  value: m.id,
                  label: `${m.matterLabel} (${m.status})`,
                })),
              ]}
            />
            <Select
              label="Assigned employee"
              value={form.employeeId}
              error={errors.employeeId}
              disabled={saving}
              onChange={(e) => updateField("employeeId", e.target.value)}
              options={[
                { value: "", label: "Select employee" },
                ...employees.map((e) => ({
                  value: e.id,
                  label: `${e.fullName} · ${e.roleLabel}`,
                })),
              ]}
            />
            <Select
              label="Assignment role"
              value={form.roleOnMatter}
              error={errors.roleOnMatter}
              onChange={(e) => updateField("roleOnMatter", e.target.value)}
              options={ROLE_OPTIONS.map((role) => ({
                value: role,
                label: role,
              }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) =>
                updateField("priority", e.target.value as AssignmentPriority)
              }
              options={[
                { value: "urgent", label: "Urgent" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                updateField("status", e.target.value as AssignmentStatus)
              }
              options={[
                { value: "active", label: "Active" },
                { value: "pending", label: "Pending" },
                { value: "overdue", label: "Overdue" },
              ]}
            />
            <Input
              label="Assigned date"
              type="date"
              value={form.assignedDate}
              error={errors.assignedDate}
              onChange={(e) => updateField("assignedDate", e.target.value)}
            />
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              error={errors.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
            />
            <Input
              label="Due date"
              type="date"
              value={form.dueDate}
              error={errors.dueDate}
              onChange={(e) => updateField("dueDate", e.target.value)}
            />
            <Input
              label="Estimated hours (planned)"
              type="number"
              min={1}
              value={form.estimatedHours}
              error={errors.estimatedHours}
              onChange={(e) => updateField("estimatedHours", e.target.value)}
            />
          </div>
          <Textarea
            label="Manager instructions"
            value={form.managerInstructions}
            onChange={(e) => updateField("managerInstructions", e.target.value)}
            rows={3}
          />

          {!selectedEmployee && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Select an employee to run workload and vacation conflict checks
              before saving.
            </div>
          )}

          {impactPreview && (
            <div className="space-y-3">
              {(impactPreview.conflicts.workloadMessage ||
                impactPreview.conflicts.vacationMessage) && (
                <div className="space-y-2">
                  {impactPreview.conflicts.workloadLevel === "critical" && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                      <p className="font-semibold">Workload conflict</p>
                      <p>{impactPreview.conflicts.workloadMessage}</p>
                      <p className="mt-1">
                        Saving requires an overload confirmation.
                      </p>
                    </div>
                  )}
                  {impactPreview.conflicts.workloadLevel === "warning" && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <p className="font-semibold">Workload warning</p>
                      <p>{impactPreview.conflicts.workloadMessage}</p>
                    </div>
                  )}
                  {impactPreview.conflicts.vacationMessage && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                      <p className="font-semibold">Vacation / leave conflict</p>
                      <p>{impactPreview.conflicts.vacationMessage}</p>
                      <p className="mt-1">
                        Status: {impactPreview.vacationStatus}. Saving requires
                        vacation-conflict confirmation.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-navy-800/10 bg-surface p-4 text-sm">
                <p className="mb-2 font-semibold text-navy-900">
                  Pre-save capacity & vacation check
                </p>
                <ul className="space-y-1 text-navy-800">
                  <li>Weekly capacity: {impactPreview.weeklyCapacity} hrs</li>
                  <li>
                    Current assigned hours: {impactPreview.currentAssigned}
                  </li>
                  <li>
                    New projected assigned hours:{" "}
                    {impactPreview.projectedAssigned}
                  </li>
                  <li>
                    New projected workload:{" "}
                    <strong
                      className={
                        impactPreview.projectedPct > 100
                          ? "text-red-700"
                          : impactPreview.projectedPct >= 90
                            ? "text-amber-700"
                            : undefined
                      }
                    >
                      {impactPreview.projectedPct}%
                    </strong>
                  </li>
                  <li>Vacation status: {impactPreview.vacationStatus}</li>
                  <li>
                    Employee active: {impactPreview.active ? "Yes" : "No"}
                    {impactPreview.onLeave ? " (currently on leave)" : ""}
                  </li>
                  <li>
                    Employee practice area: {impactPreview.employeePractice}
                  </li>
                  <li>Matter practice area: {impactPreview.matterPractice}</li>
                </ul>
                {impactPreview.practiceMismatch && (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-amber-900">
                    Warning: employee practice area does not match matter
                    practice area.
                  </p>
                )}
                {impactPreview.conflictWarning && (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-amber-900">
                    Matter conflict check: {impactPreview.conflictWarning}
                  </p>
                )}
                {(impactPreview.matterStatus === "closed" ||
                  impactPreview.matterStatus === "archived") && (
                  <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-amber-900">
                    Matter is {impactPreview.matterStatus}. Authorized manager
                    confirmation is required.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              disabled={saving || matters.length === 0 || employees.length === 0}
              onClick={() =>
                attemptSave(formMode as "create" | "edit" | "reassign")
              }
            >
              {saving ? "Saving…" : "Save assignment"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "cancel" && !!selected}
        onClose={closeModal}
        title="Cancel assignment"
        description="Assignments are not deleted. Status will be set to Canceled."
      >
        <div className="space-y-3">
          <p className="text-sm text-navy-900">
            Cancel <strong>{selected?.matterLabel}</strong> for{" "}
            <strong>{selected?.attorneyName}</strong>?
          </p>
          <Textarea
            label="Cancel reason (required)"
            value={form.cancelReason}
            error={errors.cancelReason}
            onChange={(e) => updateField("cancelReason", e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Keep assignment
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Confirm cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "confirm_closed_matter"}
        onClose={closeModal}
        title="Closed or archived matter"
        description="Assigning to closed/archived matters requires explicit manager confirmation."
      >
        <div className="space-y-3 text-sm">
          <p>
            Matter <strong>{pendingSave?.matterLabel}</strong> is{" "}
            <strong>{pendingSave?.matterStatus}</strong>. Confirm you are
            authorized to staff this matter.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Back
            </Button>
            <Button onClick={confirmClosedMatter}>
              Confirm authorized assignment
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "confirm_duplicate"}
        onClose={closeModal}
        title="Duplicate active assignment"
        description="An active assignment already exists for this employee, matter, and role."
      >
        <div className="space-y-3">
          <Textarea
            label="Reason for duplicate (required)"
            value={form.duplicateReason}
            error={errors.duplicateReason}
            onChange={(e) => updateField("duplicateReason", e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Back
            </Button>
            <Button onClick={confirmDuplicate}>Allow duplicate</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "confirm_vacation"}
        onClose={closeModal}
        title="Vacation or leave conflict"
        description="This assignment conflicts with approved leave. Confirm only if coverage is planned."
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            <p>
              <strong>{pendingSave?.attorneyName}</strong> has a vacation/leave
              conflict with {pendingSave?.startDate} → {pendingSave?.dueDate}.
            </p>
            <p className="mt-1">
              Assigning attorneys during leave increases coverage risk and
              workload pressure for the rest of the team.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Back
            </Button>
            <Button variant="danger" onClick={confirmVacation}>
              Confirm despite vacation conflict
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "confirm_overload"}
        onClose={closeModal}
        title="Workload exceeds 100%"
        description="Projected workload is above capacity. Extra confirmation is required."
      >
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            <p>
              Projected load for <strong>{pendingSave?.attorneyName}</strong>{" "}
              exceeds 100% after adding {pendingSave?.estimatedHours} estimated
              hours.
            </p>
            <p className="mt-1">
              Overloading attorneys is a core staffing risk — confirm only if
              this assignment is unavoidable.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Back
            </Button>
            <Button variant="danger" onClick={confirmOverload}>
              Confirm overload assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
    </div>
  );
}

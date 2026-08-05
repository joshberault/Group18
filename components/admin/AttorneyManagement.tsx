"use client";

import { useMemo, useState } from "react";
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
  calculateWorkloadPercentage,
  countActiveAssignmentsForEmployee,
  getVacationStatusLabel,
  isAttorneyOrPartnerTitle,
  uniquePracticeAreas,
} from "@/lib/admin/calculations";
import {
  ADMIN_REFERENCE_DATE,
  ADMIN_UI_FLAGS,
  MOCK_ASSIGNMENTS,
  MOCK_EMPLOYEES,
  MOCK_ROLE_PERMISSIONS,
  MOCK_VACATIONS,
} from "@/lib/admin/mock-data";
import type { AdminEmployee, EmploymentStatus } from "@/lib/admin/types";

type SortKey = "name" | "workload";
type ModalMode = "view" | "add" | "edit" | "deactivate" | null;

interface EmployeeFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNumber: string;
  title: string;
  roleKey: string;
  department: string;
  practiceArea: string;
  barNumber: string;
  internalHourlyCostRate: string;
  standardBillableRate: string;
  weeklyCapacityHours: string;
  targetBillableHours: string;
  hireDate: string;
  managerId: string;
  status: EmploymentStatus;
}

type FormErrors = Partial<Record<keyof EmployeeFormState, string>>;

const emptyForm = (): EmployeeFormState => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  employeeNumber: "",
  title: "Associate Attorney",
  roleKey: "attorney",
  department: "Corporate",
  practiceArea: "Corporate",
  barNumber: "",
  internalHourlyCostRate: "70",
  standardBillableRate: "275",
  weeklyCapacityHours: "160",
  targetBillableHours: "160",
  hireDate: ADMIN_REFERENCE_DATE,
  managerId: "",
  status: "active",
});

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

function employeeToForm(employee: AdminEmployee): EmployeeFormState {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phone: employee.phone,
    employeeNumber: employee.employeeNumber,
    title: employee.title,
    roleKey: employee.roleKey,
    department: employee.department,
    practiceArea: employee.practiceArea,
    barNumber: employee.barNumber,
    internalHourlyCostRate: String(employee.internalHourlyCostRate),
    standardBillableRate: String(employee.standardBillableRate),
    weeklyCapacityHours: String(employee.weeklyCapacityHours),
    targetBillableHours: String(employee.targetBillableHours),
    hireDate: employee.hireDate,
    managerId: employee.managerId ?? "",
    status: employee.status,
  };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function resolveRoleLabel(roleKey: string) {
  return (
    MOCK_ROLE_PERMISSIONS.find((role) => role.roleKey === roleKey)?.roleLabel ??
    roleKey.replaceAll("_", " ")
  );
}

function buildEmployeeFromForm(
  form: EmployeeFormState,
  existing: AdminEmployee | null,
  nextId: string,
): AdminEmployee {
  const weekly = Number(form.weeklyCapacityHours);
  const roleLabel = resolveRoleLabel(form.roleKey);
  const isAttorney =
    form.roleKey === "attorney" ||
    form.roleKey === "managing_partner" ||
    isAttorneyOrPartnerTitle(form.title);

  return {
    id: existing?.id ?? nextId,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    employeeNumber: form.employeeNumber.trim().toUpperCase(),
    title: form.title.trim(),
    department: form.department.trim(),
    roleKey: form.roleKey,
    roleLabel,
    practiceArea: form.practiceArea.trim(),
    status: form.status,
    hireDate: form.hireDate,
    barNumber: form.barNumber.trim(),
    internalHourlyCostRate: Number(form.internalHourlyCostRate),
    standardBillableRate: Number(form.standardBillableRate),
    weeklyCapacityHours: weekly,
    targetBillableHours: Number(form.targetBillableHours),
    managerId: form.managerId || null,
    availableWorkHours: weekly,
    assignedHours: existing?.assignedHours ?? 0,
    actualHoursWorked: existing?.actualHoursWorked ?? 0,
    isAttorney,
    profileId: existing?.profileId,
  };
}

function validateForm(
  form: EmployeeFormState,
  employees: AdminEmployee[],
  editingId: string | null,
): FormErrors {
  const errors: FormErrors = {};

  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";

  if (!form.email.trim()) {
    errors.email = "Work email is required.";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Enter a valid work email address.";
  } else {
    const emailTaken = employees.some(
      (e) =>
        e.id !== editingId &&
        e.email.toLowerCase() === form.email.trim().toLowerCase(),
    );
    if (emailTaken) errors.email = "Work email must be unique.";
  }

  if (!form.employeeNumber.trim()) {
    errors.employeeNumber = "Employee number is required.";
  } else {
    const numberTaken = employees.some(
      (e) =>
        e.id !== editingId &&
        e.employeeNumber.toUpperCase() ===
          form.employeeNumber.trim().toUpperCase(),
    );
    if (numberTaken) errors.employeeNumber = "Employee number must be unique.";
  }

  if (isAttorneyOrPartnerTitle(form.title) && !form.barNumber.trim()) {
    errors.barNumber = "Bar number is required for Attorney or Partner titles.";
  }

  const weekly = Number(form.weeklyCapacityHours);
  if (!form.weeklyCapacityHours || Number.isNaN(weekly) || weekly <= 0) {
    errors.weeklyCapacityHours = "Weekly capacity must be greater than zero.";
  }

  const target = Number(form.targetBillableHours);
  if (form.targetBillableHours === "" || Number.isNaN(target) || target < 0) {
    errors.targetBillableHours = "Target billable hours cannot be negative.";
  }

  const billable = Number(form.standardBillableRate);
  if (
    form.standardBillableRate === "" ||
    Number.isNaN(billable) ||
    billable < 0
  ) {
    errors.standardBillableRate = "Standard billable rate cannot be negative.";
  }

  const cost = Number(form.internalHourlyCostRate);
  if (
    form.internalHourlyCostRate === "" ||
    Number.isNaN(cost) ||
    cost < 0
  ) {
    errors.internalHourlyCostRate = "Internal cost rate cannot be negative.";
  }

  if (!form.hireDate) errors.hireDate = "Hire date is required.";

  if (!["active", "on_leave", "inactive"].includes(form.status)) {
    errors.status = "Employment status must be Active, On Leave, or Inactive.";
  }

  if (editingId && form.managerId === editingId) {
    errors.managerId = "A manager cannot be the same employee being edited.";
  }

  return errors;
}

export function AttorneyManagement() {
  const [employees, setEmployees] = useState<AdminEmployee[]>(() =>
    MOCK_EMPLOYEES.map((employee) => ({ ...employee })),
  );
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchNumber, setSearchNumber] = useState("");
  const [searchTitle, setSearchTitle] = useState("");
  const [searchPractice, setSearchPractice] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EmploymentStatus>(
    "all",
  );
  const [practiceFilter, setPracticeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(ADMIN_UI_FLAGS.forceError);

  const practiceAreas = useMemo(
    () => uniquePracticeAreas(employees),
    [employees],
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedId) ?? null,
    [employees, selectedId],
  );

  const filteredEmployees = useMemo(() => {
    const rows = employees.filter((employee) => {
      if (
        searchName &&
        !employee.fullName.toLowerCase().includes(searchName.toLowerCase())
      ) {
        return false;
      }
      if (
        searchEmail &&
        !employee.email.toLowerCase().includes(searchEmail.toLowerCase())
      ) {
        return false;
      }
      if (
        searchNumber &&
        !employee.employeeNumber
          .toLowerCase()
          .includes(searchNumber.toLowerCase())
      ) {
        return false;
      }
      if (
        searchTitle &&
        !employee.title.toLowerCase().includes(searchTitle.toLowerCase())
      ) {
        return false;
      }
      if (
        searchPractice &&
        !employee.practiceArea
          .toLowerCase()
          .includes(searchPractice.toLowerCase())
      ) {
        return false;
      }
      if (roleFilter !== "all" && employee.roleKey !== roleFilter) return false;
      if (statusFilter !== "all" && employee.status !== statusFilter) {
        return false;
      }
      if (practiceFilter !== "all" && employee.practiceArea !== practiceFilter) {
        return false;
      }
      return true;
    });

    return rows.sort((a, b) => {
      if (sortKey === "workload") {
        const wa = calculateWorkloadPercentage(
          a.assignedHours,
          a.weeklyCapacityHours,
        );
        const wb = calculateWorkloadPercentage(
          b.assignedHours,
          b.weeklyCapacityHours,
        );
        return wb - wa;
      }
      return a.fullName.localeCompare(b.fullName);
    });
  }, [
    employees,
    searchName,
    searchEmail,
    searchNumber,
    searchTitle,
    searchPractice,
    roleFilter,
    statusFilter,
    practiceFilter,
    sortKey,
  ]);

  function clearFilters() {
    setSearchName("");
    setSearchEmail("");
    setSearchNumber("");
    setSearchTitle("");
    setSearchPractice("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPracticeFilter("all");
    setSortKey("name");
  }

  function openAdd() {
    setSelectedId(null);
    setForm(emptyForm());
    setErrors({});
    setModalMode("add");
  }

  function openView(employee: AdminEmployee) {
    setSelectedId(employee.id);
    setForm(employeeToForm(employee));
    setErrors({});
    setModalMode("view");
  }

  function openEdit(employee: AdminEmployee) {
    setSelectedId(employee.id);
    setForm(employeeToForm(employee));
    setErrors({});
    setModalMode("edit");
  }

  function openDeactivate(employee: AdminEmployee) {
    setSelectedId(employee.id);
    setModalMode("deactivate");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedId(null);
    setErrors({});
  }

  function updateField<K extends keyof EmployeeFormState>(
    key: K,
    value: EmployeeFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const editingId = modalMode === "edit" ? selectedId : null;
    const nextErrors = validateForm(form, employees, editingId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (modalMode === "add") {
      const nextId = `emp-${String(employees.length + 100).padStart(3, "0")}`;
      const created = buildEmployeeFromForm(form, null, nextId);
      setEmployees((prev) => [...prev, created]);
      setSuccessMessage(`Added ${created.fullName} to the local staff roster.`);
      closeModal();
      return;
    }

    if (modalMode === "edit" && selectedEmployee) {
      const updated = buildEmployeeFromForm(form, selectedEmployee, selectedEmployee.id);
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === selectedEmployee.id ? updated : employee,
        ),
      );
      setSuccessMessage(`Updated ${updated.fullName}.`);
      closeModal();
    }
  }

  function handleActivate(employee: AdminEmployee) {
    setEmployees((prev) =>
      prev.map((row) =>
        row.id === employee.id
          ? {
              ...row,
              status: "active",
              weeklyCapacityHours:
                row.weeklyCapacityHours > 0 ? row.weeklyCapacityHours : 160,
              availableWorkHours:
                row.availableWorkHours > 0 ? row.availableWorkHours : 160,
            }
          : row,
      ),
    );
    setSuccessMessage(
      `Activated ${employee.fullName}. Inactive staff are not treated as available for new assignments.`,
    );
  }

  function confirmDeactivate() {
    if (!selectedEmployee) return;
    setEmployees((prev) =>
      prev.map((row) =>
        row.id === selectedEmployee.id
          ? { ...row, status: "inactive", assignedHours: row.assignedHours }
          : row,
      ),
    );
    setSuccessMessage(
      `Deactivated ${selectedEmployee.fullName}. Status set to Inactive (not deleted).`,
    );
    closeModal();
  }

  if (ADMIN_UI_FLAGS.forceLoading) {
    return <LoadingState message="Loading attorney management..." />;
  }

  if (hasError) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">
            Unable to load attorney management
          </CardTitle>
          <CardDescription className="text-red-700">
            Local mock staff data could not be loaded for this page.
          </CardDescription>
        </CardHeader>
        <Button
          variant="secondary"
          onClick={() => {
            setHasError(false);
            setEmployees(MOCK_EMPLOYEES.map((employee) => ({ ...employee })));
          }}
        >
          Retry with mock data
        </Button>
      </Card>
    );
  }

  const activeAssignmentCount = selectedEmployee
    ? countActiveAssignmentsForEmployee(selectedEmployee.id, MOCK_ASSIGNMENTS)
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Mock data:</strong>{" "}
        Attorney Management currently uses local admin mock data. Changes update
        this page only and will later be replaced by Supabase queries. Internal
        hourly cost rate is restricted internal information.
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
            <CardTitle>Attorney & staff roster</CardTitle>
            <CardDescription>
              Search, filter, and manage employees using existing admin mock
              records. Inactive staff cannot appear as available for new
              assignments.
            </CardDescription>
          </div>
          <Button onClick={openAdd}>Add employee</Button>
        </CardHeader>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            label="Search by employee name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Name"
          />
          <Input
            label="Search by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Work email"
          />
          <Input
            label="Search by employee number"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            placeholder="EMP-001"
          />
          <Input
            label="Search by job title"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            placeholder="Title"
          />
          <Input
            label="Search by practice area"
            value={searchPractice}
            onChange={(e) => setSearchPractice(e.target.value)}
            placeholder="Practice area"
          />
          <Select
            label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: "all", label: "All roles" },
              ...MOCK_ROLE_PERMISSIONS.map((role) => ({
                value: role.roleKey,
                label: role.roleLabel,
              })),
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
            label="Filter by practice area"
            value={practiceFilter}
            onChange={(e) => setPracticeFilter(e.target.value)}
            options={[
              { value: "all", label: "All practice areas" },
              ...practiceAreas.map((area) => ({ value: area, label: area })),
            ]}
          />
          <Select
            label="Sort by"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            options={[
              { value: "name", label: "Employee name" },
              { value: "workload", label: "Workload percentage" },
            ]}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={clearFilters}>
            Clear all filters
          </Button>
        </div>

        {filteredEmployees.length === 0 ? (
          <EmptyState
            title="No employees match your filters"
            description="Clear filters or adjust search terms to see staff in the mock roster."
            moduleLabel="Admin · Attorneys"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee name</TableHead>
                <TableHead>Employee number</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Practice area</TableHead>
                <TableHead>Employment status</TableHead>
                <TableHead>Current workload %</TableHead>
                <TableHead>Target billable hours</TableHead>
                <TableHead>Standard billable rate</TableHead>
                <TableHead>Vacation status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const workload = calculateWorkloadPercentage(
                  employee.assignedHours,
                  employee.weeklyCapacityHours,
                );
                const vacation = getVacationStatusLabel(
                  employee,
                  MOCK_VACATIONS,
                  ADMIN_REFERENCE_DATE,
                );
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="font-medium">{employee.fullName}</div>
                      <div className="text-xs text-muted">{employee.email}</div>
                    </TableCell>
                    <TableCell>{employee.employeeNumber}</TableCell>
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
                              : "text-navy-900"
                        }
                      >
                        {workload}%
                      </span>
                    </TableCell>
                    <TableCell>{employee.targetBillableHours}</TableCell>
                    <TableCell>
                      ${employee.standardBillableRate.toFixed(2)}
                    </TableCell>
                    <TableCell>{vacation}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[140px] flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openView(employee)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(employee)}
                        >
                          Edit
                        </Button>
                        {employee.status === "inactive" ? (
                          <Button
                            size="sm"
                            onClick={() => handleActivate(employee)}
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => openDeactivate(employee)}
                          >
                            Deactivate
                          </Button>
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
        isOpen={modalMode === "view" && !!selectedEmployee}
        onClose={closeModal}
        title="Employee details"
        description="Work profile only — no sensitive personal information is shown."
        className="max-w-2xl"
      >
        {selectedEmployee && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Name" value={selectedEmployee.fullName} />
            <DetailRow label="Employee number" value={selectedEmployee.employeeNumber} />
            <DetailRow label="Work email" value={selectedEmployee.email} />
            <DetailRow label="Work phone" value={selectedEmployee.phone || "—"} />
            <DetailRow label="Job title" value={selectedEmployee.title} />
            <DetailRow label="Role" value={selectedEmployee.roleLabel} />
            <DetailRow label="Department" value={selectedEmployee.department} />
            <DetailRow label="Practice area" value={selectedEmployee.practiceArea} />
            <DetailRow label="Bar number" value={selectedEmployee.barNumber || "—"} />
            <DetailRow
              label="Internal hourly cost rate"
              value={`$${selectedEmployee.internalHourlyCostRate.toFixed(2)} (restricted internal information)`}
            />
            <DetailRow
              label="Standard billable rate"
              value={`$${selectedEmployee.standardBillableRate.toFixed(2)}`}
            />
            <DetailRow
              label="Weekly capacity hours"
              value={String(selectedEmployee.weeklyCapacityHours)}
            />
            <DetailRow
              label="Target billable hours"
              value={String(selectedEmployee.targetBillableHours)}
            />
            <DetailRow
              label="Assigned hours (planned)"
              value={String(selectedEmployee.assignedHours)}
            />
            <DetailRow
              label="Actual hours worked"
              value={String(selectedEmployee.actualHoursWorked)}
            />
            <DetailRow label="Hire date" value={selectedEmployee.hireDate} />
            <DetailRow
              label="Manager"
              value={
                employees.find((e) => e.id === selectedEmployee.managerId)
                  ?.fullName ?? "—"
              }
            />
            <DetailRow
              label="Employment status"
              value={statusLabel(selectedEmployee.status)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={closeModal}>
                Close
              </Button>
              <Button onClick={() => openEdit(selectedEmployee)}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modalMode === "add" || modalMode === "edit"}
        onClose={closeModal}
        title={modalMode === "add" ? "Add employee" : "Edit employee"}
        description="Updates apply to local mock data on this page only."
        className="max-w-3xl"
      >
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.firstName}
              error={errors.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
            />
            <Input
              label="Last name"
              value={form.lastName}
              error={errors.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
            />
            <Input
              label="Work email"
              type="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <Input
              label="Employee number"
              value={form.employeeNumber}
              error={errors.employeeNumber}
              onChange={(e) => updateField("employeeNumber", e.target.value)}
            />
            <Input
              label="Job title"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
            <Select
              label="Role"
              value={form.roleKey}
              onChange={(e) => updateField("roleKey", e.target.value)}
              options={MOCK_ROLE_PERMISSIONS.map((role) => ({
                value: role.roleKey,
                label: role.roleLabel,
              }))}
            />
            <Input
              label="Department"
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
            />
            <Input
              label="Practice area"
              value={form.practiceArea}
              onChange={(e) => updateField("practiceArea", e.target.value)}
            />
            <Input
              label="Bar number"
              value={form.barNumber}
              error={errors.barNumber}
              onChange={(e) => updateField("barNumber", e.target.value)}
            />
            <Input
              label="Internal hourly cost rate (restricted)"
              type="number"
              min={0}
              step="0.01"
              value={form.internalHourlyCostRate}
              error={errors.internalHourlyCostRate}
              onChange={(e) =>
                updateField("internalHourlyCostRate", e.target.value)
              }
            />
            <Input
              label="Standard billable rate"
              type="number"
              min={0}
              step="0.01"
              value={form.standardBillableRate}
              error={errors.standardBillableRate}
              onChange={(e) =>
                updateField("standardBillableRate", e.target.value)
              }
            />
            <Input
              label="Weekly capacity hours"
              type="number"
              min={1}
              value={form.weeklyCapacityHours}
              error={errors.weeklyCapacityHours}
              onChange={(e) =>
                updateField("weeklyCapacityHours", e.target.value)
              }
            />
            <Input
              label="Target billable hours"
              type="number"
              min={0}
              value={form.targetBillableHours}
              error={errors.targetBillableHours}
              onChange={(e) =>
                updateField("targetBillableHours", e.target.value)
              }
            />
            <Input
              label="Hire date"
              type="date"
              value={form.hireDate}
              error={errors.hireDate}
              onChange={(e) => updateField("hireDate", e.target.value)}
            />
            <Select
              label="Manager"
              value={form.managerId}
              error={errors.managerId}
              onChange={(e) => updateField("managerId", e.target.value)}
              options={[
                { value: "", label: "No manager" },
                ...employees
                  .filter((e) => e.id !== selectedId && e.status !== "inactive")
                  .map((e) => ({ value: e.id, label: e.fullName })),
              ]}
            />
            <Select
              label="Employment status"
              value={form.status}
              error={errors.status}
              onChange={(e) =>
                updateField("status", e.target.value as EmploymentStatus)
              }
              options={[
                { value: "active", label: "Active" },
                { value: "on_leave", label: "On Leave" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <p className="text-xs text-muted">
            Internal hourly cost rate is restricted internal information. Do not
            share outside staffing administration.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {modalMode === "add" ? "Add employee" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalMode === "deactivate" && !!selectedEmployee}
        onClose={closeModal}
        title="Confirm deactivation"
        description="Employees are not deleted. Status will be set to Inactive."
      >
        {selectedEmployee && (
          <div className="space-y-4 text-sm">
            <p className="text-navy-900">
              Deactivate <strong>{selectedEmployee.fullName}</strong>? They will
              no longer appear as available for new assignments.
            </p>
            {activeAssignmentCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Warning: this employee still has {activeAssignmentCount} active
                assignment
                {activeAssignmentCount === 1 ? "" : "s"}. Confirm only if you
                intend to remove them from availability.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDeactivate}>
                Confirm deactivate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-2 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-navy-900 sm:text-right">{value}</dd>
    </div>
  );
}

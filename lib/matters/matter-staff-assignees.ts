import { DEMO_STAFF_EMPLOYEES } from "@/lib/admin/demo-staff";

export type MatterStaffSelectOption = {
  value: string;
  label: string;
};

function activeEmployees() {
  return DEMO_STAFF_EMPLOYEES.filter((employee) => employee.status !== "inactive").sort(
    (a, b) => a.fullName.localeCompare(b.fullName),
  );
}

/** All demo employees with profession/title for task reassignment. */
export function getMatterStaffAssigneeSelectOptions(): MatterStaffSelectOption[] {
  return activeEmployees().map((employee) => ({
    value: employee.fullName,
    label: `${employee.fullName} · ${employee.title}`,
  }));
}

/** Attorneys and managing partners for matter lead reassignment. */
export function getMatterLeadAttorneySelectOptions(): MatterStaffSelectOption[] {
  return activeEmployees()
    .filter((employee) => employee.isAttorney)
    .map((employee) => ({
      value: employee.fullName,
      label: `${employee.fullName} · ${employee.title}`,
    }));
}

export function defaultMatterStaffAssignee(): string {
  return getMatterStaffAssigneeSelectOptions()[0]?.value ?? "Avery Counsel";
}

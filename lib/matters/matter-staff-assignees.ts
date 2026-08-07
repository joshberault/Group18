import { SPECIALTY_ATTORNEY_PROFILES } from "@/lib/attorney/specialty-attorneys";
import { DEMO_STAFF_EMPLOYEES } from "@/lib/admin/demo-staff";
import type { AdminEmployee } from "@/lib/admin/types";

export type MatterStaffSelectOption = {
  value: string;
  label: string;
};

const EXCLUDED_ASSIGNMENT_ROLES = new Set(["client", "prospective_client"]);

function activeEmployees() {
  return DEMO_STAFF_EMPLOYEES.filter((employee) => employee.status !== "inactive").sort(
    (a, b) => a.fullName.localeCompare(b.fullName),
  );
}

function isAssignableStaff(employee: AdminEmployee) {
  return !EXCLUDED_ASSIGNMENT_ROLES.has(employee.roleKey);
}

export function getMatterStaffAssigneeSelectOptions(): MatterStaffSelectOption[] {
  const seen = new Set<string>();
  const options: MatterStaffSelectOption[] = [];

  for (const employee of activeEmployees().filter(isAssignableStaff)) {
    if (employee.roleKey === "attorney" || seen.has(employee.fullName)) continue;
    seen.add(employee.fullName);
    options.push({
      value: employee.fullName,
      label: `${employee.fullName} · ${employee.title}`,
    });
  }

  for (const attorney of SPECIALTY_ATTORNEY_PROFILES) {
    if (seen.has(attorney.fullName)) continue;
    seen.add(attorney.fullName);
    options.push({
      value: attorney.fullName,
      label: `${attorney.fullName} · ${attorney.practiceAreaName}`,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

/** Specialty lead attorneys plus managing partner for matter reassignment. */
export function getMatterLeadAttorneySelectOptions(): MatterStaffSelectOption[] {
  const seen = new Set<string>();
  const options: MatterStaffSelectOption[] = [];

  const managingPartner = activeEmployees().find(
    (employee) => employee.roleKey === "managing_partner",
  );
  if (managingPartner) {
    seen.add(managingPartner.fullName);
    options.push({
      value: managingPartner.fullName,
      label: `${managingPartner.fullName} · ${managingPartner.practiceArea}`,
    });
  }

  for (const attorney of SPECIALTY_ATTORNEY_PROFILES) {
    if (seen.has(attorney.fullName)) continue;
    seen.add(attorney.fullName);
    options.push({
      value: attorney.fullName,
      label: `${attorney.fullName} · ${attorney.practiceAreaName}`,
    });
  }

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function defaultMatterStaffAssignee(): string {
  return (
    SPECIALTY_ATTORNEY_PROFILES.find((attorney) => attorney.specialty === "litigation")
      ?.fullName ?? "George Giddens"
  );
}

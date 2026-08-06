/**
 * Admin employee roster built from the shared CounselFlow demo roles.
 * Names/identity come from DEMO_IDENTITIES; titles and permissions from role-config.
 */

import type {
  AdminEmployee,
  AdminRolePermission,
} from "@/lib/admin/types";
import {
  DEMO_IDENTITIES,
  getPermissionsForRole,
  getRoleDefinition,
} from "@/lib/roles/role-config";
import type { Permission } from "@/lib/roles/permissions";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/types";

export const DEMO_STAFF_EMPLOYEE_ID_PREFIX = "demo-role-";

export function demoStaffEmployeeId(role: UserRole): string {
  return `${DEMO_STAFF_EMPLOYEE_ID_PREFIX}${role}`;
}

export function parseDemoStaffRole(employeeId: string): UserRole | null {
  if (!employeeId.startsWith(DEMO_STAFF_EMPLOYEE_ID_PREFIX)) return null;
  const role = employeeId.slice(DEMO_STAFF_EMPLOYEE_ID_PREFIX.length);
  return (USER_ROLES as readonly string[]).includes(role)
    ? (role as UserRole)
    : null;
}

export type RoleStaffMeta = {
  department: string;
  practiceArea: string;
  title: string;
  isAttorney: boolean;
  barNumber: string;
  weeklyCapacityHours: number;
  targetBillableHours: number;
  standardBillableRate: number;
  internalHourlyCostRate: number;
  assignedHours: number;
  actualHoursWorked: number;
  phoneExt: string;
  employeeNumber: string;
};

export const ROLE_STAFF_META: Record<UserRole, RoleStaffMeta> = {
  managing_partner: {
    department: "Executive",
    practiceArea: "Firm Leadership",
    title: "Managing Partner",
    isAttorney: true,
    barNumber: "IL-MP-1001",
    weeklyCapacityHours: 40,
    targetBillableHours: 20,
    standardBillableRate: 650,
    internalHourlyCostRate: 275,
    assignedHours: 28,
    actualHoursWorked: 24,
    phoneExt: "1001",
    employeeNumber: "E-1001",
  },
  attorney: {
    department: "Legal Practice",
    practiceArea: "Litigation",
    title: "Associate Attorney",
    isAttorney: true,
    barNumber: "IL-AT-2002",
    weeklyCapacityHours: 40,
    targetBillableHours: 35,
    standardBillableRate: 425,
    internalHourlyCostRate: 185,
    assignedHours: 36,
    actualHoursWorked: 32,
    phoneExt: "2002",
    employeeNumber: "E-2002",
  },
  paralegal: {
    department: "Legal Support",
    practiceArea: "Litigation Support",
    title: "Paralegal",
    isAttorney: false,
    barNumber: "",
    weeklyCapacityHours: 40,
    targetBillableHours: 30,
    standardBillableRate: 175,
    internalHourlyCostRate: 75,
    assignedHours: 30,
    actualHoursWorked: 28,
    phoneExt: "3003",
    employeeNumber: "E-3003",
  },
  billing_specialist: {
    department: "Billing",
    practiceArea: "Revenue Operations",
    title: "Billing Specialist",
    isAttorney: false,
    barNumber: "",
    weeklyCapacityHours: 40,
    targetBillableHours: 0,
    standardBillableRate: 0,
    internalHourlyCostRate: 55,
    assignedHours: 32,
    actualHoursWorked: 32,
    phoneExt: "4004",
    employeeNumber: "E-4004",
  },
  accounting_manager: {
    department: "Accounting",
    practiceArea: "Financial Controls",
    title: "Accounting Manager",
    isAttorney: false,
    barNumber: "",
    weeklyCapacityHours: 40,
    targetBillableHours: 0,
    standardBillableRate: 0,
    internalHourlyCostRate: 95,
    assignedHours: 34,
    actualHoursWorked: 33,
    phoneExt: "5005",
    employeeNumber: "E-5005",
  },
  firm_administrator: {
    department: "Administration",
    practiceArea: "Firm Operations",
    title: "Firm Administrator",
    isAttorney: false,
    barNumber: "",
    weeklyCapacityHours: 40,
    targetBillableHours: 0,
    standardBillableRate: 0,
    internalHourlyCostRate: 85,
    assignedHours: 30,
    actualHoursWorked: 29,
    phoneExt: "6006",
    employeeNumber: "E-6006",
  },
  client: {
    department: "Client Portal",
    practiceArea: "External Client",
    title: "Client User",
    isAttorney: false,
    barNumber: "",
    weeklyCapacityHours: 0,
    targetBillableHours: 0,
    standardBillableRate: 0,
    internalHourlyCostRate: 0,
    assignedHours: 0,
    actualHoursWorked: 0,
    phoneExt: "7007",
    employeeNumber: "E-7007",
  },
  prospective_client: {
    department: "Intake",
    practiceArea: "Prospective Client",
    title: "Prospective Client",
    isAttorney: false,
    barNumber: "",
    weeklyCapacityHours: 0,
    targetBillableHours: 0,
    standardBillableRate: 0,
    internalHourlyCostRate: 0,
    assignedHours: 0,
    actualHoursWorked: 0,
    phoneExt: "8008",
    employeeNumber: "E-8008",
  },
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function emailFromName(fullName: string): string {
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `${slug}@counselflow.demo`;
}

function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

/** Role permission summary for Admin profile pages, derived from shared role-config. */
export function buildDemoRolePermission(role: UserRole): AdminRolePermission {
  const definition = getRoleDefinition(role);
  return {
    id: `demo-role-perm-${role}`,
    roleKey: role,
    roleLabel: USER_ROLE_LABELS[role],
    description: definition.dashboardDescription,
    canAccessAdminSection:
      role === "firm_administrator" || hasPermission(role, "manage_staff"),
    canViewManagerDashboard:
      hasPermission(role, "view_firm_dashboard") ||
      role === "firm_administrator",
    canViewEmployeeDirectory:
      role === "firm_administrator" ||
      role === "managing_partner" ||
      hasPermission(role, "manage_staff"),
    canManageEmployees:
      role === "firm_administrator" || hasPermission(role, "manage_staff"),
    canViewEmployeeProfiles:
      role === "firm_administrator" ||
      role === "managing_partner" ||
      hasPermission(role, "manage_staff"),
    canViewInternalCostRates:
      role === "firm_administrator" ||
      role === "managing_partner" ||
      role === "accounting_manager",
    canManageRoles: role === "firm_administrator",
    canAssignMatters:
      role === "firm_administrator" ||
      role === "managing_partner" ||
      hasPermission(role, "manage_matters"),
    canReassignMatters:
      role === "firm_administrator" || role === "managing_partner",
    canViewWorkload:
      role === "firm_administrator" ||
      role === "managing_partner" ||
      hasPermission(role, "manage_staff"),
    canApproveWork:
      hasPermission(role, "approve_time") || role === "firm_administrator",
    canApproveTimeEntries:
      hasPermission(role, "approve_time") || role === "firm_administrator",
    canApproveExpenses:
      hasPermission(role, "manage_write_offs") ||
      role === "accounting_manager" ||
      role === "firm_administrator",
    canApproveVacation: role === "firm_administrator" || role === "managing_partner",
    canApproveWriteDowns:
      hasPermission(role, "manage_write_downs") ||
      role === "accounting_manager",
    canAccessBilling:
      hasPermission(role, "create_invoices") ||
      hasPermission(role, "manage_collections") ||
      role === "billing_specialist",
    canAccessAccounting:
      hasPermission(role, "view_accounting") ||
      hasPermission(role, "manage_accounting") ||
      role === "accounting_manager",
    canViewAuditLogs:
      hasPermission(role, "view_audit_log") || role === "firm_administrator",
  };
}

export function buildDemoStaffEmployee(role: UserRole): AdminEmployee {
  const identity = DEMO_IDENTITIES[role];
  const meta = ROLE_STAFF_META[role];
  const { firstName, lastName } = splitName(identity.fullName);
  const isExternal = role === "client" || role === "prospective_client";
  const managerId =
    role === "managing_partner" || isExternal
      ? null
      : demoStaffEmployeeId("managing_partner");

  return {
    id: demoStaffEmployeeId(role),
    firstName,
    lastName,
    fullName: identity.fullName,
    email: emailFromName(identity.fullName),
    phone: `(312) 555-${meta.phoneExt}`,
    employeeNumber: meta.employeeNumber,
    title: meta.title,
    department: meta.department,
    roleKey: role,
    roleLabel: USER_ROLE_LABELS[role],
    practiceArea: meta.practiceArea,
    status: "active",
    hireDate: "2024-01-15",
    barNumber: meta.barNumber,
    internalHourlyCostRate: meta.internalHourlyCostRate,
    standardBillableRate: meta.standardBillableRate,
    weeklyCapacityHours: meta.weeklyCapacityHours,
    targetBillableHours: meta.targetBillableHours,
    managerId,
    availableWorkHours: meta.weeklyCapacityHours,
    assignedHours: meta.assignedHours,
    actualHoursWorked: meta.actualHoursWorked,
    isAttorney: meta.isAttorney,
  };
}

/** One employee profile per demo role in the shared CounselFlow role system. */
export const DEMO_STAFF_EMPLOYEES: AdminEmployee[] = USER_ROLES.map(
  buildDemoStaffEmployee,
);

export const DEMO_STAFF_ROLE_PERMISSIONS: AdminRolePermission[] = USER_ROLES.map(
  buildDemoRolePermission,
);

export function getDemoStaffEmployeeById(
  employeeId: string,
): AdminEmployee | undefined {
  return DEMO_STAFF_EMPLOYEES.find((employee) => employee.id === employeeId);
}

/** Staffing metadata used to enrich live Supabase profiles for Admin boards. */
export function getRoleStaffMeta(role: UserRole) {
  return ROLE_STAFF_META[role];
}

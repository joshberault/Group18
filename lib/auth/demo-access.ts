import type { UserRole } from "@/lib/types";

/** Staff roles — everyone except client portal users */
export const STAFF_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
  "firm_administrator",
];

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function canAccessNavItem(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}

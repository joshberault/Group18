import type { UserRole } from "@/lib/types";

/** Roles that use the attorney operational hub as their home dashboard */
export const ATTORNEY_HUB_ROLES: UserRole[] = [
  "attorney",
  "paralegal",
];

/** Roles that can open the attorney hub (including oversight) */
export const ATTORNEY_HUB_ACCESS_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
];

export function usesAttorneyHubAsHome(role: UserRole): boolean {
  return ATTORNEY_HUB_ROLES.includes(role);
}

export function canAccessAttorneyHub(role: UserRole): boolean {
  return ATTORNEY_HUB_ACCESS_ROLES.includes(role);
}

/** Default landing route after login (simulated by demo role dropdown) */
export function getDefaultHomePath(role: UserRole): string {
  switch (role) {
    case "attorney":
    case "paralegal":
      return "/attorney/dashboard";
    case "client":
      return "/client-portal";
    case "billing_specialist":
      return "/billing";
    case "firm_administrator":
      return "/dashboard";
    case "managing_partner":
    default:
      return "/dashboard";
  }
}

/** Firm-wide financial dashboard — not for line attorneys */
export function canAccessFirmDashboard(role: UserRole): boolean {
  return [
    "managing_partner",
    "billing_specialist",
    "firm_administrator",
    "client",
  ].includes(role);
}

export function shouldRedirectFromFirmDashboard(role: UserRole): boolean {
  return usesAttorneyHubAsHome(role);
}

import { getLeadAttorneyForSpecialty } from "@/lib/attorney/specialty-attorneys";
import {
  DEFAULT_ATTORNEY_DEMO_SPECIALTY,
  type AttorneyDemoSpecialty,
} from "@/lib/attorney/specialties";
import { DEMO_IDENTITIES } from "@/lib/roles/role-config";
import type { UserRole } from "@/lib/types";

export type DemoIdentity = {
  fullName: string;
  initials: string;
};

export function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Resolve the displayed demo user for a role (specialty attorneys when role is attorney). */
export function resolveDemoIdentity(
  role: UserRole,
  attorneySpecialty?: AttorneyDemoSpecialty | null,
): DemoIdentity {
  if (role === "attorney") {
    const specialty = attorneySpecialty ?? DEFAULT_ATTORNEY_DEMO_SPECIALTY;
    const attorney = getLeadAttorneyForSpecialty(specialty);
    return {
      fullName: attorney.fullName,
      initials: initialsFromName(attorney.fullName),
    };
  }

  return DEMO_IDENTITIES[role];
}

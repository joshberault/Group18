import type { UserRole } from "@/lib/types";

export interface MatterPermissions {
  canSubmitCreationRequest: boolean;
  canApproveCreationRequest: boolean;
}

export function getMatterPermissions(role: UserRole): MatterPermissions {
  return {
    canSubmitCreationRequest: role === "managing_partner",
    canApproveCreationRequest: role === "firm_administrator",
  };
}

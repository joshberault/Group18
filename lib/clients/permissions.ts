import type { UserRole } from "@/lib/types";
import type { ConflictCheckStatus, FirmClient } from "@/lib/clients/types";
import { CLIENTS_MODULE_ROLES } from "@/lib/clients/types";

/**
 * Clients module permissions (demo-role selector).
 * Fine-grained UI + lib checks. Demo RLS is open for the publishable key;
 * tighten DB policies when Auth-backed profiles match demo roles.
 */
export interface ClientPermissions {
  canAccessModule: boolean;
  canViewAllClients: boolean;
  /** When false, callers should filter by assignedClientIds (once matter assignment wiring exists). */
  enforceAssignmentFilter: boolean;
  canCreate: boolean;
  canEditContact: boolean;
  canEditStatus: boolean;
  canEditConflict: boolean;
  canClearConflict: boolean;
  canViewInternalNotes: boolean;
  canViewConflictNotes: boolean;
  canDelete: boolean;
}

export function getClientPermissions(role: UserRole): ClientPermissions {
  if (!CLIENTS_MODULE_ROLES.includes(role)) {
    return {
      canAccessModule: false,
      canViewAllClients: false,
      enforceAssignmentFilter: false,
      canCreate: false,
      canEditContact: false,
      canEditStatus: false,
      canEditConflict: false,
      canClearConflict: false,
      canViewInternalNotes: false,
      canViewConflictNotes: false,
      canDelete: false,
    };
  }

  switch (role) {
    case "managing_partner":
    case "firm_administrator":
      return {
        canAccessModule: true,
        canViewAllClients: true,
        enforceAssignmentFilter: false,
        canCreate: true,
        canEditContact: true,
        canEditStatus: true,
        canEditConflict: true,
        canClearConflict: true,
        canViewInternalNotes: true,
        canViewConflictNotes: true,
        canDelete: false,
      };
    case "attorney":
      return {
        canAccessModule: true,
        // TEMP: view all until attorney↔matter assignments drive client scoping.
        // Set enforceAssignmentFilter=true and pass assignedClientIds to enable.
        canViewAllClients: true,
        enforceAssignmentFilter: false,
        canCreate: false,
        canEditContact: true,
        canEditStatus: false,
        canEditConflict: false,
        canClearConflict: false,
        canViewInternalNotes: true,
        canViewConflictNotes: true,
        canDelete: false,
      };
    case "paralegal":
      return {
        canAccessModule: true,
        // Assignment scope is applied in ClientsDashboard via Parker Legal demo seed matching.
        canViewAllClients: false,
        enforceAssignmentFilter: false,
        canCreate: false,
        canEditContact: true,
        canEditStatus: false,
        canEditConflict: false,
        canClearConflict: false,
        canViewInternalNotes: false,
        canViewConflictNotes: true,
        canDelete: false,
      };
    case "billing_specialist":
      return {
        canAccessModule: true,
        canViewAllClients: true,
        enforceAssignmentFilter: false,
        canCreate: false,
        canEditContact: true,
        canEditStatus: false,
        canEditConflict: false,
        canClearConflict: false,
        canViewInternalNotes: false,
        canViewConflictNotes: false,
        canDelete: false,
      };
    default:
      return {
        canAccessModule: false,
        canViewAllClients: false,
        enforceAssignmentFilter: false,
        canCreate: false,
        canEditContact: false,
        canEditStatus: false,
        canEditConflict: false,
        canClearConflict: false,
        canViewInternalNotes: false,
        canViewConflictNotes: false,
        canDelete: false,
      };
  }
}

/**
 * Filter client list for the active demo role.
 * When assignment relationships exist, pass assignedClientIds and set
 * permissions.enforceAssignmentFilter = true for attorney/paralegal.
 */
export function filterClientsForRole(
  clients: FirmClient[],
  role: UserRole,
  assignedClientIds: string[] = [],
): FirmClient[] {
  const permissions = getClientPermissions(role);
  if (!permissions.canAccessModule) return [];

  if (permissions.enforceAssignmentFilter) {
    const allowed = new Set(assignedClientIds);
    return clients.filter((c) => allowed.has(c.id));
  }

  return clients;
}

export function canSetConflictStatus(
  role: UserRole,
  status: ConflictCheckStatus,
): boolean {
  const permissions = getClientPermissions(role);
  if (!permissions.canEditConflict) return false;
  if (status === "cleared" && !permissions.canClearConflict) return false;
  return true;
}

export function assertCanUpdateClient(
  role: UserRole,
  patch: Partial<FirmClient>,
): { ok: true } | { ok: false; message: string } {
  const permissions = getClientPermissions(role);
  if (!permissions.canAccessModule) {
    return { ok: false, message: "Access denied for this role." };
  }

  if (
    (patch.status !== undefined ||
      patch.notes !== undefined ||
      patch.first_name !== undefined ||
      patch.last_name !== undefined ||
      patch.company_name !== undefined) &&
    !permissions.canEditContact &&
    !permissions.canEditStatus &&
    !permissions.canEditConflict
  ) {
    return { ok: false, message: "You do not have permission to edit clients." };
  }

  if (patch.status !== undefined && !permissions.canEditStatus) {
    return { ok: false, message: "You cannot change client status." };
  }

  if (
    (patch.conflict_check_status !== undefined ||
      patch.conflict_check_notes !== undefined ||
      patch.conflict_checked_by !== undefined ||
      patch.conflict_checked_at !== undefined) &&
    !permissions.canEditConflict
  ) {
    return { ok: false, message: "You cannot update conflict-check information." };
  }

  if (
    patch.conflict_check_status === "cleared" &&
    !permissions.canClearConflict
  ) {
    return { ok: false, message: "You cannot mark a conflict check as Cleared." };
  }

  if (patch.notes !== undefined && !permissions.canViewInternalNotes) {
    return { ok: false, message: "You cannot edit internal notes." };
  }

  if (!permissions.canEditContact && !permissions.canEditStatus && !permissions.canEditConflict) {
    return { ok: false, message: "You have view-only access." };
  }

  return { ok: true };
}

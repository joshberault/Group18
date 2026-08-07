/**
 * Firm Administrator matter assignments — live Supabase data.
 * Matters, staff profiles, and matter_assignments (not mock seed catalogs).
 */

import { createClientSafe } from "@/lib/supabase/client";
import {
  fetchSharedFirmMatters,
  matterNumberFromId,
} from "@/lib/matters/firm-matters-supabase";
import type {
  AdminAssignment,
  AdminEmployee,
  AdminMatter,
  AssignmentPriority,
  MatterLifecycleStatus,
} from "@/lib/admin/types";

const ASSIGNABLE_PROFILE_ROLES = [
  "attorney",
  "paralegal",
  "manager",
  "managing_partner",
] as const;

const ROLE_LABEL_TO_DB: Record<string, string> = {
  "Lead Counsel": "lead_attorney",
  "Deal Counsel": "deal_counsel",
  "Supervising Partner": "supervising_partner",
  Partner: "partner",
  "IP Counsel": "ip_counsel",
  Associate: "associate",
  "Of Counsel": "of_counsel",
};

const ROLE_DB_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_LABEL_TO_DB).map(([label, db]) => [db, label]),
);

export function toDbRoleOnMatter(labelOrKey: string): string {
  const trimmed = labelOrKey.trim();
  if (!trimmed) return "lead_attorney";
  return (
    ROLE_LABEL_TO_DB[trimmed] ??
    trimmed.toLowerCase().replace(/\s+/g, "_")
  );
}

export function toDisplayRoleOnMatter(dbOrLabel: string): string {
  const trimmed = dbOrLabel.trim();
  if (!trimmed) return "Lead Counsel";
  return (
    ROLE_DB_TO_LABEL[trimmed] ??
    ROLE_DB_TO_LABEL[trimmed.toLowerCase()] ??
    trimmed
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function mapMatterStatus(status: string | null | undefined): MatterLifecycleStatus {
  const value = (status ?? "open").toLowerCase();
  if (value === "closed") return "closed";
  if (value === "archived" || value === "inactive") return "archived";
  return "open";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function sharedMatterToAdminMatter(input: {
  id: string;
  title: string;
  matterNumber?: string;
  clientName: string;
  practiceArea: string;
  status: string;
  openDate: string;
  description?: string | null;
  attorneyName?: string | null;
}): AdminMatter {
  return {
    id: input.id,
    matterLabel: input.title,
    matterReference: input.matterNumber ?? matterNumberFromId(input.id),
    clientName: input.clientName || "Unknown client",
    practiceArea: input.practiceArea || "General",
    status: mapMatterStatus(input.status),
    openedDate: input.openDate?.slice(0, 10) || todayIsoDate(),
    engagementStatus: "signed",
    summary: input.description?.trim() || input.title,
    staffingUrgency: "medium",
    responsibleAttorneyName: input.attorneyName ?? undefined,
  };
}

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function profileToAdminEmployee(
  row: ProfileRow,
  assignedHours = 0,
): AdminEmployee {
  const fullName =
    row.full_name?.trim() ||
    row.email?.trim() ||
    "Unknown employee";
  const { firstName, lastName } = splitName(fullName);
  const role = (row.role ?? "attorney").toLowerCase();
  const isAttorney = role === "attorney" || role === "managing_partner";
  const capacity = 40;

  return {
    id: row.id,
    profileId: row.id,
    firstName,
    lastName,
    fullName,
    email: row.email?.trim() || "",
    phone: "",
    employeeNumber: `PR-${row.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    title: isAttorney
      ? "Attorney"
      : role === "paralegal"
        ? "Paralegal"
        : role === "manager"
          ? "Manager"
          : "Staff",
    department: "Legal",
    roleKey: role,
    roleLabel:
      role === "managing_partner"
        ? "Managing Partner"
        : role.charAt(0).toUpperCase() + role.slice(1),
    practiceArea: "General",
    status: "active",
    hireDate: todayIsoDate(),
    barNumber: "",
    internalHourlyCostRate: 0,
    standardBillableRate: 0,
    weeklyCapacityHours: capacity,
    targetBillableHours: capacity,
    managerId: null,
    availableWorkHours: capacity,
    assignedHours,
    actualHoursWorked: 0,
    proBonoHoursWorked: 0,
    isAttorney,
  };
}

export type AdminAssignmentsCatalog = {
  matters: AdminMatter[];
  employees: AdminEmployee[];
  assignments: AdminAssignment[];
  error: string | null;
};

/**
 * Load matters, assignable staff, and current matter_assignments from Supabase.
 */
export async function fetchAdminAssignmentsCatalog(): Promise<AdminAssignmentsCatalog> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      matters: [],
      employees: [],
      assignments: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and the publishable key, then reload.",
    };
  }

  const mattersResult = await fetchSharedFirmMatters({ includeWip: false });
  if (mattersResult.error && mattersResult.matters.length === 0) {
    return {
      matters: [],
      employees: [],
      assignments: [],
      error: mattersResult.error,
    };
  }

  const matters = mattersResult.matters.map((m) =>
    sharedMatterToAdminMatter({
      id: m.id,
      title: m.title,
      matterNumber: m.matterNumber,
      clientName: m.clientName,
      practiceArea: m.practiceArea,
      status: m.status,
      openDate: m.openDate,
      description: m.description,
      attorneyName: m.attorneyName,
    }),
  );

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", [...ASSIGNABLE_PROFILE_ROLES])
    .order("full_name", { ascending: true });

  if (profileError) {
    return {
      matters,
      employees: [],
      assignments: [],
      error: `Could not load employees: ${profileError.message}`,
    };
  }

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("matter_assignments")
    .select(
      `
      id,
      matter_id,
      profile_id,
      role_on_matter,
      assigned_at,
      profile:profiles ( id, full_name, email, role ),
      matter:matters (
        id,
        title,
        status,
        created_at,
        client:clients ( name, first_name, last_name, company_name, client_type, is_company ),
        practice_area:practice_areas ( name )
      )
    `,
    )
    .order("assigned_at", { ascending: false });

  if (assignmentError) {
    return {
      matters,
      employees: (profileRows ?? []).map((row) =>
        profileToAdminEmployee(row as ProfileRow),
      ),
      assignments: [],
      error: `Could not load assignments: ${assignmentError.message}`,
    };
  }

  const hoursByProfile = new Map<string, number>();
  for (const row of assignmentRows ?? []) {
    const profileId = String((row as { profile_id?: string }).profile_id || "");
    if (!profileId) continue;
    hoursByProfile.set(profileId, (hoursByProfile.get(profileId) ?? 0) + 20);
  }

  const employees = (profileRows ?? []).map((row) =>
    profileToAdminEmployee(
      row as ProfileRow,
      hoursByProfile.get(String((row as ProfileRow).id)) ?? 0,
    ),
  );

  const matterById = new Map(matters.map((m) => [m.id, m]));

  const assignments: AdminAssignment[] = (assignmentRows ?? []).map((raw) => {
    const row = raw as {
      id: string;
      matter_id: string;
      profile_id: string;
      role_on_matter?: string | null;
      assigned_at?: string | null;
      profile?: ProfileRow | ProfileRow[] | null;
      matter?: {
        id?: string;
        title?: string | null;
        status?: string | null;
        created_at?: string | null;
        client?: {
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          company_name?: string | null;
        } | null;
        practice_area?: { name?: string | null } | null;
      } | null;
    };

    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    const matter =
      matterById.get(row.matter_id) ??
      sharedMatterToAdminMatter({
        id: row.matter_id,
        title: row.matter?.title ?? "Matter",
        clientName:
          row.matter?.client?.company_name ||
          row.matter?.client?.name ||
          [row.matter?.client?.first_name, row.matter?.client?.last_name]
            .filter(Boolean)
            .join(" ") ||
          "Unknown client",
        practiceArea: row.matter?.practice_area?.name ?? "General",
        status: row.matter?.status ?? "open",
        openDate: row.matter?.created_at?.slice(0, 10) ?? todayIsoDate(),
      });

    const assignedDate = row.assigned_at?.slice(0, 10) ?? todayIsoDate();
    const attorneyName =
      profile?.full_name?.trim() ||
      profile?.email?.trim() ||
      "Unknown employee";

    return {
      id: row.id,
      matterId: matter.id,
      matterLabel: matter.matterLabel,
      matterReference: matter.matterReference,
      clientName: matter.clientName,
      attorneyName,
      employeeId: row.profile_id,
      roleOnMatter: toDisplayRoleOnMatter(row.role_on_matter ?? "lead_attorney"),
      practiceArea: matter.practiceArea,
      priority: "medium" as AssignmentPriority,
      status: matter.status === "closed" ? "completed" : "active",
      assignedDate,
      startDate: assignedDate,
      dueDate: assignedDate,
      estimatedHours: 20,
      matterStatus: matter.status,
      profileId: row.profile_id,
    };
  });

  return {
    matters,
    employees,
    assignments,
    error: mattersResult.error,
  };
}

export async function createMatterAssignment(input: {
  matterId: string;
  profileId: string;
  roleOnMatter: string;
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return {
      id: null,
      error: "Supabase is not configured.",
    };
  }

  const { data, error } = await supabase
    .from("matter_assignments")
    .insert({
      matter_id: input.matterId,
      profile_id: input.profileId,
      role_on_matter: toDbRoleOnMatter(input.roleOnMatter),
    })
    .select("id")
    .single();

  if (error) {
    const duplicate =
      error.code === "23505" ||
      /duplicate|unique/i.test(error.message);
    return {
      id: null,
      error: duplicate
        ? "That employee is already assigned to this matter. Reassign or pick a different employee."
        : error.message,
    };
  }

  return { id: data?.id ?? null, error: null };
}

export async function updateMatterAssignment(input: {
  id: string;
  matterId: string;
  profileId: string;
  roleOnMatter: string;
}): Promise<{ error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase
    .from("matter_assignments")
    .update({
      matter_id: input.matterId,
      profile_id: input.profileId,
      role_on_matter: toDbRoleOnMatter(input.roleOnMatter),
    })
    .eq("id", input.id);

  return { error: error?.message ?? null };
}

export async function deleteMatterAssignment(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase
    .from("matter_assignments")
    .delete()
    .eq("id", id);

  return { error: error?.message ?? null };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { useAdminData } from "@/components/admin/AdminDataProvider";
import type {
  AdminPermissionKey,
  AdminRolePermission,
} from "@/lib/admin/types";

/**
 * Role Permissions UI — local mock matrix only.
 * Does NOT create secure production access control. Server-side enforcement
 * and Supabase Row Level Security must be added during integration.
 */

const PERMISSION_COLUMNS: Array<{
  key: AdminPermissionKey;
  label: string;
  highRisk?: boolean;
}> = [
  { key: "canAccessAdminSection", label: "Access Admin Section" },
  { key: "canViewManagerDashboard", label: "View Manager Dashboard" },
  { key: "canViewEmployeeDirectory", label: "View Employee Directory" },
  { key: "canManageEmployees", label: "Manage Employees", highRisk: true },
  { key: "canViewEmployeeProfiles", label: "View Employee Profiles" },
  {
    key: "canViewInternalCostRates",
    label: "View Internal Cost Rates",
    highRisk: true,
  },
  { key: "canManageRoles", label: "Manage Roles", highRisk: true },
  { key: "canAssignMatters", label: "Assign Matters" },
  { key: "canReassignMatters", label: "Reassign Matters" },
  { key: "canViewWorkload", label: "View All Workloads" },
  { key: "canApproveWork", label: "Approve Work" },
  { key: "canApproveTimeEntries", label: "Approve Time Entries" },
  { key: "canApproveExpenses", label: "Approve Expenses" },
  { key: "canApproveVacation", label: "Approve Vacation" },
  { key: "canApproveWriteDowns", label: "Approve Write-Downs", highRisk: true },
  { key: "canAccessBilling", label: "Access Billing" },
  { key: "canAccessAccounting", label: "Access Accounting", highRisk: true },
  { key: "canViewAuditLogs", label: "View Audit Logs", highRisk: true },
];

const RESTRICTED_INFO_KEYS = new Set<AdminPermissionKey>([
  "canViewInternalCostRates",
  "canAccessAccounting",
  "canViewAuditLogs",
]);

type ChangeRow = {
  roleId: string;
  roleLabel: string;
  key: AdminPermissionKey;
  label: string;
  from: boolean;
  to: boolean;
  highRisk: boolean;
};

function cloneRoles(roles: AdminRolePermission[]): AdminRolePermission[] {
  return roles.map((r) => ({ ...r }));
}

function permissionLabel(key: AdminPermissionKey): string {
  return PERMISSION_COLUMNS.find((c) => c.key === key)?.label ?? key;
}

export function RolePermissions() {
  const { data, loading, error, refresh } = useAdminData();
  const [savedRoles, setSavedRoles] = useState<AdminRolePermission[]>([]);
  const [draftRoles, setDraftRoles] = useState<AdminRolePermission[]>([]);
  const [actingRoleKey, setActingRoleKey] = useState("firm_administrator");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!data) return;
    const roles = cloneRoles(data.rolePermissions);
    setSavedRoles(roles);
    setDraftRoles(cloneRoles(roles));
    setSelectedRoleId(roles[0]?.id ?? null);
  }, [data]);

  const actingRole = useMemo(
    () => savedRoles.find((r) => r.roleKey === actingRoleKey) ?? null,
    [savedRoles, actingRoleKey],
  );

  const canEdit = !!actingRole?.canManageRoles;

  const selectedRole = useMemo(
    () => draftRoles.find((r) => r.id === selectedRoleId) ?? null,
    [draftRoles, selectedRoleId],
  );

  const changes = useMemo(() => {
    const rows: ChangeRow[] = [];
    for (const draft of draftRoles) {
      const saved = savedRoles.find((r) => r.id === draft.id);
      if (!saved) continue;
      for (const col of PERMISSION_COLUMNS) {
        if (draft[col.key] !== saved[col.key]) {
          rows.push({
            roleId: draft.id,
            roleLabel: draft.roleLabel,
            key: col.key,
            label: col.label,
            from: saved[col.key],
            to: draft[col.key],
            highRisk: !!col.highRisk,
          });
        }
      }
    }
    return rows;
  }, [draftRoles, savedRoles]);

  const hasUnsaved = changes.length > 0;

  function setPermission(
    roleId: string,
    key: AdminPermissionKey,
    value: boolean,
  ) {
    setActionError(null);
    setSuccessMessage(null);

    if (!canEdit || !actingRole) {
      setActionError(
          "Only a role with Manage Roles can edit permissions.",
      );
      return;
    }

    const role = draftRoles.find((r) => r.id === roleId);
    if (!role) return;

    // Client hard locks
    if (role.roleKey === "client") {
      if (key === "canAccessAdminSection" && value) {
        setActionError(
          "The Client role must never be allowed to access the Admin section.",
        );
        return;
      }
      if (key === "canViewInternalCostRates" && value) {
        setActionError(
          "The Client role must never view internal cost rates.",
        );
        return;
      }
    }

    // Cannot grant a permission the actor does not possess
    if (value && !actingRole[key]) {
      setActionError(
        `You cannot grant “${permissionLabel(key)}” because the acting role (${actingRole.roleLabel}) does not possess it.`,
      );
      return;
    }

    // Preview next matrix for safety checks
    const next = draftRoles.map((r) =>
      r.id === roleId ? { ...r, [key]: value } : r,
    );

    // Client: force-deny protected flags even if somehow toggled
    const sanitized = next.map((r) =>
      r.roleKey === "client"
        ? {
            ...r,
            canAccessAdminSection: false,
            canViewInternalCostRates: false,
          }
        : r,
    );

    // At least one role must retain Manage Roles
    if (key === "canManageRoles" && !value) {
      const remaining = sanitized.filter((r) => r.canManageRoles).length;
      if (remaining === 0) {
        setActionError(
          "At least one role must keep Manage Roles. You cannot remove it from every role.",
        );
        return;
      }
    }

    // Final Administrator cannot remove own Administrator access
    if (
      role.roleKey === "firm_administrator" &&
      (key === "canAccessAdminSection" || key === "canManageRoles") &&
      !value
    ) {
      const otherAdmins = sanitized.filter(
        (r) =>
          r.roleKey !== "firm_administrator" &&
          r.canAccessAdminSection &&
          r.canManageRoles,
      );
      if (otherAdmins.length === 0) {
        setActionError(
          "Cannot remove Administrator access from the final active Administrator role.",
        );
        return;
      }
    }

    setDraftRoles(sanitized);
  }

  function resetUnsaved() {
    setDraftRoles(cloneRoles(savedRoles));
    setActionError(null);
    setSuccessMessage("Unsaved changes were discarded.");
    setConfirmOpen(false);
  }

  function beginSave() {
    setActionError(null);
    if (!canEdit) {
      setActionError("Acting role cannot manage roles.");
      return;
    }
    if (!hasUnsaved) {
      setActionError("No permission changes to save.");
      return;
    }
    setConfirmOpen(true);
  }

  function confirmSave() {
    // Re-apply Client locks and structural rules on save
    const next = cloneRoles(draftRoles).map((r) =>
      r.roleKey === "client"
        ? {
            ...r,
            canAccessAdminSection: false,
            canViewInternalCostRates: false,
          }
        : r,
    );

    if (!next.some((r) => r.canManageRoles)) {
      setActionError(
        "Save blocked: at least one role must retain Manage Roles.",
      );
      setConfirmOpen(false);
      return;
    }

    const adminRole = next.find((r) => r.roleKey === "firm_administrator");
    if (
      adminRole &&
      (!adminRole.canAccessAdminSection || !adminRole.canManageRoles)
    ) {
      const otherAdmins = next.filter(
        (r) =>
          r.roleKey !== "firm_administrator" &&
          r.canAccessAdminSection &&
          r.canManageRoles,
      );
      if (otherAdmins.length === 0) {
        setActionError(
          "Save blocked: cannot strip the final Administrator of Admin access / Manage Roles.",
        );
        setConfirmOpen(false);
        return;
      }
    }

    // Actor cannot grant what they don't have (defense in depth)
    if (actingRole) {
      for (const change of changes) {
        if (change.to && !actingRole[change.key]) {
          setActionError(
            `Save blocked: acting role cannot grant “${change.label}”.`,
          );
          setConfirmOpen(false);
          return;
        }
      }
    }

    setSavedRoles(next);
    setDraftRoles(cloneRoles(next));
    setConfirmOpen(false);
    setSuccessMessage(
      `Saved ${changes.length} permission change${changes.length === 1 ? "" : "s"} locally.`,
    );
  }

  if (loading) {
    return <LoadingState message="Loading role permissions..." />;
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load roles</CardTitle>
          <CardDescription className="text-red-700">
            {error ?? "Live firm data could not be loaded."}
          </CardDescription>
        </CardHeader>
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (draftRoles.length === 0) {
    return (
      <EmptyState
        title="No role permissions defined"
        description="Role capability matrices will be managed here without rebuilding authentication."
        moduleLabel="Admin · Roles"
      />
    );
  }

  const exposesRestricted = changes.some(
    (c) => c.to && RESTRICTED_INFO_KEYS.has(c.key),
  );
  const hasHighRiskChanges = changes.some((c) => c.highRisk);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Live firm data:</strong>{" "}
        Permission edits update local page state. This page does{" "}
        <strong>not</strong> create secure production access control.
        Server-side enforcement remains required for secure production access
        control.
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

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      <Card padding="md">
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Role permission matrix</CardTitle>
            <CardDescription>
              Roles as rows, permissions as columns. High-risk permissions are
              marked. Editing requires Manage Roles on the acting role.
            </CardDescription>
          </div>
          <Select
            label="Acting as"
            value={actingRoleKey}
            onChange={(e) => {
              setActingRoleKey(e.target.value);
              setActionError(null);
            }}
            options={savedRoles.map((r) => ({
              value: r.roleKey,
              label: `${r.roleLabel}${r.canManageRoles ? " — can edit" : ""}`,
            }))}
          />
        </CardHeader>

        {!canEdit && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Acting role <strong>{actingRole?.roleLabel ?? "Unknown"}</strong>{" "}
              cannot manage roles. Matrix is read-only until you switch to
              Firm Administrator (or another role with Manage Roles).
            </span>
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          <Button onClick={beginSave} disabled={!canEdit || !hasUnsaved}>
            Save Changes
          </Button>
          <Button
            variant="secondary"
            onClick={resetUnsaved}
            disabled={!hasUnsaved}
          >
            Reset Unsaved Changes
          </Button>
          {hasUnsaved && (
            <Badge variant="warning">
              {changes.length} unsaved change{changes.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {/* Desktop / wide matrix */}
        <div className="hidden overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[140px] bg-white">
                  Role
                </TableHead>
                {PERMISSION_COLUMNS.map((col) => (
                  <TableHead key={col.key} className="min-w-[110px] text-xs">
                    <span className="inline-flex flex-col gap-1">
                      <span>{col.label}</span>
                      {col.highRisk && (
                        <Badge variant="danger" className="w-fit">
                          High risk
                        </Badge>
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftRoles.map((role) => {
                const saved = savedRoles.find((r) => r.id === role.id);
                return (
                  <TableRow key={role.id}>
                    <TableCell className="sticky left-0 z-10 bg-white">
                      <button
                        type="button"
                        className="text-left font-medium text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        {role.roleLabel}
                      </button>
                      <div className="text-xs text-muted">{role.roleKey}</div>
                    </TableCell>
                    {PERMISSION_COLUMNS.map((col) => {
                      const checked = role[col.key];
                      const changed = saved ? saved[col.key] !== checked : false;
                      const highlight =
                        changed &&
                        (col.highRisk || RESTRICTED_INFO_KEYS.has(col.key));
                      return (
                        <TableCell
                          key={col.key}
                          className={
                            highlight
                              ? "bg-amber-50"
                              : changed
                                ? "bg-gold-100/40"
                                : undefined
                          }
                        >
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canEdit}
                              onChange={(e) =>
                                setPermission(role.id, col.key, e.target.checked)
                              }
                              aria-label={`${role.roleLabel}: ${col.label}`}
                            />
                            <span className="sr-only lg:not-sr-only lg:text-xs">
                              {checked ? "On" : "Off"}
                            </span>
                          </label>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Narrow screens: stacked per-role cards */}
        <div className="space-y-3 lg:hidden">
          {draftRoles.map((role) => {
            const saved = savedRoles.find((r) => r.id === role.id);
            return (
              <div
                key={role.id}
                className="rounded-lg border border-gray-100 bg-surface p-3"
              >
                <button
                  type="button"
                  className="mb-2 text-left font-semibold text-navy-900 underline-offset-2 hover:underline"
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  {role.roleLabel}
                </button>
                <ul className="space-y-2">
                  {PERMISSION_COLUMNS.map((col) => {
                    const checked = role[col.key];
                    const changed = saved ? saved[col.key] !== checked : false;
                    return (
                      <li
                        key={col.key}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-sm ${
                          changed ? "bg-amber-50" : ""
                        }`}
                      >
                        <span className="text-navy-900">
                          {col.label}
                          {col.highRisk ? (
                            <span className="ml-1 text-xs text-red-700">
                              (high risk)
                            </span>
                          ) : null}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canEdit}
                          onChange={(e) =>
                            setPermission(role.id, col.key, e.target.checked)
                          }
                          aria-label={`${role.roleLabel}: ${col.label}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedRole && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Role detail — {selectedRole.roleLabel}</CardTitle>
            <CardDescription>{selectedRole.description}</CardDescription>
          </CardHeader>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PERMISSION_COLUMNS.map((col) => (
              <li
                key={col.key}
                className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2 text-sm"
              >
                <span className="text-muted">{col.label}</span>
                <Badge
                  variant={selectedRole[col.key] ? "success" : "neutral"}
                >
                  {selectedRole[col.key] ? "Allowed" : "Denied"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {hasUnsaved && (
        <Card padding="md">
          <CardHeader>
            <CardTitle>Unsaved change summary</CardTitle>
            <CardDescription>
              Original values stay until you confirm Save Changes.
            </CardDescription>
          </CardHeader>
          <ul className="space-y-2 text-sm">
            {changes.map((c) => (
              <li
                key={`${c.roleId}-${c.key}`}
                className={`rounded-md border px-3 py-2 ${
                  c.highRisk
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-gray-100 bg-surface text-navy-900"
                }`}
              >
                <strong>{c.roleLabel}</strong> — {c.label}:{" "}
                {c.from ? "Allowed" : "Denied"} → {c.to ? "Allowed" : "Denied"}
                {c.highRisk ? " (high-risk)" : ""}
              </li>
            ))}
          </ul>
          {exposesRestricted && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Warning: one or more changes could expose restricted internal
                information (cost rates, accounting, or audit logs).
              </span>
            </div>
          )}
        </Card>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm permission changes"
        description={
          hasHighRiskChanges
            ? "High-risk permission changes are included. Confirm carefully."
            : "Review the summary, then confirm to update local state."
        }
        className="max-w-xl"
      >
        <div className="space-y-3 text-sm">
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {changes.map((c) => (
              <li
                key={`${c.roleId}-${c.key}-confirm`}
                className="border-b border-gray-100 pb-2"
              >
                <strong>{c.roleLabel}</strong>: {c.label} —{" "}
                {c.from ? "Allowed" : "Denied"} → {c.to ? "Allowed" : "Denied"}
                {c.highRisk ? (
                  <span className="ml-1 font-medium text-red-700">
                    (high-risk)
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {exposesRestricted && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                This save may expose restricted internal information.
              </span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={hasHighRiskChanges ? "danger" : "primary"}
              onClick={confirmSave}
            >
              Confirm save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

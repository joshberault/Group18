"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import type { ClientFormValues, ConflictCheckStatus } from "@/lib/clients/types";
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";
import type { ClientPermissions } from "@/lib/clients/permissions";
import { validateClientForm, hasFormErrors } from "@/lib/clients/format";

interface ClientFormProps {
  initialValues: ClientFormValues;
  permissions: ClientPermissions;
  submitLabel: string;
  onSubmit: (values: ClientFormValues, options: { acknowledgeDuplicate: boolean }) => Promise<void>;
  duplicateWarning?: string | null;
  busy?: boolean;
  mode: "create" | "edit";
}

export function ClientForm({
  initialValues,
  permissions,
  submitLabel,
  onSubmit,
  duplicateWarning,
  busy,
  mode,
}: ClientFormProps) {
  const [values, setValues] = useState<ClientFormValues>(initialValues);
  const [errors, setErrors] = useState<ReturnType<typeof validateClientForm>>({});
  const [ackDuplicate, setAckDuplicate] = useState(false);

  const conflictOptions = useMemo(() => {
    return (Object.entries(CONFLICT_STATUS_LABELS) as [ConflictCheckStatus, string][])
      .filter(([status]) => {
        if (!permissions.canEditConflict) return false;
        if (status === "cleared" && !permissions.canClearConflict) return false;
        return true;
      })
      .map(([value, label]) => ({ value, label }));
  }, [permissions]);

  function update<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateClientForm(values);
    setErrors(nextErrors);
    if (hasFormErrors(nextErrors)) return;

    if (!permissions.canCreate && mode === "create") return;
    if (!permissions.canEditContact && !permissions.canEditConflict && !permissions.canEditStatus && mode === "edit") {
      return;
    }

    await onSubmit(values, { acknowledgeDuplicate: ackDuplicate });
  }

  const contactDisabled = !permissions.canEditContact;
  const conflictDisabled = !permissions.canEditConflict;
  const statusDisabled = !permissions.canEditStatus;
  const notesDisabled = !permissions.canViewInternalNotes || contactDisabled;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Section 1 · Client type</CardTitle>
          <CardDescription>Choose individual or company. Required fields change based on type.</CardDescription>
        </CardHeader>
        <Select
          label="Client type"
          value={values.client_type}
          disabled={contactDisabled}
          onChange={(e) => update("client_type", e.target.value as ClientFormValues["client_type"])}
          options={[
            { value: "individual", label: "Individual" },
            { value: "company", label: "Company" },
          ]}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section 2 · Basic information</CardTitle>
          <CardDescription>Required fields are marked with *.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2">
          {values.client_type === "individual" ? (
            <>
              <Input
                label="First name *"
                value={values.first_name}
                disabled={contactDisabled}
                error={errors.first_name}
                onChange={(e) => update("first_name", e.target.value)}
              />
              <Input
                label="Last name *"
                value={values.last_name}
                disabled={contactDisabled}
                error={errors.last_name}
                onChange={(e) => update("last_name", e.target.value)}
              />
              <Input
                label="Primary contact"
                value={values.primary_contact_name}
                disabled={contactDisabled}
                onChange={(e) => update("primary_contact_name", e.target.value)}
              />
            </>
          ) : (
            <>
              <Input
                label="Company name *"
                value={values.company_name}
                disabled={contactDisabled}
                error={errors.company_name}
                onChange={(e) => update("company_name", e.target.value)}
              />
              <Input
                label="Primary contact name *"
                value={values.primary_contact_name}
                disabled={contactDisabled}
                error={errors.primary_contact_name}
                onChange={(e) => update("primary_contact_name", e.target.value)}
              />
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section 3 · Contact information</CardTitle>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={values.email}
            disabled={contactDisabled}
            error={errors.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <Input
            label="Phone"
            value={values.phone}
            disabled={contactDisabled}
            onChange={(e) => update("phone", e.target.value)}
          />
          <Input
            label="Address line 1"
            value={values.address_line_1}
            disabled={contactDisabled}
            onChange={(e) => update("address_line_1", e.target.value)}
          />
          <Input
            label="Address line 2"
            value={values.address_line_2}
            disabled={contactDisabled}
            onChange={(e) => update("address_line_2", e.target.value)}
          />
          <Input
            label="City"
            value={values.city}
            disabled={contactDisabled}
            onChange={(e) => update("city", e.target.value)}
          />
          <Input
            label="State"
            value={values.state}
            disabled={contactDisabled}
            onChange={(e) => update("state", e.target.value)}
          />
          <Input
            label="Postal code"
            value={values.postal_code}
            disabled={contactDisabled}
            onChange={(e) => update("postal_code", e.target.value)}
          />
        </div>
      </Card>

      {(permissions.canEditConflict || permissions.canViewConflictNotes) && (
        <Card>
          <CardHeader>
            <CardTitle>Section 4 · Conflict check</CardTitle>
            <CardDescription>
              Conflict results must be selected intentionally. Cleared cannot be set by unauthorized roles.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {permissions.canEditConflict ? (
              <Select
                label="Conflict-check status"
                value={values.conflict_check_status}
                disabled={conflictDisabled}
                onChange={(e) =>
                  update(
                    "conflict_check_status",
                    e.target.value as ConflictCheckStatus,
                  )
                }
                options={conflictOptions}
              />
            ) : (
              <Input
                label="Conflict-check status"
                value={CONFLICT_STATUS_LABELS[values.conflict_check_status]}
                disabled
              />
            )}
            <Input
              label="Reviewed by"
              value={values.conflict_checked_by}
              disabled={conflictDisabled}
              error={errors.conflict_checked_by}
              onChange={(e) => update("conflict_checked_by", e.target.value)}
            />
            <Input
              label="Review date"
              type="date"
              value={values.conflict_checked_at}
              disabled={conflictDisabled}
              onChange={(e) => update("conflict_checked_at", e.target.value)}
            />
          </div>
          {permissions.canViewConflictNotes && (
            <div className="mt-4">
              <Textarea
                label="Conflict-check notes"
                value={values.conflict_check_notes}
                disabled={conflictDisabled || !permissions.canEditConflict}
                onChange={(e) => update("conflict_check_notes", e.target.value)}
                rows={3}
              />
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Section 5 · Internal information</CardTitle>
        </CardHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Client status"
            value={values.status}
            disabled={statusDisabled}
            onChange={(e) =>
              update("status", e.target.value as ClientFormValues["status"])
            }
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </div>
        {permissions.canViewInternalNotes && (
          <div className="mt-4">
            <Textarea
              label="Internal notes"
              value={values.notes}
              disabled={notesDisabled}
              onChange={(e) => update("notes", e.target.value)}
              rows={4}
            />
          </div>
        )}
      </Card>

      {duplicateWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Possible duplicate client</p>
          <p className="mt-1">{duplicateWarning}</p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={ackDuplicate}
              onChange={(e) => setAckDuplicate(e.target.checked)}
            />
            I understand and still want to save this client.
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy || (Boolean(duplicateWarning) && !ackDuplicate)}>
          {busy ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientsAccessGuard } from "@/components/clients/ClientsAccessGuard";
import { getClientPermissions } from "@/lib/clients/permissions";
import {
  emptyClientForm,
  type ClientFormValues,
} from "@/lib/clients/types";
import type { UserRole } from "@/lib/types";
import {
  createClientRecord,
  findPossibleDuplicates,
} from "@/lib/clients/queries";

const CREATE_ROLES: UserRole[] = [
  "managing_partner",
  "firm_administrator",
  "attorney",
];

export function NewClientView() {
  const { role } = useDemoRole();
  const permissions = getClientPermissions(role);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  async function handleSubmit(
    values: ClientFormValues,
    options: { acknowledgeDuplicate: boolean },
  ) {
    if (!permissions.canCreate) {
      setError("You are not authorized to create clients.");
      return;
    }

    const duplicates = await findPossibleDuplicates(values);
    if (duplicates.length > 0 && !options.acknowledgeDuplicate) {
      setDuplicateWarning(
        `Possible duplicates: ${duplicates
          .map((d) => `${d.client_number} (${d.name})`)
          .join(", ")}. Check the box below to proceed anyway.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    const result = await createClientRecord(values);
    setBusy(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to create client.");
      return;
    }

    router.push(`/clients/${result.data.id}`);
  }

  return (
    <ClientsAccessGuard allowedRoles={CREATE_ROLES}>
      {!permissions.canCreate ? (
        <EmptyState
          title="Access denied"
          description="Your demo role cannot create clients. Switch to Attorney, Managing Partner, or Firm Administrator."
          moduleLabel="Restricted"
        />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="Add Client"
            description="Create an individual or company client record. Conflict checks start as Not Reviewed unless an authorized reviewer intentionally sets another status."
          >
            <Link href="/clients">
              <Button variant="secondary">Cancel</Button>
            </Link>
          </PageHeader>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <ClientForm
            mode="create"
            initialValues={emptyClientForm()}
            permissions={permissions}
            submitLabel="Create client"
            busy={busy}
            duplicateWarning={duplicateWarning}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </ClientsAccessGuard>
  );
}

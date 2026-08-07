"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { ConflictBadge } from "@/components/clients/ConflictBadge";
import { ClientForm } from "@/components/clients/ClientForm";
import { RelatedMattersSection } from "@/components/clients/RelatedMattersSection";
import { ClientsAccessGuard } from "@/components/clients/ClientsAccessGuard";
import {
  assertCanUpdateClient,
  getClientPermissions,
} from "@/lib/clients/permissions";
import {
  CLIENTS_MODULE_ROLES,
  clientToFormValues,
  displayClientName,
  emptyClientForm,
  type ClientFormValues,
  type FirmClient,
  type RelatedMatterSummary,
} from "@/lib/clients/types";
import {
  fetchClientById,
  fetchRelatedMatters,
  findPossibleDuplicates,
  updateClientRecord,
  updateClientStatus,
} from "@/lib/clients/queries";
import { formatAddress, formatDate } from "@/lib/clients/utils";
import { buildMatterCreationUrl } from "@/lib/matters/matter-creation-flow";
import { getMatterPermissions } from "@/lib/matters/permissions";
import {
  buildConflictCheckUrl,
} from "@/lib/pipeline/contract-to-cash";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";
import { USER_ROLE_LABELS } from "@/lib/types";

export function ClientDetailView({ clientId }: { clientId: string }) {
  const { role } = useDemoRole();
  const permissions = getClientPermissions(role);
  const matterPermissions = getMatterPermissions(role);
  const searchParams = useSearchParams();
  const startInEdit = searchParams.get("edit") === "1";
  const submittedClient = searchParams.get("submitted") === "client-created";
  const focusConflict = searchParams.get("focus") === "conflict";

  const [client, setClient] = useState<FirmClient | null>(null);
  const [matters, setMatters] = useState<RelatedMatterSummary[]>([]);
  const [mattersError, setMattersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(startInEdit);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [confirmInactive, setConfirmInactive] = useState(false);

  async function reload() {
    setLoading(true);
    const [clientResult, mattersResult] = await Promise.all([
      fetchClientById(clientId),
      fetchRelatedMatters(clientId),
    ]);
    setClient(clientResult.data);
    setError(clientResult.error);
    setMatters(mattersResult.data);
    setMattersError(mattersResult.error);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const formValues = useMemo(
    () => (client ? clientToFormValues(client) : emptyClientForm()),
    [client],
  );

  async function handleSave(
    values: ClientFormValues,
    options: { acknowledgeDuplicate: boolean },
  ) {
    const auth = assertCanUpdateClient(role, {
      status: values.status,
      notes: values.notes,
      conflict_check_status: values.conflict_check_status,
      conflict_check_notes: values.conflict_check_notes,
      first_name: values.first_name,
      email: values.email,
    });
    if (!auth.ok) {
      setMessage(auth.message);
      return;
    }

    const duplicates = await findPossibleDuplicates(values, clientId);
    if (duplicates.length > 0 && !options.acknowledgeDuplicate) {
      setDuplicateWarning(
        `Similar records found: ${duplicates
          .map((d) => `${d.client_number} (${d.name})`)
          .join(", ")}. Confirm to continue.`,
      );
      return;
    }

    setBusy(true);
    setMessage(null);
    const result = await updateClientRecord(clientId, values);
    setBusy(false);
    if (result.error || !result.data) {
      setMessage(result.error ?? "Update failed.");
      return;
    }
    setClient(result.data);
    setDuplicateWarning(null);
    setEditing(false);
    if (values.conflict_check_status === "cleared") {
      setMessage("Conflict cleared. You can now submit a matter creation request.");
    } else {
      setMessage("Client updated successfully.");
    }
  }

  async function handleStatusToggle() {
    if (!client || !permissions.canEditStatus) return;
    const next = client.status === "active" ? "inactive" : "active";
    if (next === "inactive") {
      setConfirmInactive(true);
      return;
    }
    setBusy(true);
    const result = await updateClientStatus(client.id, next);
    setBusy(false);
    if (result.data) {
      setClient(result.data);
      setMessage("Client reactivated.");
    } else {
      setMessage(result.error ?? "Status update failed.");
    }
  }

  async function confirmDeactivate() {
    if (!client) return;
    setConfirmInactive(false);
    setBusy(true);
    const result = await updateClientStatus(client.id, "inactive");
    setBusy(false);
    if (result.data) {
      setClient(result.data);
      setMessage("Client marked inactive. Records are retained (no permanent delete).");
    } else {
      setMessage(result.error ?? "Status update failed.");
    }
  }

  return (
    <ClientsAccessGuard allowedRoles={CLIENTS_MODULE_ROLES}>
      {loading ? (
        <LoadingState message="Loading client..." />
      ) : error || !client ? (
        <EmptyState
          title="Client not found"
          description={error ?? "This client record could not be loaded."}
        />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title={displayClientName(client)}
            description={`${client.client_number} · ${USER_ROLE_LABELS[role]} view`}
          >
            <Link href="/clients">
              <Button variant="secondary">Back to Clients</Button>
            </Link>
            {permissions.canEditContact && !editing && (
              <Button onClick={() => setEditing(true)}>Edit Client</Button>
            )}
            {matterPermissions.canSubmitCreationRequest &&
              client.conflict_check_status === "cleared" && (
                <Link href={buildMatterCreationUrl(client.id)}>
                  <Button>Create Matter Request</Button>
                </Link>
              )}
            {permissions.canEditStatus && (
              <Button
                variant={client.status === "active" ? "danger" : "primary"}
                onClick={() => void handleStatusToggle()}
                disabled={busy}
              >
                {client.status === "active" ? "Deactivate" : "Reactivate"}
              </Button>
            )}
          </PageHeader>

          {submittedClient ? (
            <PipelineHandoffBanner
              stage="client_created"
              title="Client record created."
            >
              <p>
                Switch to the Firm Administrator role and{" "}
                <PipelineHandoffLink href={buildConflictCheckUrl(client.id)}>
                  complete the conflict check
                </PipelineHandoffLink>
                .
              </p>
            </PipelineHandoffBanner>
          ) : null}

          {focusConflict && permissions.canEditConflict ? (
            <PipelineHandoffBanner stage="conflict_checked" title="Conflict review required" tone="info">
              <p>
                Update conflict status below. Once cleared, the Managing Partner can open a matter request.
              </p>
            </PipelineHandoffBanner>
          ) : null}

          {message && client.conflict_check_status === "cleared" ? (
            <PipelineHandoffBanner stage="conflict_checked" title={message}>
              <PipelineHandoffLink href={buildMatterCreationUrl(client.id)}>
                Create matter request
              </PipelineHandoffLink>
            </PipelineHandoffBanner>
          ) : message ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              {message}
            </div>
          ) : null}

          {(client.conflict_check_status === "possible_conflict" ||
            client.conflict_check_status === "pending" ||
            client.conflict_check_status === "not_reviewed") && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                client.conflict_check_status === "possible_conflict"
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-amber-300 bg-amber-50 text-amber-950"
              }`}
            >
              <p className="font-semibold">
                Conflict notice:{" "}
                {client.conflict_check_status === "possible_conflict"
                  ? "Possible Conflict — do not begin conflicting work without clearance."
                  : client.conflict_check_status === "pending"
                    ? "Conflict review is still pending."
                    : "Conflict check has not been reviewed."}
              </p>
              {permissions.canViewConflictNotes && client.conflict_check_notes && (
                <p className="mt-1">{client.conflict_check_notes}</p>
              )}
            </div>
          )}

          {editing ? (
            <ClientForm
              mode="edit"
              initialValues={formValues}
              permissions={permissions}
              submitLabel="Save changes"
              busy={busy}
              duplicateWarning={duplicateWarning}
              onSubmit={handleSave}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Client profile</CardTitle>
                  <CardDescription>Core identity and status</CardDescription>
                </CardHeader>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <Info label="Client number" value={client.client_number} />
                  <Info label="Type" value={client.client_type} />
                  <Info
                    label="Status"
                    value={<StatusBadge status={client.status} />}
                  />
                  <Info
                    label="Conflict check"
                    value={<ConflictBadge status={client.conflict_check_status} />}
                  />
                  <Info
                    label="Primary contact"
                    value={client.primary_contact_name || "—"}
                  />
                  <Info label="Email" value={client.email || "—"} />
                  <Info label="Phone" value={client.phone || "—"} />
                  <Info
                    label="Mailing address"
                    value={
                      <span className="whitespace-pre-line">
                        {formatAddress(client)}
                      </span>
                    }
                  />
                  <Info label="Created" value={formatDate(client.created_at)} />
                  <Info label="Last updated" value={formatDate(client.updated_at)} />
                </dl>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conflict & internal notes</CardTitle>
                  <CardDescription>
                    Visibility follows the {USER_ROLE_LABELS[role]} permissions.
                  </CardDescription>
                </CardHeader>
                <dl className="space-y-3 text-sm">
                  {permissions.canViewConflictNotes ? (
                    <>
                      <Info
                        label="Conflict notes"
                        value={client.conflict_check_notes || "—"}
                      />
                      <Info
                        label="Checked by"
                        value={client.conflict_checked_by || "—"}
                      />
                      <Info
                        label="Checked at"
                        value={formatDate(client.conflict_checked_at)}
                      />
                    </>
                  ) : (
                    <p className="text-muted">
                      Conflict notes are hidden for this role.
                    </p>
                  )}
                  {permissions.canViewInternalNotes ? (
                    <Info label="Internal notes" value={client.notes || "—"} />
                  ) : (
                    <p className="text-muted">
                      Internal legal notes are hidden for this role.
                    </p>
                  )}
                </dl>
              </Card>
            </div>
          )}

          <RelatedMattersSection matters={matters} loadError={mattersError} />

          <Modal
            isOpen={confirmInactive}
            onClose={() => setConfirmInactive(false)}
            title="Deactivate client?"
            description="The client will be marked Inactive. Records are retained — there is no permanent delete in this module."
          >
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmInactive(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void confirmDeactivate()}>
                Confirm deactivate
              </Button>
            </div>
          </Modal>
        </div>
      )}
    </ClientsAccessGuard>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-navy-900">{value}</dd>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { MatterCreationForm } from "@/components/matters/MatterCreationForm";
import { ClientsAccessGuard } from "@/components/clients/ClientsAccessGuard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  emptyMatterCreationForm,
  type MatterCreationLookupOption,
} from "@/lib/matters/matter-creation-types";
import {
  fetchMatterCreationLookups,
  submitMatterCreationRequest,
} from "@/lib/matters/matter-creation-queries";
import {
  buildFirmAdminApprovalsUrl,
  matterCreationNextStepLabel,
  matterCreationPipelineLabel,
} from "@/lib/matters/matter-creation-flow";
import { getMatterPermissions } from "@/lib/matters/permissions";
import { DEMO_IDENTITIES } from "@/lib/roles/role-config";

import type { UserRole } from "@/lib/types";

const CREATE_MATTER_ROLES: UserRole[] = ["managing_partner"];

export function NewMatterView() {
  const { role } = useDemoRole();
  const permissions = getMatterPermissions(role);
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillClientId = searchParams.get("clientId") ?? "";
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<MatterCreationLookupOption[]>([]);
  const [practiceAreas, setPracticeAreas] = useState<MatterCreationLookupOption[]>([]);
  const [attorneys, setAttorneys] = useState<MatterCreationLookupOption[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await fetchMatterCreationLookups();
      setClients(result.clients);
      setPracticeAreas(result.practiceAreas);
      setAttorneys(result.attorneys);
      setError(result.error);
      setLoading(false);
    })();
  }, []);

  const initialValues = useMemo(
    () => ({
      ...emptyMatterCreationForm(),
      client_id: prefillClientId,
    }),
    [prefillClientId],
  );

  async function handleSubmit(values: Parameters<typeof submitMatterCreationRequest>[0]) {
    if (!permissions.canSubmitCreationRequest) {
      setError("You are not authorized to submit matter creation requests.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await submitMatterCreationRequest(values, {
      name: DEMO_IDENTITIES[role].fullName,
      role,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Unable to submit matter request.");
      return;
    }

    const params = new URLSearchParams({
      submitted: "matter-request",
      requestId: result.requestId ?? "",
    });
    router.push(`/matters?${params.toString()}`);
  }

  return (
    <ClientsAccessGuard allowedRoles={CREATE_MATTER_ROLES}>
      {!permissions.canSubmitCreationRequest ? (
        <EmptyState
          title="Access denied"
          description="Only the Managing Partner can submit new matter creation requests."
          moduleLabel="Restricted"
        />
      ) : loading ? (
        <LoadingState message="Loading matter form…" />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title="Create Matter"
            description="Submit a new engagement for Firm Administrator approval. The matter will not open until approved."
          >
            <Link href="/matters">
              <Button variant="secondary">Cancel</Button>
            </Link>
          </PageHeader>

          <div className="rounded-lg border border-navy-100 bg-navy-50 px-4 py-3 text-sm text-navy-900">
            <p className="font-medium">{matterCreationPipelineLabel()}</p>
            <p className="mt-1 text-muted">
              After Firm Administrator approval, the engagement advances to{" "}
              {matterCreationNextStepLabel()} in the contract-to-cash pipeline.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <MatterCreationForm
            initialValues={initialValues}
            clients={clients}
            practiceAreas={practiceAreas}
            attorneys={attorneys}
            submitLabel="Submit for firm admin approval"
            busy={busy}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </ClientsAccessGuard>
  );
}

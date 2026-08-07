"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  approveMatterCreationRequest,
  fetchMatterCreationRequests,
  rejectMatterCreationRequest,
} from "@/lib/matters/matter-creation-queries";
import type { MatterCreationRequest } from "@/lib/matters/matter-creation-types";
import { MATTER_BILLING_TYPE_LABELS } from "@/lib/matters/matter-creation-types";
import {
  matterCreationNextStepLabel,
  matterCreationPipelineLabel,
} from "@/lib/matters/matter-creation-flow";
import { getMatterPermissions } from "@/lib/matters/permissions";
import { DEMO_IDENTITIES } from "@/lib/roles/role-config";
import { formatCurrency } from "@/lib/utils/cn";

function requestStatusBadge(status: MatterCreationRequest["status"]) {
  if (status === "pending") return <Badge variant="gold">Pending approval</Badge>;
  if (status === "approved") return <Badge variant="success">Approved</Badge>;
  return <Badge variant="danger">Rejected</Badge>;
}

function formatFeeSummary(request: MatterCreationRequest): string {
  if (request.billingType === "hourly" && request.hourlyRate != null) {
    return `${formatCurrency(request.hourlyRate)}/hr`;
  }
  if (request.billingType === "fixed_fee" && request.fixedFeeAmount != null) {
    return `${formatCurrency(request.fixedFeeAmount)} flat fee`;
  }
  if (request.billingType === "retainer" && request.retainerAmount != null) {
    return `${formatCurrency(request.retainerAmount)} retainer`;
  }
  return MATTER_BILLING_TYPE_LABELS[request.billingType];
}

export function MatterCreationApprovalsPanel({
  onReviewed,
}: {
  onReviewed?: (matterId?: string) => void;
}) {
  const { role } = useDemoRole();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const permissions = getMatterPermissions(role);
  const [requests, setRequests] = useState<MatterCreationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await fetchMatterCreationRequests();
    setRequests(result.data);
    setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    if (permissions.canApproveCreationRequest) {
      void load();
    }
  }, [permissions.canApproveCreationRequest]);

  useEffect(() => {
    if (searchParams.get("focus") === "matter-approvals") {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (!requestId || requests.length === 0) return;
    const match = requests.find(
      (request) => request.id === requestId && request.status === "pending",
    );
    if (match) setSelectedId(match.id);
  }, [searchParams, requests]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  );

  if (!permissions.canApproveCreationRequest) return null;

  async function handleApprove() {
    if (!selected) return;
    setBusy(true);
    const result = await approveMatterCreationRequest(selected.id, {
      name: DEMO_IDENTITIES[role].fullName,
      role,
    }, reviewNotes);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error ?? "Unable to approve request.");
      return;
    }
    setMessage(`Approved and created matter for "${selected.title}". Next pipeline step: ${matterCreationNextStepLabel()}.`);
    setSelectedId(null);
    setReviewNotes("");
    await load();
    onReviewed?.(result.matterId);
  }

  async function handleReject() {
    if (!selected) return;
    setBusy(true);
    const result = await rejectMatterCreationRequest(selected.id, {
      name: DEMO_IDENTITIES[role].fullName,
      role,
    }, reviewNotes);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error ?? "Unable to reject request.");
      return;
    }
    setMessage(`Rejected matter request "${selected.title}".`);
    setSelectedId(null);
    setReviewNotes("");
    await load();
    onReviewed?.();
  }

  return (
    <div ref={panelRef} className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
          <button
            type="button"
            className="ml-3 font-medium underline"
            onClick={() => setMessage(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <Card>
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-gold-500" aria-hidden />
              Pending Matter Creation Requests
            </CardTitle>
            <CardDescription>
              {matterCreationPipelineLabel()} — Managing Partner submissions awaiting your approval before the matter opens. Next step after approval: {matterCreationNextStepLabel()}.
            </CardDescription>
          </div>
          <Badge variant="gold">
            {pendingRequests.length} pending
          </Badge>
        </CardHeader>

        {loading ? (
          <div className="px-6 pb-6">
            <LoadingState message="Loading matter requests…" />
          </div>
        ) : error ? (
          <div className="px-6 pb-6 text-sm text-red-700">{error}</div>
        ) : pendingRequests.length === 0 ? (
          <EmptyState
            title="No pending matter requests"
            description="When the Managing Partner submits a new matter, it will appear here for approval."
            moduleLabel="Matters · Approvals"
          />
        ) : (
          <div className="overflow-x-auto px-6 pb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matter</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Practice area</TableHead>
                  <TableHead>Fee terms</TableHead>
                  <TableHead>Submitted by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.title}</div>
                      {request.proposedAttorneyName ? (
                        <div className="text-xs text-muted">
                          Proposed attorney: {request.proposedAttorneyName}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{request.clientName}</TableCell>
                    <TableCell>{request.practiceAreaName}</TableCell>
                    <TableCell>{formatFeeSummary(request)}</TableCell>
                    <TableCell>{request.submittedByName}</TableCell>
                    <TableCell>{requestStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setSelectedId(request.id)}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selected}
        onClose={() => {
          if (busy) return;
          setSelectedId(null);
          setReviewNotes("");
        }}
        title="Review matter creation request"
        description={selected ? `${selected.clientName} · ${selected.title}` : ""}
        className="max-w-2xl"
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted">Practice area</p>
                <p className="font-medium">{selected.practiceAreaName}</p>
              </div>
              <div>
                <p className="text-muted">Fee arrangement</p>
                <p className="font-medium">{formatFeeSummary(selected)}</p>
              </div>
              <div>
                <p className="text-muted">Submitted by</p>
                <p className="font-medium">{selected.submittedByName}</p>
              </div>
              <div>
                <p className="text-muted">Proposed attorney</p>
                <p className="font-medium">
                  {selected.proposedAttorneyName || "Unassigned"}
                </p>
              </div>
            </div>

            {selected.description ? (
              <div>
                <p className="text-sm text-muted">Description</p>
                <p className="text-sm">{selected.description}</p>
              </div>
            ) : null}

            {selected.expenseTerms ? (
              <div>
                <p className="text-sm text-muted">Expense terms</p>
                <p className="text-sm">{selected.expenseTerms}</p>
              </div>
            ) : null}

            <Textarea
              label="Review notes (optional)"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Notes for the managing partner or staffing team…"
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedId(null);
                  setReviewNotes("");
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button variant="ghost" onClick={() => void handleReject()} disabled={busy}>
                Reject
              </Button>
              <Button onClick={() => void handleApprove()} disabled={busy}>
                Approve & create matter
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSignature } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { getMatterPermissions } from "@/lib/matters/permissions";
import {
  approveEngagement,
  fetchPendingEngagementApprovals,
  type EngagementApprovalRequest,
} from "@/lib/pipeline/engagement-approval-store";
import {
  buildAttorneyTimeUrl,
  pipelineStepLabel,
} from "@/lib/pipeline/contract-to-cash";

export function EngagementApprovalsPanel({
  onReviewed,
}: {
  onReviewed?: (matterId: string) => void;
}) {
  const { role } = useDemoRole();
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const permissions = getMatterPermissions(role);
  const [requests, setRequests] = useState<EngagementApprovalRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    setRequests(fetchPendingEngagementApprovals());
  };

  useEffect(() => {
    if (permissions.canApproveCreationRequest) {
      load();
    }
  }, [permissions.canApproveCreationRequest]);

  useEffect(() => {
    if (searchParams.get("focus") === "engagement-approvals") {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const highlightedId = searchParams.get("matterId");

  const pending = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  if (!permissions.canApproveCreationRequest) return null;

  function handleApprove(request: EngagementApprovalRequest) {
    if (!approveEngagement(request.matterId)) {
      setMessage("Unable to approve engagement.");
      return;
    }
    setMessage(`Engagement approved for "${request.matterTitle}". Attorneys can begin work.`);
    load();
    onReviewed?.(request.matterId);
  }

  return (
    <div ref={panelRef} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Engagement Agreement Approvals
          </CardTitle>
          <CardDescription>
            {pipelineStepLabel("agreement_approved")} — confirm engagement letters before billable work begins.
          </CardDescription>
        </CardHeader>
        {pending.length === 0 ? (
          <EmptyState
            title="No pending engagement approvals"
            description="New matters appear here after matter creation is approved."
            moduleLabel="Step 4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((request) => (
                <TableRow
                  key={request.matterId}
                  className={
                    request.matterId === highlightedId
                      ? "bg-green-50 ring-1 ring-inset ring-green-200"
                      : undefined
                  }
                >
                  <TableCell className="font-medium">{request.matterTitle}</TableCell>
                  <TableCell>{request.clientName}</TableCell>
                  <TableCell>
                    <Badge variant="gold">Pending signature</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleApprove(request)}>
                      Approve engagement
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {message ? (
        <PipelineHandoffBanner stage="agreement_approved" title={message}>
          <p>
            Switch to the Attorney role and open{" "}
            <PipelineHandoffLink href={buildAttorneyTimeUrl(highlightedId ?? undefined)}>
              Time &amp; billing
            </PipelineHandoffLink>{" "}
            to log work on the approved engagement.
          </p>
        </PipelineHandoffBanner>
      ) : null}
    </div>
  );
}

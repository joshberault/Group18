"use client";

import type { ArWriteOffRequest } from "@/lib/mock-data/ar-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import { useWriteOffRequests } from "./useWriteOffRequests";
import { WriteOffDetailDrawer } from "./WriteOffDetailDrawer";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

function writeOffStatusKey(
  status: ArWriteOffRequest["approvalStatus"],
): string {
  switch (status) {
    case "Pending":
      return "pending";
    case "Under Review":
      return "under_review";
    case "Approved":
      return "approved";
    case "Rejected":
      return "rejected";
    default:
      return "pending";
  }
}

export function WriteOffApprovalsSection() {
  const {
    requests,
    selectedRequest,
    pendingAction,
    rejectReason,
    rejectError,
    toast,
    isActionable,
    openReview,
    closeReview,
    requestApprove,
    requestReject,
    cancelPendingAction,
    confirmApprove,
    confirmReject,
    setRejectReason,
    setRejectError,
    setToast,
  } = useWriteOffRequests();

  const pendingRequest = pendingAction
    ? requests.find((request) => request.id === pendingAction.requestId)
    : null;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Write-Off Approvals</CardTitle>
          <CardDescription>
            Requests awaiting manager approval
          </CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Requested Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>Approval Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const actionable = isActionable(request.approvalStatus);

              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.client}
                  </TableCell>
                  <TableCell>{request.invoice}</TableCell>
                  <TableCell>
                    {formatCurrency(request.requestedAmount)}
                  </TableCell>
                  <TableCell className="max-w-[200px] break-words">
                    {request.reason}
                  </TableCell>
                  <TableCell>{request.requestedBy}</TableCell>
                  <TableCell>{request.requestedDate}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={writeOffStatusKey(request.approvalStatus)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!actionable}
                        onClick={() => requestApprove(request.id)}
                        aria-label={`Approve write-off for ${request.invoice}`}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!actionable}
                        onClick={() => requestReject(request.id)}
                        aria-label={`Reject write-off for ${request.invoice}`}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReview(request.id)}
                        aria-label={`Review write-off for ${request.invoice}`}
                      >
                        Review
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <WriteOffDetailDrawer
        request={selectedRequest}
        onClose={closeReview}
        onApprove={requestApprove}
        onReject={requestReject}
        isActionable={isActionable}
      />

      <Modal
        isOpen={pendingAction?.type === "approve"}
        onClose={cancelPendingAction}
        title="Confirm write-off approval"
        description={
          pendingRequest
            ? `${pendingRequest.invoice} — ${formatCurrency(pendingRequest.requestedAmount)}`
            : undefined
        }
      >
        <p className="text-sm text-muted">
          Approve this write-off request for {pendingRequest?.client}? This
          updates the request status in the current prototype session only.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={confirmApprove}>Confirm approval</Button>
          <Button variant="secondary" onClick={cancelPendingAction}>
            Cancel
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={pendingAction?.type === "reject"}
        onClose={cancelPendingAction}
        title="Reject write-off request"
        description={
          pendingRequest
            ? `${pendingRequest.invoice} — ${pendingRequest.client}`
            : undefined
        }
      >
        <Textarea
          label="Rejection reason"
          value={rejectReason}
          onChange={(e) => {
            setRejectReason(e.target.value);
            if (rejectError) {
              setRejectError("");
            }
          }}
          placeholder="Enter the reason for rejecting this write-off request..."
          error={rejectError}
          rows={4}
        />
        <p className="mt-3 text-sm text-muted">
          A rejection reason is required. This updates the request status in
          the current prototype session only.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={confirmReject}>
            Confirm rejection
          </Button>
          <Button variant="ghost" onClick={cancelPendingAction}>
            Cancel
          </Button>
        </div>
      </Modal>

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant ?? "success"}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}

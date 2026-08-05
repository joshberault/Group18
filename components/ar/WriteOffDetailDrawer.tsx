"use client";

import type { ArWriteOffRequest } from "@/lib/mock-data/ar-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

interface WriteOffDetailDrawerProps {
  request: ArWriteOffRequest | null;
  onClose: () => void;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isActionable: (status: ArWriteOffRequest["approvalStatus"]) => boolean;
}

export function WriteOffDetailDrawer({
  request,
  onClose,
  onApprove,
  onReject,
  isActionable,
}: WriteOffDetailDrawerProps) {
  if (!request) return null;

  const writeOffPercent =
    request.outstandingBalance > 0
      ? ((request.requestedAmount / request.outstandingBalance) * 100).toFixed(
          1,
        )
      : "0.0";
  const canAct = isActionable(request.approvalStatus);

  return (
    <Drawer
      isOpen={Boolean(request)}
      onClose={onClose}
      title="Write-Off Request Review"
      description={`${request.invoice} — ${request.client}`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge status={writeOffStatusKey(request.approvalStatus)} />
          <p className="text-sm text-muted">
            Requested {request.requestedDate} by {request.requestedBy}
          </p>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Client</dt>
            <dd className="mt-1 font-medium break-words text-navy-900">
              {request.client}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Matter</dt>
            <dd className="mt-1 font-medium break-words text-navy-900">
              {request.matter}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Invoice number</dt>
            <dd className="mt-1 font-medium text-navy-900">{request.invoice}</dd>
          </div>
          <div>
            <dt className="text-muted">Responsible attorney</dt>
            <dd className="mt-1 font-medium text-navy-900">
              {request.responsibleAttorney}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Original invoice amount</dt>
            <dd className="mt-1 font-medium text-navy-900">
              {formatCurrency(request.originalInvoiceAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Outstanding balance</dt>
            <dd className="mt-1 font-medium text-navy-900">
              {formatCurrency(request.outstandingBalance)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Requested write-off amount</dt>
            <dd className="mt-1 font-medium text-navy-900">
              {formatCurrency(request.requestedAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Percentage of balance</dt>
            <dd className="mt-1 font-medium text-navy-900">
              {writeOffPercent}%
            </dd>
          </div>
          <div>
            <dt className="text-muted">Days outstanding</dt>
            <dd className="mt-1 font-medium text-navy-900">
              {request.daysOutstanding} days
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-sm font-medium text-muted">Reason</p>
          <p className="mt-1 text-sm break-words text-navy-900">
            {request.reason}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">Supporting notes</p>
          <p className="mt-1 text-sm break-words text-navy-900">
            {request.supportingNotes}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-muted">
            Prior collection activity
          </p>
          <p className="mt-1 text-sm break-words text-navy-900">
            {request.priorCollectionActivity}
          </p>
        </div>

        {request.rejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">
              Rejection reason
            </p>
            <p className="mt-1 text-sm break-words text-red-900">
              {request.rejectionReason}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
          {canAct ? (
            <>
              <Button
                onClick={() => onApprove(request.id)}
                aria-label={`Approve write-off for ${request.invoice}`}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => onReject(request.id)}
                aria-label={`Reject write-off for ${request.invoice}`}
              >
                Reject
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">
              This request has already been {request.approvalStatus.toLowerCase()}
              .
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

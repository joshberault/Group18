"use client";

import { useState } from "react";
import type { ArCollectionsRecord } from "@/lib/mock-data/ar-oversight";
import { COLLECTION_ESCALATION_LABELS } from "@/lib/mock-data/ar-oversight";
import {
  approveExternalCollections,
  escalateCollectionStage,
} from "@/lib/accounting";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { formatCurrency } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface CollectionRecordDetailDrawerProps {
  record: ArCollectionsRecord | null;
  onClose: () => void;
  onUpdated?: () => void;
}

function statusToBadgeKey(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function CollectionRecordDetailDrawer({
  record,
  onClose,
  onUpdated,
}: CollectionRecordDetailDrawerProps) {
  const { selectedRole, identity } = useDemoRole();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!record) return null;

  const canEscalate =
    record.escalationStage !== "write_off_requested" &&
    record.escalationStage !== "external_collections";

  const canApproveExternal =
    selectedRole === "managing_partner" &&
    record.escalationStage === "write_off_requested" &&
    !record.externalCollectionsApproved;

  async function handleEscalate() {
    setBusy(true);
    setMessage(null);
    const result = await escalateCollectionStage({
      invoiceId: record!.invoiceId,
      actor: { name: identity.fullName, role: selectedRole },
    });
    setBusy(false);
    if (result.ok) {
      const label =
        COLLECTION_ESCALATION_LABELS[
          result.nextStage as keyof typeof COLLECTION_ESCALATION_LABELS
        ] ?? result.nextStage;
      setMessage(`Escalated to ${label}.`);
      onUpdated?.();
    } else {
      setMessage(result.error ?? "Escalation failed.");
    }
  }

  async function handleApproveExternal() {
    setBusy(true);
    setMessage(null);
    const result = await approveExternalCollections({
      invoiceId: record!.invoiceId,
      approver: { name: identity.fullName, role: selectedRole },
    });
    setBusy(false);
    if (result.ok) {
      setMessage("External collections approved by Managing Partner.");
      onUpdated?.();
    } else {
      setMessage(result.error ?? "Approval failed.");
    }
  }

  return (
    <Drawer
      isOpen={Boolean(record)}
      onClose={onClose}
      title={record.invoiceNumber}
      description={`${record.client} — ${record.matter}`}
    >
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Escalation stage</dt>
          <dd>
            <StatusBadge status={record.escalationStage} />
          </dd>
        </div>
        {record.externalCollectionsApproved && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">External collections</dt>
            <dd className="font-medium text-green-800">MP approved</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Matter number</dt>
          <dd className="font-medium text-navy-900">
            {record.detail.matterNumber}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Responsible attorney</dt>
          <dd className="font-medium text-navy-900">{record.attorney}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Collection status</dt>
          <dd>
            <StatusBadge status={statusToBadgeKey(record.collectionStatus)} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Aging bucket</dt>
          <dd className="font-medium text-navy-900">{record.agingBucket}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Original amount</dt>
          <dd className="font-medium text-navy-900">
            {formatCurrency(record.originalAmount)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Outstanding balance</dt>
          <dd className="font-medium text-navy-900">
            {formatCurrency(record.outstandingBalance)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Age</dt>
          <dd className="font-medium text-navy-900">{record.ageDays} days</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Invoice date</dt>
          <dd className="font-medium text-navy-900">{record.invoiceDate}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Due date</dt>
          <dd className="font-medium text-navy-900">{record.dueDate}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Last contact</dt>
          <dd className="font-medium text-navy-900">{record.lastContact}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Next follow-up</dt>
          <dd className="font-medium text-navy-900">{record.nextFollowUp}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Assigned collector</dt>
          <dd className="font-medium text-navy-900">
            {record.assignedCollector}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Office</dt>
          <dd className="font-medium text-navy-900">{record.office}</dd>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <dt className="mb-1 text-muted">Payment history</dt>
          <dd className="text-navy-900">{record.detail.paymentHistory}</dd>
        </div>
        <div>
          <dt className="mb-1 text-muted">Collection notes</dt>
          <dd className="text-navy-900">{record.detail.collectionNotes}</dd>
        </div>
        <div>
          <dt className="mb-1 text-muted">Last action</dt>
          <dd className="text-navy-900">{record.detail.lastAction}</dd>
        </div>
      </dl>

      {message && (
        <p className="mt-4 text-sm text-navy-900" role="status">{message}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {canEscalate && (
          <Button size="sm" disabled={busy} onClick={() => void handleEscalate()}>
            Escalate stage
          </Button>
        )}
        {canApproveExternal && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleApproveExternal()}
          >
            Approve external collections
          </Button>
        )}
      </div>
    </Drawer>
  );
}

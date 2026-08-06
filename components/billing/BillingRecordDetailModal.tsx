"use client";

import type { BillingQueueRecord } from "@/lib/mock-data/billing-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface BillingRecordDetailModalProps {
  record: BillingQueueRecord | null;
  onClose: () => void;
}

export function BillingRecordDetailModal({
  record,
  onClose,
}: BillingRecordDetailModalProps) {
  if (!record) return null;

  return (
    <Modal
      isOpen={Boolean(record)}
      onClose={onClose}
      title={record.matter}
      description={`${record.client} — Matter ${record.detail.matterNumber}`}
      className="max-w-xl"
    >
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Responsible attorney</dt>
          <dd className="font-medium text-navy-900">{record.attorney}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Billing cycle</dt>
          <dd className="font-medium text-navy-900">{record.billingCycle}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Status</dt>
          <dd>
            <StatusBadge
              status={record.status.toLowerCase().replace(/\s+/g, "_")}
            />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Unbilled WIP</dt>
          <dd className="font-medium text-navy-900">
            {formatCurrency(record.unbilledWip)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Draft amount</dt>
          <dd className="font-medium text-navy-900">
            {record.draftAmount > 0
              ? formatCurrency(record.draftAmount)
              : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Days waiting</dt>
          <dd className="font-medium text-navy-900">{record.daysWaiting}</dd>
        </div>
        <div>
          <dt className="text-muted">Notes</dt>
          <dd className="mt-1 text-navy-900">{record.detail.notes}</dd>
        </div>
        <div>
          <dt className="text-muted">Last action</dt>
          <dd className="mt-1 text-navy-900">{record.detail.lastAction}</dd>
        </div>
      </dl>
    </Modal>
  );
}

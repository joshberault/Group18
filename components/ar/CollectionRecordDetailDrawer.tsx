"use client";

import type { ArCollectionsRecord } from "@/lib/mock-data/ar-oversight";
import { formatCurrency } from "@/lib/utils/cn";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface CollectionRecordDetailDrawerProps {
  record: ArCollectionsRecord | null;
  onClose: () => void;
}

function statusToBadgeKey(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function CollectionRecordDetailDrawer({
  record,
  onClose,
}: CollectionRecordDetailDrawerProps) {
  if (!record) return null;

  return (
    <Drawer
      isOpen={Boolean(record)}
      onClose={onClose}
      title={record.invoiceNumber}
      description={`${record.client} — ${record.matter}`}
    >
      <dl className="space-y-3 text-sm">
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
    </Drawer>
  );
}

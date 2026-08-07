"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { useDemoTimeWorkflow } from "@/hooks/useDemoTimeWorkflow";
import { DEMO_IDENTITIES } from "@/lib/roles/role-config";
import {
  isDemoSessionApproval,
  resolveDemoTimeApproval,
} from "@/lib/demo/time-workflow-store";
import { syncTimeApprovalToSupabase } from "@/lib/time/time-entry-supabase";
import type { AdminApproval } from "@/lib/admin/types";

type Props = {
  title?: string;
  description?: string;
  adminLink?: boolean;
  limit?: number;
};

export function PendingTimeApprovalsPanel({
  title = "Pending Time Approvals",
  description = "Review billable hours submitted for manager approval.",
  adminLink = false,
  limit = 5,
}: Props) {
  const { mergedApprovals, refresh } = useDemoTimeWorkflow();
  const [selected, setSelected] = useState<AdminApproval | null>(null);
  const [modalMode, setModalMode] = useState<"approve" | "reject" | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      mergedApprovals
        .filter((row) => row.type === "time_entry" && row.status === "pending")
        .slice(0, limit),
    [mergedApprovals, limit],
  );

  function openModal(approval: AdminApproval, mode: "approve" | "reject") {
    setSelected(approval);
    setModalMode(mode);
    setNotes("");
    setError(null);
  }

  function closeModal() {
    setSelected(null);
    setModalMode(null);
    setNotes("");
    setError(null);
  }

  async function confirmAction() {
    if (!selected || !modalMode) return;

    if (modalMode === "reject" && !notes.trim()) {
      setError("A rejection reason is required.");
      return;
    }

    if (isDemoSessionApproval(selected.id)) {
      resolveDemoTimeApproval(
        selected.id,
        modalMode === "approve" ? "approved" : "rejected",
        DEMO_IDENTITIES.managing_partner.fullName,
        notes.trim() || undefined,
      );

      const syncResult = await syncTimeApprovalToSupabase(
        {
          id: selected.id,
          matterId: selected.matterId,
          employeeId: selected.employeeId,
          originalSnapshot: selected.originalSnapshot,
          timeEntryDate: selected.timeEntryDate,
          timeEntryHours: selected.timeEntryHours,
          timeEntryDescription: selected.timeEntryDescription,
          timeEntryBillable: selected.timeEntryBillable,
        },
        modalMode === "approve" ? "approved" : "rejected",
      );
      if (!syncResult.ok && syncResult.error) {
        setError(
          `Approval saved locally but could not update the time entry record: ${syncResult.error}`,
        );
        return;
      }

      refresh();
      setSuccess(
        modalMode === "approve"
          ? "Time entry approved. It is now available for invoicing."
          : "Time entry rejected.",
      );
      closeModal();
      return;
    }

    setError(
      "This seeded approval is read-only. Approve submissions created from Time & Expenses.",
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {adminLink && (
          <Link href="/dashboard/approvals">
            <Button variant="secondary" size="sm">
              Open full queue
            </Button>
          </Link>
        )}
      </CardHeader>

      {success && (
        <p className="mx-6 mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      {pending.length === 0 ? (
        <EmptyState
          title="No pending time entries"
          description="Submit time as Paralegal or Attorney, then return here to approve."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitted</TableHead>
              <TableHead>Requested by</TableHead>
              <TableHead>Matter</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((approval) => (
              <TableRow key={approval.id}>
                <TableCell>
                  {new Date(approval.submittedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{approval.submittedBy}</TableCell>
                <TableCell>{approval.matterLabel}</TableCell>
                <TableCell>{approval.amountOrHours}</TableCell>
                <TableCell>
                  <Badge variant={approval.priority === "urgent" ? "danger" : "gold"}>
                    {approval.status}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2">
                  <Button
                    size="sm"
                    onClick={() => openModal(approval, "approve")}
                    disabled={!isDemoSessionApproval(approval.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openModal(approval, "reject")}
                    disabled={!isDemoSessionApproval(approval.id)}
                  >
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal
        isOpen={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "approve" ? "Approve time entry" : "Reject time entry"}
      >
        <div className="space-y-4">
          {selected && (
            <p className="text-sm text-muted">
              {selected.submittedBy} — {selected.matterLabel} — {selected.amountOrHours}
            </p>
          )}
          <Textarea
            label={modalMode === "reject" ? "Rejection reason" : "Review notes (optional)"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required={modalMode === "reject"}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={confirmAction}>
              {modalMode === "approve" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import {
  decideWriteOff,
  fetchReceivablesWorkspace,
} from "@/lib/accounting";
import type {
  ArWriteOffRequest,
  WriteOffApprovalStatus,
} from "@/lib/mock-data/ar-oversight";

export interface WriteOffToast {
  message: string;
  variant: "success" | "error";
}

interface PendingApprove {
  type: "approve";
  requestId: string;
}

interface PendingReject {
  type: "reject";
  requestId: string;
}

export type PendingWriteOffAction = PendingApprove | PendingReject;

export function useWriteOffRequests() {
  const { selectedRole } = useDemoRole();
  const [requests, setRequests] = useState<ArWriteOffRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [pendingAction, setPendingAction] =
    useState<PendingWriteOffAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [toast, setToast] = useState<WriteOffToast | null>(null);

  const refresh = useCallback(async () => {
    const result = await fetchReceivablesWorkspace();
    setRequests(result.data.writeOffRequests);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null;

  const isActionable = (status: WriteOffApprovalStatus) =>
    status === "Pending" || status === "Under Review";

  const openReview = useCallback((requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectReason("");
    setRejectError("");
  }, []);

  const closeReview = useCallback(() => {
    setSelectedRequestId(null);
    setRejectReason("");
    setRejectError("");
  }, []);

  const requestApprove = useCallback((requestId: string) => {
    setPendingAction({ type: "approve", requestId });
  }, []);

  const requestReject = useCallback((requestId: string) => {
    setRejectReason("");
    setRejectError("");
    setPendingAction({ type: "reject", requestId });
  }, []);

  const cancelPendingAction = useCallback(() => {
    setPendingAction(null);
    setRejectReason("");
    setRejectError("");
  }, []);

  const confirmApprove = useCallback(() => {
    if (!pendingAction || pendingAction.type !== "approve") return;

    void (async () => {
      const result = await decideWriteOff({
        requestId: pendingAction.requestId,
        approve: true,
        reviewer: { name: "Alex Morgan", role: selectedRole },
      });
      if (result.ok) {
        setToast({
          message: "Write-off request approved.",
          variant: "success",
        });
        await refresh();
      } else {
        setToast({
          message: result.error ?? "Failed to approve write-off.",
          variant: "error",
        });
      }
      setPendingAction(null);
      setSelectedRequestId(null);
    })();
  }, [pendingAction, refresh, selectedRole]);

  const confirmReject = useCallback(() => {
    if (!pendingAction || pendingAction.type !== "reject") return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectError("A rejection reason is required.");
      return;
    }

    void (async () => {
      const result = await decideWriteOff({
        requestId: pendingAction.requestId,
        approve: false,
        reviewer: { name: "Alex Morgan", role: selectedRole },
        rejectionReason: trimmedReason,
      });
      if (result.ok) {
        setToast({
          message: "Write-off request rejected.",
          variant: "success",
        });
        await refresh();
      } else {
        setToast({
          message: result.error ?? "Failed to reject write-off.",
          variant: "error",
        });
      }
      setPendingAction(null);
      setRejectReason("");
      setRejectError("");
      setSelectedRequestId(null);
    })();
  }, [pendingAction, rejectReason, refresh, selectedRole]);

  return {
    requests,
    selectedRequest,
    selectedRequestId,
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
  };
}

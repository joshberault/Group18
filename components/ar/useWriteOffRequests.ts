"use client";

import { useCallback, useState } from "react";
import {
  arWriteOffRequests,
  type ArWriteOffRequest,
  type WriteOffApprovalStatus,
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
  const [requests, setRequests] = useState<ArWriteOffRequest[]>(() =>
    arWriteOffRequests.map((request) => ({ ...request })),
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [pendingAction, setPendingAction] =
    useState<PendingWriteOffAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [toast, setToast] = useState<WriteOffToast | null>(null);

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null;

  const updateRequest = useCallback(
    (
      requestId: string,
      updates: Partial<ArWriteOffRequest>,
    ) => {
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? { ...request, ...updates } : request,
        ),
      );
    },
    [],
  );

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

    updateRequest(pendingAction.requestId, {
      approvalStatus: "Approved",
    });
    setToast({
      message: "Write-off request approved.",
      variant: "success",
    });
    setPendingAction(null);
    setSelectedRequestId(null);
  }, [pendingAction, updateRequest]);

  const confirmReject = useCallback(() => {
    if (!pendingAction || pendingAction.type !== "reject") return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectError("A rejection reason is required.");
      return;
    }

    updateRequest(pendingAction.requestId, {
      approvalStatus: "Rejected",
      rejectionReason: trimmedReason,
    });
    setToast({
      message: "Write-off request rejected.",
      variant: "success",
    });
    setPendingAction(null);
    setRejectReason("");
    setRejectError("");
    setSelectedRequestId(null);
  }, [pendingAction, rejectReason, updateRequest]);

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

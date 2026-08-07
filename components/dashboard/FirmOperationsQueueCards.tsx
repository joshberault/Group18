"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, UserPlus } from "lucide-react";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import { IntakeQueueView } from "@/components/intake/IntakeQueueView";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { KPICard } from "@/components/ui/KPICard";
import { getMergedApprovals } from "@/lib/demo/time-workflow-store";
import {
  ACTIVE_INTAKE_STATUSES,
  CONSULTATION_REQUESTS_UPDATE_EVENT,
  getConsultationRequests,
} from "@/lib/demo/consultation-requests-store";
import { cn } from "@/lib/utils/cn";

type QueueModal = "approval" | "intake" | null;

interface FirmOperationsQueueCardsProps {
  className?: string;
}

function CompactQueueCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  onClick,
  id,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof ClipboardCheck;
  badge?: { label: string; variant: "success" | "warning" | "danger" | "info" };
  onClick: () => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={cn(
        "block h-full w-full rounded-xl text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900 focus-visible:ring-offset-2",
      )}
      aria-label={`${title}: ${value}. Open full queue`}
    >
      <KPICard
        title={title}
        value={value}
        subtitle={subtitle}
        icon={icon}
        badge={badge}
        className="h-full min-h-[8.5rem] cursor-pointer transition-shadow hover:shadow-lg"
      />
    </button>
  );
}

/** Compact approval + intake cards that expand into full-screen modals. */
export function FirmOperationsQueueCards({
  className,
}: FirmOperationsQueueCardsProps) {
  const { data } = useAdminData();
  const [openModal, setOpenModal] = useState<QueueModal>(null);
  const [intakeActiveCount, setIntakeActiveCount] = useState(0);
  const [intakeNewCount, setIntakeNewCount] = useState(0);

  const approvalStats = useMemo(() => {
    const sessionApprovals = getMergedApprovals();
    const merged = [
      ...(data?.approvals ?? []),
      ...sessionApprovals.filter(
        (row) => !data?.approvals.some((existing) => existing.id === row.id),
      ),
    ];
    const actionable = merged.filter(
      (row) => row.status === "pending" || row.status === "returned",
    );
    const urgent = actionable.filter((row) => row.priority === "urgent");
    return {
      pending: actionable.length,
      urgent: urgent.length,
    };
  }, [data?.approvals]);

  const refreshIntakeCounts = () => {
    const records = getConsultationRequests();
    const active = records.filter((item) =>
      ACTIVE_INTAKE_STATUSES.includes(item.status),
    );
    setIntakeActiveCount(active.length);
    setIntakeNewCount(
      records.filter((item) => item.status === "submitted").length,
    );
  };

  useEffect(() => {
    refreshIntakeCounts();
    const onUpdate = () => refreshIntakeCounts();
    window.addEventListener(CONSULTATION_REQUESTS_UPDATE_EVENT, onUpdate);
    return () =>
      window.removeEventListener(CONSULTATION_REQUESTS_UPDATE_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "approval-queue") {
      setOpenModal("approval");
    } else if (hash === "intake-queue") {
      setOpenModal("intake");
    }
  }, []);

  const closeModal = () => {
    setOpenModal(null);
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };

  const openQueue = (modal: Exclude<QueueModal, null>) => {
    setOpenModal(modal);
    const hash = modal === "approval" ? "approval-queue" : "intake-queue";
    window.history.replaceState(null, "", `#${hash}`);
  };

  return (
    <>
      <div className={cn("contents", className)}>
        <CompactQueueCard
          id="approval-queue"
          title="Approval Queue"
          value={String(approvalStats.pending)}
          subtitle={
            approvalStats.urgent > 0
              ? `${approvalStats.urgent} urgent pending`
              : "Pending reviews"
          }
          icon={ClipboardCheck}
          badge={
            approvalStats.urgent > 0
              ? { label: "Urgent", variant: "danger" }
              : approvalStats.pending > 0
                ? { label: "Open", variant: "warning" }
                : undefined
          }
          onClick={() => openQueue("approval")}
        />
        <CompactQueueCard
          id="intake-queue"
          title="Prospective Clients"
          value={String(intakeActiveCount)}
          subtitle={
            intakeNewCount > 0
              ? `${intakeNewCount} new submission${intakeNewCount === 1 ? "" : "s"}`
              : "Active intake requests"
          }
          icon={UserPlus}
          badge={
            intakeNewCount > 0
              ? { label: "New", variant: "info" }
              : intakeActiveCount > 0
                ? { label: "Active", variant: "warning" }
                : undefined
          }
          onClick={() => openQueue("intake")}
        />
      </div>

      <FullScreenModal
        isOpen={openModal === "approval"}
        onClose={closeModal}
        title="Approval Queue"
        description="Time, expense, vacation, and matter approvals — urgent first, oldest within priority."
      >
        <ApprovalQueue variant="embedded" />
      </FullScreenModal>

      <FullScreenModal
        isOpen={openModal === "intake"}
        onClose={closeModal}
        title="Prospective Clients"
        description="Consultation requests — screen, schedule, convert, or close without engagement."
      >
        <IntakeQueueView variant="embedded" />
      </FullScreenModal>
    </>
  );
}

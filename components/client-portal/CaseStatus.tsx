"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  GitBranch,
  LockKeyhole,
  LoaderCircle,
  Users,
} from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CASE_TYPE_LABELS } from "@/lib/client-portal/case-task-lists";
import type { TaskOwner } from "@/lib/client-portal/case-task-lists";
import {
  areAllClientInvoicesPaid,
  getPortalBillingModel,
} from "@/lib/client-portal/billing-models";
import { INVOICE_CHARGES_UPDATE_EVENT } from "@/lib/client-portal/invoice-charge-store";
import {
  addCaseStatusUpdateNotification,
  CASE_TASK_PROGRESS_EVENT,
  getCaseTaskProgress,
  markCaseTaskComplete,
} from "@/lib/client-portal/notifications-store";
import { getTasksForEngagedCase } from "@/lib/mock-data/client-portal";
import { USER_ROLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

function ownerLabel(owner: TaskOwner) {
  if (owner === "client") return "Client";
  if (owner === "legal_team") return "Legal team";
  return "Client & legal team";
}

function ownerBadgeVariant(owner: TaskOwner) {
  if (owner === "client") return "gold" as const;
  if (owner === "legal_team") return "default" as const;
  return "neutral" as const;
}

function TaskStatusIcon({
  status,
}: {
  status: "completed" | "in_progress" | "pending";
}) {
  if (status === "completed") {
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  }
  if (status === "in_progress") {
    return <LoaderCircle className="h-5 w-5 text-gold-500" />;
  }
  return <Circle className="h-5 w-5 text-gray-300" />;
}

export function CaseStatus() {
  const { role } = useDemoRole();
  const { selectedCases, isAllCases } = useCaseSelection();
  const roleCanCheckOffTasks = role === "attorney" || role === "paralegal";

  const [selectedCaseId, setSelectedCaseId] = useState(
    selectedCases[0]?.id ?? "",
  );
  const [completedOverrides, setCompletedOverrides] = useState<
    Record<string, string[]>
  >({});
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [allInvoicesPaid, setAllInvoicesPaid] = useState(false);

  useEffect(() => {
    if (selectedCases.length === 0) {
      setSelectedCaseId("");
      return;
    }
    if (!selectedCases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(selectedCases[0].id);
    }
  }, [selectedCases, selectedCaseId]);

  const refreshProgress = useCallback(() => {
    setCompletedOverrides(getCaseTaskProgress());
  }, []);

  useEffect(() => {
    refreshProgress();
    window.addEventListener(CASE_TASK_PROGRESS_EVENT, refreshProgress);
    return () =>
      window.removeEventListener(CASE_TASK_PROGRESS_EVENT, refreshProgress);
  }, [refreshProgress]);

  useEffect(() => {
    const refreshInvoiceStatus = () =>
      setAllInvoicesPaid(areAllClientInvoicesPaid());
    refreshInvoiceStatus();
    window.addEventListener(
      INVOICE_CHARGES_UPDATE_EVENT,
      refreshInvoiceStatus,
    );
    return () =>
      window.removeEventListener(
        INVOICE_CHARGES_UPDATE_EVENT,
        refreshInvoiceStatus,
      );
  }, []);

  const selectedCase =
    selectedCases.find((item) => item.id === selectedCaseId) ??
    selectedCases[0];
  const progressLocked =
    selectedCase !== undefined &&
    getPortalBillingModel(selectedCase.caseType) === "retainer" &&
    !allInvoicesPaid;
  const canCheckOffTasks = roleCanCheckOffTasks && !progressLocked;

  const tasks = useMemo(() => {
    if (!selectedCase) return [];

    const baseTasks = getTasksForEngagedCase(selectedCase);
    const markedComplete = new Set(completedOverrides[selectedCase.id] ?? []);

    const tasksWithOverrides = baseTasks.map((task) =>
      markedComplete.has(task.id)
        ? { ...task, status: "completed" as const }
        : task,
    );

    return progressLocked
      ? tasksWithOverrides.map((task) => ({
          ...task,
          status: "pending" as const,
        }))
      : tasksWithOverrides;
  }, [selectedCase, completedOverrides, progressLocked]);

  const completedCount = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const progressPercent =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  function handleCheckOff(taskId: string, taskTitle: string) {
    if (!selectedCase || !canCheckOffTasks || progressLocked) return;

    const alreadyComplete = (completedOverrides[selectedCase.id] ?? []).includes(
      taskId,
    );
    if (alreadyComplete) return;

    markCaseTaskComplete(selectedCase.id, taskId);
    addCaseStatusUpdateNotification({
      caseNumber: selectedCase.caseNumber,
      caseTitle: selectedCase.title,
      taskTitle,
      completedBy: USER_ROLE_LABELS[role],
    });
    setCheckMessage(
      `Marked “${taskTitle}” complete. A case status update notification was sent to the client.`,
    );
    refreshProgress();
  }

  if (!selectedCase) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case Status</CardTitle>
          <CardDescription>
            No active matters are linked to this client account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white">
        <div className="flex flex-col gap-4 p-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gold-500">Case progress</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              Task list by case type
            </p>
            <p className="mt-2 max-w-2xl text-sm text-gray-200">
              Major client and legal-team tasks for each matter you are engaged
              in, based on that case type.
              {roleCanCheckOffTasks
                ? " Check off completed tasks to notify the client."
                : ""}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-gold-500">
            <GitBranch className="h-6 w-6" />
          </div>
        </div>
      </Card>

      {isAllCases && selectedCases.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {selectedCases.map((engagedCase) => {
            const selected = engagedCase.id === selectedCase.id;
            return (
              <button
                key={engagedCase.id}
                type="button"
                onClick={() => setSelectedCaseId(engagedCase.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-gray-200 bg-white text-navy-900 hover:border-navy-700/40",
                )}
              >
                {CASE_TYPE_LABELS[engagedCase.caseType]}
              </button>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{selectedCase.title}</CardTitle>
              <CardDescription>
                {selectedCase.title} ·{" "}
                {CASE_TYPE_LABELS[selectedCase.caseType]} · Opened{" "}
                {selectedCase.openDate}
              </CardDescription>
            </div>
            <StatusBadge status={selectedCase.status} />
          </div>
        </CardHeader>

        <p className="mb-5 text-sm text-navy-900">{selectedCase.description}</p>

        {checkMessage && (
          <p className="mb-4 rounded-lg bg-gold-100 px-3 py-2 text-sm text-navy-900">
            {checkMessage}
          </p>
        )}

        {progressLocked && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Task progress is locked pending retainer payment
              </p>
              <p className="mt-1 text-sm text-amber-900">
                This is a retainer-based matter. Progress must remain at 0%
                until Account Summary shows every invoice as paid.
              </p>
              <Link
                href="/client-portal/account-summary"
                className="mt-2 inline-flex text-sm font-semibold text-amber-950 underline underline-offset-2"
              >
                Review Account Summary
              </Link>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-navy-900">
              {completedCount} of {tasks.length} major tasks completed
            </span>
            <span className="text-muted">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-navy-900 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-xs text-muted">
          <Users className="h-3.5 w-3.5" />
          {progressLocked
            ? "Task completion is unavailable until all invoices are paid."
            : canCheckOffTasks
            ? "As attorney/paralegal, check off a task to send the client a case status update notification."
            : "Tasks show who is responsible: client, legal team, or both."}
        </div>

        <ol className="space-y-3">
          {tasks.map((task, index) => {
            const isComplete = task.status === "completed";

            return (
              <li
                key={task.id}
                className={cn(
                  "rounded-xl border px-4 py-4",
                  isComplete && "border-green-200 bg-green-50/40",
                  task.status === "in_progress" &&
                    "border-gold-500/40 bg-gold-100/30",
                  task.status === "pending" && "border-gray-200 bg-white",
                )}
              >
                <div className="flex items-start gap-3">
                  {canCheckOffTasks ? (
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-navy-900"
                      checked={isComplete}
                      disabled={isComplete}
                      onChange={() => handleCheckOff(task.id, task.title)}
                      aria-label={`Mark ${task.title} complete`}
                    />
                  ) : (
                    <div className="mt-0.5 shrink-0">
                      <TaskStatusIcon status={task.status} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-navy-900">
                        {index + 1}. {task.title}
                      </p>
                      <StatusBadge status={task.status} />
                      <Badge variant={ownerBadgeVariant(task.owner)}>
                        {ownerLabel(task.owner)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-navy-900">
                      {task.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

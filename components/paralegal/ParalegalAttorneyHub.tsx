"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Briefcase, Clock, ListTodo, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useParalegalWorkflow } from "@/hooks/useParalegalWorkflow";
import {
  DEMO_PARALEGAL,
  PARALEGAL_ASSIGNED_MATTERS,
} from "@/lib/paralegal/demo-data";
import type { ReviewItemType } from "@/lib/paralegal/demo-data";
import { REVIEW_STATUS_LABELS } from "@/lib/paralegal/metrics";
import {
  createReviewRequest,
  resubmitReview,
} from "@/lib/paralegal/workflow-store";
import {
  getParalegalHubMatters,
  getParalegalHubTasks,
  getParalegalHubTimeEntries,
} from "@/lib/paralegal/attorney-hub-adapter";

export function ParalegalAttorneyHub() {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const { reviews, refresh } = useParalegalWorkflow();
  const [toast, setToast] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<ReviewItemType>("task");
  const [matterId, setMatterId] = useState(
    PARALEGAL_ASSIGNED_MATTERS[0]?.id ?? "",
  );
  const [details, setDetails] = useState("");
  const [urgent, setUrgent] = useState(false);

  const matters = getParalegalHubMatters();
  const tasks = getParalegalHubTasks().filter((t) => t.status !== "completed");
  const pendingTime = getParalegalHubTimeEntries().filter(
    (e) => e.status === "pending",
  ).length;
  const openReviews = useMemo(
    () => reviews.filter((r) => r.status !== "approved"),
    [reviews],
  );

  useEffect(() => {
    if (focus === "reviews" || focus === "issue") {
      document.getElementById("paralegal-review-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      if (focus === "issue") {
        setItemType("issue");
        setUrgent(true);
        setTitle((prev) => prev || "Issue requiring legal judgment");
      }
    }
  }, [focus]);

  function submitAction(
    preset?:
      | "review"
      | "legal"
      | "deadline"
      | "clarification",
  ) {
    const matter =
      PARALEGAL_ASSIGNED_MATTERS.find((m) => m.id === matterId) ??
      PARALEGAL_ASSIGNED_MATTERS[0];
    if (!matter) return;

    let nextTitle = title.trim();
    let nextType: ReviewItemType = itemType;
    let nextUrgent = urgent;

    if (preset === "legal") {
      nextType = "issue";
      nextUrgent = true;
      nextTitle = nextTitle || "Needs legal decision";
    } else if (preset === "deadline") {
      nextType = "deadline";
      nextUrgent = true;
      nextTitle = nextTitle || "Urgent deadline alert";
    } else if (preset === "clarification") {
      nextType = "issue";
      nextTitle = nextTitle || "Request clarification";
    } else {
      nextTitle = nextTitle || "Request attorney review";
    }

    if (details.trim().length < 8) {
      setToast("Add a short description of what needs attorney attention.");
      return;
    }

    createReviewRequest({
      title: `${nextTitle} — ${details.trim().slice(0, 80)}`,
      itemType: nextType,
      clientName: matter.clientName,
      matterTitle: matter.title,
      attorneyName: matter.attorneyName,
      urgent: nextUrgent,
      status: "submitted",
    });
    refresh();
    setTitle("");
    setDetails("");
    setUrgent(false);
    setToast(
      "Structured review request submitted. This is not general chat and does not replace attorney approval.",
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attorney Hub"
        description={`${DEMO_PARALEGAL.fullName} — structured attorney review and assigned-matter support (not general messaging).`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/attorney/matters" className="block">
          <KPICard
            title="Assigned matters"
            value={String(matters.length)}
            icon={Briefcase}
          />
        </Link>
        <Link href="/attorney/time?filter=drafts" className="block">
          <KPICard
            title="Time needing attention"
            value={String(pendingTime)}
            icon={Clock}
          />
        </Link>
        <Link href="/attorney/tasks" className="block">
          <KPICard
            title="Open tasks"
            value={String(tasks.length)}
            icon={ListTodo}
          />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review requests</CardTitle>
          <CardDescription>
            Statuses: Draft, Submitted, Under Review, Returned for Revision,
            Approved. Requests must stay tied to a client/matter/work item.
          </CardDescription>
        </CardHeader>
        <ul className="space-y-3">
          {openReviews.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-navy-900">{r.title}</p>
                <p className="text-sm text-muted">
                  {r.clientName} · {r.matterTitle} · {r.attorneyName} ·{" "}
                  {r.itemType.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted">Submitted {r.submittedAt}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    r.status === "returned_for_revision" ? "danger" : "neutral"
                  }
                >
                  {REVIEW_STATUS_LABELS[r.status]}
                </Badge>
                {r.relatedTaskId ? (
                  <Link href={`/attorney/tasks?task=${r.relatedTaskId}`}>
                    <Button size="sm" variant="secondary">
                      <Send className="h-3.5 w-3.5" />
                      Open related work
                    </Button>
                  </Link>
                ) : (
                  <Link href="/attorney/tasks">
                    <Button size="sm" variant="secondary">
                      Open tasks
                    </Button>
                  </Link>
                )}
                {r.status === "returned_for_revision" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      resubmitReview(r.id);
                      refresh();
                      setToast("Revision resubmitted for attorney review.");
                    }}
                  >
                    Resubmit revision
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="md">
        <div id="paralegal-review-form">
          <CardTitle className="mb-2">Create structured review request</CardTitle>
          <p className="mb-4 text-sm text-muted">
            Use these actions instead of informal messaging. Conflicts cannot be
            cleared here.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Related matter"
              value={matterId}
              onChange={(e) => setMatterId(e.target.value)}
              options={PARALEGAL_ASSIGNED_MATTERS.map((m) => ({
                value: m.id,
                label: m.title,
              }))}
            />
            <Select
              label="Item type"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ReviewItemType)}
              options={[
                { value: "task", label: "Task" },
                { value: "document", label: "Document" },
                { value: "deadline", label: "Deadline" },
                { value: "time_entry", label: "Time entry" },
                { value: "expense", label: "Expense" },
                { value: "issue", label: "Issue / legal decision" },
              ]}
            />
            <Input
              label="Request title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="md:col-span-2"
            />
            <Textarea
              label="What needs attorney attention?"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="md:col-span-2"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-navy-900 md:col-span-2">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="rounded border-gray-300"
              />
              Mark urgent
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => submitAction("review")}>
              Request Attorney Review
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => submitAction("legal")}
            >
              Needs Legal Decision
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => submitAction("deadline")}
            >
              Urgent Deadline Alert
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => submitAction("clarification")}
            >
              Request Clarification
            </Button>
          </div>
        </div>
      </Card>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { Briefcase, Clock, ListTodo, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEMO_PARALEGAL, PARALEGAL_REVIEW_QUEUE } from "@/lib/paralegal/demo-data";
import { REVIEW_STATUS_LABELS } from "@/lib/paralegal/metrics";
import {
  getParalegalHubMatters,
  getParalegalHubTasks,
  getParalegalHubTimeEntries,
} from "@/lib/paralegal/attorney-hub-adapter";

export function ParalegalAttorneyHub() {
  const matters = getParalegalHubMatters();
  const tasks = getParalegalHubTasks().filter((t) => t.status !== "completed");
  const pendingTime = getParalegalHubTimeEntries().filter((e) => e.status === "pending").length;
  const reviews = PARALEGAL_REVIEW_QUEUE.filter((r) => r.status !== "approved");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attorney Hub"
        description={`${DEMO_PARALEGAL.fullName} — structured attorney review and assigned-matter support (not general messaging).`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/attorney/matters" className="block">
          <KPICard title="Assigned matters" value={String(matters.length)} icon={Briefcase} />
        </Link>
        <Link href="/attorney/time" className="block">
          <KPICard title="Time needing attention" value={String(pendingTime)} icon={Clock} />
        </Link>
        <Link href="/attorney/tasks" className="block">
          <KPICard title="Open tasks" value={String(tasks.length)} icon={ListTodo} />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review requests</CardTitle>
          <CardDescription>
            Statuses: Draft, Submitted, Under Review, Returned for Revision, Approved.
          </CardDescription>
        </CardHeader>
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-navy-900">{r.title}</p>
                <p className="text-sm text-muted">
                  {r.clientName} · {r.matterTitle} · {r.attorneyName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    r.status === "returned_for_revision" ? "danger" : "neutral"
                  }
                >
                  {REVIEW_STATUS_LABELS[r.status]}
                </Badge>
                <Link href="/attorney/tasks">
                  <Button size="sm" variant="secondary">
                    <Send className="h-3.5 w-3.5" />
                    Open related work
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm">Request Attorney Review</Button>
          <Button size="sm" variant="secondary">
            Needs Legal Decision
          </Button>
          <Button size="sm" variant="secondary">
            Urgent Deadline Alert
          </Button>
          <Button size="sm" variant="ghost">
            Request Clarification
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Demo actions log intent for class walkthroughs; they do not bypass attorney approval or clear conflicts.
        </p>
      </Card>
    </div>
  );
}

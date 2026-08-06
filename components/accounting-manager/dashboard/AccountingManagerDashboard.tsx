"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  AM_APPROVAL_SUMMARIES,
  AM_CASH_METRICS,
  AM_CONTROL_STATUSES,
  AM_HOT_ITEMS,
  AM_RECENT_ACTIVITY,
  AM_WORK_QUEUE,
  sortHotItems,
  type Urgency,
  type WorkQueueItem,
} from "@/lib/accounting-manager/dashboard-data";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "counselflow-am-work-queue-v1";

function urgencyVariant(urgency: Urgency) {
  if (urgency === "critical") return "danger" as const;
  if (urgency === "high") return "warning" as const;
  return "default" as const;
}

function statusColor(status: string) {
  if (status === "Overdue") return "text-red-700 bg-red-50";
  if (status === "At Risk") return "text-amber-800 bg-amber-50";
  if (status === "In Progress") return "text-blue-800 bg-blue-50";
  return "text-green-800 bg-green-50";
}

function loadCompletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveCompletedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function AccountingManagerDashboard() {
  const router = useRouter();
  const hotItems = useMemo(() => sortHotItems(AM_HOT_ITEMS), []);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => loadCompletedIds());
  const [deferItem, setDeferItem] = useState<WorkQueueItem | null>(null);
  const [deferReason, setDeferReason] = useState("");
  const [deferDate, setDeferDate] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const activeQueue = AM_WORK_QUEUE.filter((item) => !completedIds.has(item.id));

  function markComplete(id: string) {
    const next = new Set(completedIds);
    next.add(id);
    setCompletedIds(next);
    saveCompletedIds(next);
    setToast("Task marked complete for this session.");
    setTimeout(() => setToast(null), 3000);
  }

  function submitDefer() {
    if (!deferItem) return;
    if (!deferReason.trim()) {
      setToast("A deferral reason is required.");
      return;
    }
    markComplete(deferItem.id);
    setDeferItem(null);
    setDeferReason("");
    setDeferDate("");
    setToast(`Deferred "${deferItem.task}" to ${deferDate || "a later date"}.`);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting Manager Dashboard"
        description="Review urgent financial items, approvals, reconciliations, close activity, billing issues, and cash exceptions across the firm."
      />

      {toast ? (
        <div className="rounded-lg border border-navy-200 bg-navy-50 px-4 py-2 text-sm text-navy-900">{toast}</div>
      ) : null}

      {/* Hot Items */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Hot Items</h2>
          <span className="text-sm text-muted">{hotItems.length} items requiring attention</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hotItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant={urgencyVariant(item.urgency)}>{item.urgency}</Badge>
                <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-2 font-semibold text-navy-900">{item.title}</p>
              <p className="mt-1 text-sm font-medium text-gold-700">{item.amountOrCount}</p>
              <p className="mt-2 text-xs text-muted">{item.module} · {item.dueOrAge}</p>
              {item.owner ? <p className="text-xs text-muted">Owner: {item.owner}</p> : null}
            </Link>
          ))}
        </div>
      </section>

      {/* Today's Work Queue */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Work Queue
            </CardTitle>
            <CardDescription>Priority tasks — complete, defer, or open the related record</CardDescription>
          </CardHeader>
          <div className="divide-y">
            {activeQueue.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">All queue items completed for this session.</p>
            ) : (
              activeQueue.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={urgencyVariant(item.priority)}>{item.priority}</Badge>
                      <span className="text-xs font-semibold uppercase text-muted">{item.action}</span>
                    </div>
                    <p className="mt-1 font-medium text-navy-900">{item.task}</p>
                    <p className="text-sm text-muted">
                      {item.module} · {item.record} · Due {item.dueDate} · {item.owner}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => router.push(item.href)}>Open</Button>
                    <Button size="sm" variant="secondary" onClick={() => markComplete(item.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Complete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeferItem(item)}>Defer</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Financial Control Status */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Control Status</CardTitle>
            <CardDescription>Click any status to open the detailed module</CardDescription>
          </CardHeader>
          <div className="space-y-2 px-4 pb-4">
            {AM_CONTROL_STATUSES.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-navy-900">{item.label}</p>
                  <p className="text-xs text-muted">{item.detail}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColor(item.status))}>
                  {item.status}
                </span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Counts and values awaiting your review</CardDescription>
          </CardHeader>
          <div className="grid gap-2 px-4 pb-4 sm:grid-cols-2">
            {AM_APPROVAL_SUMMARIES.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              >
                <p className="text-sm font-medium text-navy-900">{item.label}</p>
                <p className="text-lg font-semibold text-navy-900">{item.count}</p>
                <p className="text-xs text-muted">{item.value}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Cash and Exposure */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-navy-900">Cash &amp; Exposure</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {AM_CASH_METRICS.map((metric) => (
            <Link
              key={metric.id}
              href={metric.href}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <DollarSign className="mb-2 h-4 w-4 text-muted" />
              <p className="text-xs text-muted">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold text-navy-900">{metric.value}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Important Activity</CardTitle>
          <CardDescription>Financial-control events across the firm</CardDescription>
        </CardHeader>
        <div className="divide-y">
          {AM_RECENT_ACTIVITY.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-navy-900">{item.title}</p>
                <p className="text-sm text-muted">{item.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
        <div className="border-t px-4 py-3">
          <Link href="/accounting/audit-log" className="text-sm font-semibold text-navy-900 hover:underline">
            View full audit log →
          </Link>
        </div>
      </Card>

      <Modal
        isOpen={!!deferItem}
        onClose={() => setDeferItem(null)}
        title="Defer Task"
      >
        {deferItem ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">{deferItem.task}</p>
            <div>
              <label className="mb-1 block text-sm font-medium">New due date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={deferDate}
                onChange={(e) => setDeferDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Reason for deferral</label>
              <Textarea value={deferReason} onChange={(e) => setDeferReason(e.target.value)} rows={3} placeholder="Required" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeferItem(null)}>Cancel</Button>
              <Button onClick={submitDefer}>Defer Task</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

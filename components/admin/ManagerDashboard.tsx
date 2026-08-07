"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  Gauge,
  UserMinus,
} from "lucide-react";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import { FirmOperationsQueueCards } from "@/components/dashboard/FirmOperationsQueueCards";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  buildAttentionItems,
  getOverdueAssignments,
} from "@/lib/admin/calculations";
import type { AttentionPriority } from "@/lib/admin/types";

function priorityBadge(priority: AttentionPriority | "urgent" | "normal") {
  if (priority === "urgent") return <Badge variant="danger">Urgent</Badge>;
  if (priority === "high") return <Badge variant="warning">High</Badge>;
  return <Badge variant="neutral">Normal</Badge>;
}

/**
 * Manager Dashboard home — summary only.
 * Detailed work lives in sidebar sections under Manager Dashboard.
 */
export function ManagerDashboard() {
  const { data, loading, error, refresh } = useAdminData();

  const dataset = data;
  const summary = dataset?.summary;

  const overdueAssignments = useMemo(
    () =>
      dataset
        ? getOverdueAssignments(dataset.assignments, dataset.referenceDate).filter(
            (a) =>
              a.status === "active" ||
              a.status === "pending" ||
              a.status === "overdue",
          )
        : [],
    [dataset],
  );

  const attentionItems = useMemo(
    () =>
      dataset
        ? buildAttentionItems({
            employees: dataset.employees,
            assignments: dataset.assignments,
            approvals: dataset.approvals,
            unassignedMatters: dataset.unassignedMatters,
            vacations: dataset.vacations,
            referenceDate: dataset.referenceDate,
            limit: 8,
          })
        : [],
    [dataset],
  );

  if (loading) {
    return <LoadingState message="Loading Manager Dashboard..." />;
  }

  if (error || !dataset || !summary) {
    return (
      <Card className="border-red-200 bg-red-50" padding="lg">
        <CardHeader>
          <CardTitle className="text-red-800">Unable to load dashboard</CardTitle>
          <CardDescription className="text-red-700">
            {error || "The Manager Dashboard could not load firm data."}
          </CardDescription>
        </CardHeader>
        <Button variant="secondary" onClick={() => void refresh()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold-100 bg-gold-100/40 px-4 py-3 text-sm text-navy-800">
        <strong className="font-semibold text-navy-900">Live firm data:</strong>{" "}
        Summary signals from shared Supabase tables. Open a sidebar section under
        Manager Dashboard for detailed lists and actions. Reference date{" "}
        {dataset.referenceDate}.
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <Link href="/admin/workload" className="block h-full">
          <KPICard
            title="Over Capacity"
            value={String(summary.overloadedEmployees)}
            subtitle="Employees above 100% workload"
            icon={Gauge}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/workload" className="block h-full">
          <KPICard
            title="Employees on Leave"
            value={String(summary.employeesOnApprovedLeave)}
            subtitle="Currently on approved leave"
            icon={UserMinus}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/assignments" className="block h-full">
          <KPICard
            title="Assignments Due Soon"
            value={String(summary.assignmentsDueWithin7Days)}
            subtitle="Open assignments due within 7 days"
            icon={CalendarDays}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/assignments" className="block h-full">
          <KPICard
            title="Overdue Assignments"
            value={String(summary.overdueAssignments)}
            subtitle="Open assignments past due"
            icon={AlertTriangle}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <Link href="/admin/assignments" className="block h-full">
          <KPICard
            title="Unassigned Matters"
            value={String(summary.unassignedMatters)}
            subtitle="No lead attorney / responsible employee"
            icon={Briefcase}
            className="h-full transition hover:border-gold-500"
          />
        </Link>
        <FirmOperationsQueueCards />
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle>Items Requiring Attention</CardTitle>
          <CardDescription>
            Urgent first, then high priority, then oldest. Open a sidebar section
            for the full queue or board.
          </CardDescription>
        </CardHeader>
        {attentionItems.length === 0 ? (
          <EmptyState
            title="No attention items"
            description="No overloaded staff, overdue work, or coverage gaps in the current demo data."
            moduleLabel="Admin · Dashboard"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date / Age</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attentionItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{priorityBadge(item.priority)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-start gap-1.5">
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
                          aria-hidden
                        />
                        <span className="font-medium text-navy-900">
                          {item.issue}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.subjectHref ? (
                        <Link
                          href={item.subjectHref}
                          className="text-navy-900 underline-offset-2 hover:text-gold-500 hover:underline"
                        >
                          {item.subjectLabel}
                        </Link>
                      ) : (
                        item.subjectLabel
                      )}
                    </TableCell>
                    <TableCell>{item.dateOrAge}</TableCell>
                    <TableCell>
                      <Link href={item.actionHref}>
                        <Button size="sm" variant="secondary">
                          {item.actionLabel}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted">
        Overdue open assignments: {overdueAssignments.length}. Use Employee
        Profiles, Assignments, Approvals, and Workload in the sidebar for full
        detail.
      </p>
    </div>
  );
}

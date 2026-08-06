"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { isPastDate } from "@/lib/attorney/dates";
import { formatDate } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export function DeadlineDetailClient({ deadlineId }: { deadlineId: string }) {
  const router = useRouter();
  const { getDeadlineById, deleteDeadline } = useAttorneyData();
  const deadline = getDeadlineById(deadlineId);

  if (!deadline) {
    return (
      <EmptyState
        title="Deadline not found"
        description="This deadline may have been removed."
      />
    );
  }

  const pastDue = isPastDate(deadline.due_date);

  function handleDelete() {
    deleteDeadline(deadlineId);
    router.push("/attorney/tasks");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={deadline.title}
        description={deadline.matter?.title ?? "Deadline detail"}
      />

      <Card padding="md" className="space-y-4">
        {deadline.description && (
          <p className="text-sm text-muted">{deadline.description}</p>
        )}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Due date</dt>
            <dd>
              <Link
                href={`/attorney/calendar?date=${deadline.due_date}`}
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium transition hover:opacity-80 ${
                  pastDue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {formatDate(deadline.due_date)}
              </Link>
            </dd>
          </div>
          {deadline.matter_id && (
            <div>
              <dt className="text-muted">Matter</dt>
              <dd>
                <Link
                  href={`/attorney/matters/${deadline.matter_id}`}
                  className="font-medium text-navy-900 hover:underline"
                >
                  {deadline.matter?.title ?? "View matter"}
                </Link>
              </dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap gap-2">
          <Link href={`/attorney/calendar?date=${deadline.due_date}`}>
            <Button variant="secondary">View on calendar</Button>
          </Link>
          <Link href="/attorney/tasks">
            <Button variant="secondary">Back to tasks</Button>
          </Link>
          <Button variant="ghost" className="text-red-600" onClick={handleDelete}>
            Delete deadline
          </Button>
        </div>
      </Card>
    </div>
  );
}

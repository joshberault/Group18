"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { MatterCard } from "@/components/attorney/MatterCard";
import { MatterTimeline } from "@/components/attorney/MatterTimeline";
import { DocumentChecklist } from "@/components/attorney/DocumentChecklist";
import { getAttorneyReviewById } from "@/lib/attorney/dashboard-data";
import { REVIEW_STATUS_LABELS } from "@/lib/paralegal/metrics";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function MatterDetailClient({ matterId }: { matterId: string }) {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("review");
  const reviewItem = reviewId ? getAttorneyReviewById(reviewId) : undefined;
  const { getMatterById } = useAttorneyData();
  const matter = getMatterById(matterId);

  if (!matter) {
    return <EmptyState title="Matter not found" description="This matter is not in your demo assignments." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={matter.title} description="Matter timeline and document checklist." />

      {reviewItem && reviewItem.matterTitle === matter.title && (
        <Card padding="md" className="border-gold-500/30 bg-gold-50/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gold-700">Review inbox item</p>
              <h2 className="mt-1 text-lg font-semibold text-navy-900">{reviewItem.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {reviewItem.clientName} · Submitted {reviewItem.submittedAt}
              </p>
            </div>
            <Badge
              variant={
                reviewItem.status === "returned_for_revision"
                  ? "danger"
                  : reviewItem.urgent
                    ? "warning"
                    : "neutral"
              }
            >
              {REVIEW_STATUS_LABELS[reviewItem.status]}
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/attorney/tasks?tab=all&matter=${matterId}`}>
              <Button size="sm" variant="secondary">
                Open related work
              </Button>
            </Link>
            <Link href="/dashboard#review-inbox">
              <Button size="sm" variant="ghost">
                Back to review inbox
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <MatterCard matter={matter} />

      <DocumentChecklist matterId={matterId} />

      <Card padding="md">
        <h2 className="mb-4 text-lg font-semibold text-navy-900">Matter Timeline</h2>
        <MatterTimeline matterId={matterId} />
      </Card>

      <Link href="/attorney/matters">
        <Button variant="secondary">Back to matters</Button>
      </Link>
    </div>
  );
}

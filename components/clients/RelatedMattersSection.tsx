"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { RelatedMatterSummary } from "@/lib/clients/types";
import { formatDate } from "@/lib/clients/utils";

interface RelatedMattersSectionProps {
  matters: RelatedMatterSummary[];
  loadError?: string | null;
}

export function RelatedMattersSection({
  matters,
  loadError,
}: RelatedMattersSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Matters</CardTitle>
        <CardDescription>
          Read-only preview from the shared matters table. Matter editing belongs to the Matters module.
        </CardDescription>
      </CardHeader>

      {loadError ? (
        <EmptyState
          title="Matters unavailable"
          description="Related matters could not be loaded with the current database permissions. They will appear here once the Matters teammate exposes client-linked matter reads for staff."
        />
      ) : matters.length === 0 ? (
        <EmptyState
          title="No related matters yet"
          description="When matters are opened for this client in the Matters module, they will appear here automatically."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {matters.map((matter) => (
            <li key={matter.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-navy-900">{matter.title}</p>
                <p className="text-xs text-muted">
                  Opened {formatDate(matter.created_at)} · {matter.billing_type.replaceAll("_", " ")}
                </p>
              </div>
              <StatusBadge status={matter.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

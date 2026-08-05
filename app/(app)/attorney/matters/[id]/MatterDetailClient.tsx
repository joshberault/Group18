"use client";

import Link from "next/link";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { MatterCard } from "@/components/attorney/MatterCard";
import { MatterTimeline } from "@/components/attorney/MatterTimeline";
import { DocumentChecklist } from "@/components/attorney/DocumentChecklist";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function MatterDetailClient({ matterId }: { matterId: string }) {
  const { getMatterById } = useAttorneyData();
  const matter = getMatterById(matterId);

  if (!matter) {
    return <EmptyState title="Matter not found" description="This matter is not in your demo assignments." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={matter.title} description="Matter timeline and document checklist." />

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

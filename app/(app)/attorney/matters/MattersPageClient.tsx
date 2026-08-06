"use client";

import Link from "next/link";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { MatterCard } from "@/components/attorney/MatterCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function MattersPageClient() {
  const { matters } = useAttorneyData();

  return (
    <div>
      <PageHeader
        title="My Matters"
        description="Assigned cases with billing arrangements for your attorney workflow."
      />

      {matters.length === 0 ? (
        <EmptyState
          title="No assigned matters yet"
          description="Sample matter data will appear here in demo mode."
        />
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {matters.map((matter) => (
            <div key={matter.id} className="space-y-3">
              <MatterCard matter={matter} />
              <Link href={`/attorney/matters/${matter.id}`}>
                <Button variant="secondary" size="sm">
                  View timeline & checklist
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

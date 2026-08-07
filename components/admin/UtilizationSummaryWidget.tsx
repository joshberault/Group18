"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { KPICard } from "@/components/ui/KPICard";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  fetchUtilizationSummary,
  type UtilizationSummary,
} from "@/lib/admin/utilization";

/**
 * Firm utilization widget sourced from Supabase time_entries.
 */
export function UtilizationSummaryWidget() {
  const [summary, setSummary] = useState<UtilizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await fetchUtilizationSummary();
      setSummary(result.data);
      setError(result.error);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <LoadingState message="Loading utilization..." />;
  }

  if (error || !summary) {
    return (
      <Card padding="md">
        <CardHeader>
          <CardTitle>Utilization &amp; pro bono</CardTitle>
          <CardDescription>
            {error ?? "Utilization data is not available."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Utilization &amp; pro bono</CardTitle>
        <CardDescription>
          Billable hours from Supabase time entries. Pro bono bucket = non-billable
          entries ({summary.attorneyCount} legal staff at {summary.availableHours}{" "}
          hrs capacity).
        </CardDescription>
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Utilization rate"
          value={`${summary.utilizationRate}%`}
          subtitle={`${summary.billableHours} billable / ${summary.availableHours} hrs`}
        />
        <KPICard
          title="Billable hours"
          value={String(summary.billableHours)}
          subtitle="Approved + pending time entries"
        />
        <KPICard
          title="Pro bono hours"
          value={String(summary.proBonoHours)}
          subtitle="Non-billable time entry bucket"
        />
        <KPICard
          title="Total logged"
          value={String(summary.totalHours)}
          subtitle="Billable + pro bono"
        />
      </div>
    </Card>
  );
}

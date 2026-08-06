"use client";

import { Activity } from "lucide-react";
import { MatterHealthBadge } from "@/components/analytics/MatterHealthBadge";
import {
  analyticsCardClass,
  analyticsSectionDescClass,
  analyticsSectionTitleClass,
  analyticsTableWrapClass,
} from "@/components/analytics/analytics-styles";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import type { MatterHealthScore } from "@/lib/analytics/matter-health";
import { summarizeMatterHealth } from "@/lib/analytics/matter-health";

interface MatterHealthSummaryProps {
  scores: MatterHealthScore[];
}

export function MatterHealthSummary({ scores }: MatterHealthSummaryProps) {
  const summary = summarizeMatterHealth(scores);

  return (
    <Card padding="sm" className={analyticsCardClass}>
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-navy-700" />
          <CardTitle className={analyticsSectionTitleClass}>
            Matter Health Score
          </CardTitle>
        </div>
        <CardDescription className={analyticsSectionDescClass}>
          Combined profitability, collection rate, and risk exposure per matter
        </CardDescription>
      </CardHeader>

      <div className="mb-4 grid grid-cols-3 gap-2 px-1">
        <HealthCountCard label="Healthy" count={summary.green} tone="green" />
        <HealthCountCard label="At Risk" count={summary.yellow} tone="yellow" />
        <HealthCountCard label="Critical" count={summary.red} tone="red" />
      </div>

      <div className={analyticsTableWrapClass}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Collection</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Risks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((score) => (
              <TableRow key={score.matter_id} className="hover:bg-navy-50/50">
                <TableCell className="font-medium text-navy-900">
                  {score.matter_title}
                </TableCell>
                <TableCell>
                  <MatterHealthBadge level={score.level} compact />
                </TableCell>
                <TableCell>{score.collection_rate_pct.toFixed(0)}%</TableCell>
                <TableCell>
                  {score.margin_pct == null ? "—" : `${score.margin_pct.toFixed(1)}%`}
                </TableCell>
                <TableCell className="text-gray-600">
                  {score.risk_count > 0 ? score.risk_count : "None"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function HealthCountCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "green" | "yellow" | "red";
}) {
  const toneClass = {
    green: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    yellow: "border-amber-200 bg-amber-50/70 text-amber-900",
    red: "border-red-200 bg-red-50/70 text-red-900",
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold">{count}</p>
    </div>
  );
}

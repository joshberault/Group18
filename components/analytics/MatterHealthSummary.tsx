"use client";

import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
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
import { getMatterRiskReason } from "@/lib/analytics/dashboard-utils";
import { cn } from "@/lib/utils/cn";

type MatterActionStatus = "open" | "reviewed" | "escalated" | "resolved";

interface MatterHealthSummaryProps {
  scores: MatterHealthScore[];
}

export function MatterHealthSummary({ scores }: MatterHealthSummaryProps) {
  const summary = summarizeMatterHealth(scores);
  const atRiskMatters = scores.filter(
    (score) => score.level === "yellow" || score.level === "red",
  );
  const [actionStatus, setActionStatus] = useState<
    Record<string, MatterActionStatus>
  >({});

  const setAction = (matterId: string, status: MatterActionStatus) => {
    setActionStatus((prev) => ({ ...prev, [matterId]: status }));
  };

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
          Combined profitability, collection rate, and risk exposure — with
          inline actions for at-risk matters
        </CardDescription>
      </CardHeader>

      <div className="mb-4 grid grid-cols-3 gap-2 px-1">
        <HealthCountCard label="Healthy" count={summary.green} tone="green" />
        <HealthCountCard label="At Risk" count={summary.yellow} tone="yellow" />
        <HealthCountCard label="Critical" count={summary.red} tone="red" />
      </div>

      {atRiskMatters.length > 0 && (
        <div className="mb-4 space-y-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Requires Attention
          </p>
          {atRiskMatters.map((score) => {
            const status = actionStatus[score.matter_id] ?? "open";
            const reason = getMatterRiskReason(score);

            return (
              <div
                key={score.matter_id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  score.level === "red"
                    ? "border-red-200/80 bg-red-50/60"
                    : "border-amber-200/80 bg-amber-50/60",
                )}
              >
                <div className="flex min-w-0 items-start gap-2">
                  {score.level === "red" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  ) : (
                    <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {score.matter_title}
                    </p>
                    <p className="text-xs text-gray-600">{reason}</p>
                  </div>
                  <MatterHealthBadge level={score.level} compact className="ml-auto shrink-0 sm:ml-2" />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                  {status === "resolved" ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved
                    </span>
                  ) : (
                    <>
                      <ActionButton
                        label="Review"
                        active={status === "reviewed"}
                        onClick={() => setAction(score.matter_id, "reviewed")}
                      />
                      <ActionButton
                        label="Escalate"
                        active={status === "escalated"}
                        variant="warning"
                        onClick={() => setAction(score.matter_id, "escalated")}
                      />
                      <ActionButton
                        label="Resolve"
                        active={false}
                        variant="success"
                        onClick={() => setAction(score.matter_id, "resolved")}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={analyticsTableWrapClass}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matter</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Collection</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Risk Reason</TableHead>
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
                <TableCell className="text-xs text-gray-600">
                  {score.level === "green"
                    ? "None"
                    : getMatterRiskReason(score)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function ActionButton({
  label,
  active,
  variant = "default",
  onClick,
}: {
  label: string;
  active: boolean;
  variant?: "default" | "warning" | "success";
  onClick: () => void;
}) {
  const variantClass = {
    default: active
      ? "bg-navy-900 text-white"
      : "border border-gray-200 bg-white text-navy-800 hover:bg-gray-50",
    warning: active
      ? "bg-amber-600 text-white"
      : "border border-amber-200 bg-white text-amber-900 hover:bg-amber-50",
    success:
      "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
        variantClass,
      )}
    >
      {label}
    </button>
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
    green: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-900 shadow-sm",
    yellow: "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-900 shadow-sm",
    red: "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-900 shadow-sm",
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

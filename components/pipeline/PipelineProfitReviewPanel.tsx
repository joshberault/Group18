"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingUp } from "lucide-react";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  buildMatterCloseUrl,
  pipelineStepLabel,
} from "@/lib/pipeline/contract-to-cash";
import {
  fetchPendingProfitReviews,
  markProfitReviewed,
  type ProfitReviewRecord,
} from "@/lib/pipeline/profit-review-store";

export function PipelineProfitReviewPanel() {
  const searchParams = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const [records, setRecords] = useState<ProfitReviewRecord[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => setRecords(fetchPendingProfitReviews());

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get("focus") === "profit-review") {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const highlightedId = searchParams.get("matterId");
  const pending = useMemo(
    () => records.filter((record) => record.status === "pending"),
    [records],
  );

  function handleReview(record: ProfitReviewRecord) {
    if (!markProfitReviewed(record.matterId)) {
      setMessage("Unable to mark profit reviewed.");
      return;
    }
    setMessage(`Profitability reviewed for "${record.matterTitle}".`);
    load();
  }

  if (searchParams.get("submitted") !== "payment-collected" && pending.length === 0) {
    return null;
  }

  return (
    <div ref={panelRef} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profit Review Queue
          </CardTitle>
          <CardDescription>
            {pipelineStepLabel("profit_reviewed")} — confirm matter profitability before closing the file.
          </CardDescription>
        </CardHeader>
        {pending.length === 0 ? (
          <EmptyState
            title="No matters awaiting profit review"
            description="Matters appear here after payment is collected in Accounts Receivable."
            moduleLabel="Step 8"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matter</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((record) => (
                <TableRow
                  key={record.matterId}
                  className={
                    record.matterId === highlightedId
                      ? "bg-green-50 ring-1 ring-inset ring-green-200"
                      : undefined
                  }
                >
                  <TableCell className="font-medium">{record.matterTitle}</TableCell>
                  <TableCell>{record.clientName}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => handleReview(record)}>
                      Mark profit reviewed
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {message ? (
        <PipelineHandoffBanner stage="profit_reviewed" title={message}>
          <p>
            Continue to{" "}
            <PipelineHandoffLink href={buildMatterCloseUrl(highlightedId ?? undefined)}>
              Matter close
            </PipelineHandoffLink>{" "}
            to finish the contract-to-cash pipeline.
          </p>
        </PipelineHandoffBanner>
      ) : null}
    </div>
  );
}

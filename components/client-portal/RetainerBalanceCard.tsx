"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  fetchClientRetainerUsage,
  type ClientRetainerUsage,
} from "@/lib/billing/retainer";
import { formatCurrency } from "@/lib/utils/cn";

interface RetainerBalanceCardProps {
  clientNumber: string;
  clientName: string;
}

export function RetainerBalanceCard({
  clientNumber,
  clientName,
}: RetainerBalanceCardProps) {
  const [usage, setUsage] = useState<ClientRetainerUsage | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchClientRetainerUsage({
        clientNumber,
        clientName,
      });
      if (!cancelled) setUsage(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [clientNumber, clientName]);

  if (!usage?.hasRetainer) {
    return null;
  }

  const percentUsed = Math.min(100, Math.max(0, usage.percentUsed));
  const percentRemaining = Math.round((100 - percentUsed) * 10) / 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retainer balance</CardTitle>
        <CardDescription>
          Initial retainer, amount used, and remaining balance for this client.
        </CardDescription>
      </CardHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Initial retainer
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {formatCurrency(usage.initialAmount)}
          </p>
        </div>
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Amount used
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {formatCurrency(usage.amountUsed)}
          </p>
        </div>
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Remaining retainer
          </p>
          <p className="mt-1 text-lg font-semibold text-navy-900">
            {formatCurrency(usage.remainingBalance)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-navy-900">
            {percentUsed}% of retainer used
          </span>
          <span className="text-muted">{percentRemaining}% remaining</span>
        </div>
        <div
          className="h-3 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentUsed}
          aria-label="Percentage of retainer used"
        >
          <div
            className="h-full rounded-full bg-navy-900 transition-[width] duration-500"
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  invoicesHref,
  revenueByAttorneyHref,
} from "@/lib/billing/routes";
import type { RevenueByAttorney as AttorneyRevenue } from "@/lib/billing/types";

type Props = {
  rows: AttorneyRevenue[];
  /** Link each row to the full report when true (default: invoices filter). */
  linkMode?: "invoices" | "report";
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueByAttorney({
  rows,
  linkMode = "invoices",
}: Props) {
  const max = Math.max(...rows.map((row) => row.revenue), 1);

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Revenue by Attorney</CardTitle>
        <CardDescription>
          Billed amounts attributed to each matter owner. Select an attorney
          for detail.
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No attorney revenue in this period.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => {
            const width = Math.round((row.revenue / max) * 100);
            const href =
              linkMode === "report"
                ? revenueByAttorneyHref({ attorney: row.attorneyName })
                : invoicesHref({ attorney: row.attorneyName });
            return (
              <li key={row.attorneyId}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <Link
                    href={href}
                    className="text-sm font-semibold text-navy-900 underline-offset-2 hover:underline"
                    title={`View details for ${row.attorneyName}`}
                  >
                    {row.attorneyName}
                  </Link>
                  <span className="text-sm font-semibold text-navy-900">
                    {formatCurrency(row.revenue)}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-gray-100"
                  role="img"
                  aria-label={`${row.attorneyName}: ${formatCurrency(row.revenue)}`}
                >
                  <span
                    className="block h-full rounded-full bg-navy-900"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {row.invoiceCount} invoice{row.invoiceCount === 1 ? "" : "s"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

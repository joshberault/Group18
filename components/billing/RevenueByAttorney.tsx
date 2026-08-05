import Link from "next/link";
import type { RevenueByAttorney as AttorneyRevenue } from "@/lib/billing/types";

type Props = {
  rows: AttorneyRevenue[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function attorneyInvoicesHref(attorneyName: string): string {
  return `/invoices?attorney=${encodeURIComponent(attorneyName)}`;
}

export function RevenueByAttorney({ rows }: Props) {
  const max = Math.max(...rows.map((row) => row.revenue), 1);

  return (
    <section className="panel" aria-labelledby="revenue-attorney-heading">
      <header className="panel__header">
        <h2 id="revenue-attorney-heading">Revenue by Attorney</h2>
        <p>
          Billed amounts attributed to each matter owner. Select an attorney to
          view their invoices.
        </p>
      </header>

      <ul className="rank-list">
        {rows.map((row) => {
          const width = Math.round((row.revenue / max) * 100);
          return (
            <li key={row.attorneyId} className="rank-list__item">
              <div className="rank-list__meta">
                <Link
                  href={attorneyInvoicesHref(row.attorneyName)}
                  className="rank-list__name data-table__client-link"
                  title={`View invoices for ${row.attorneyName}`}
                >
                  {row.attorneyName}
                </Link>
                <span className="rank-list__value">
                  {formatCurrency(row.revenue)}
                </span>
              </div>
              <div
                className="rank-list__track"
                role="img"
                aria-label={`${row.attorneyName}: ${formatCurrency(row.revenue)}`}
              >
                <span
                  className="rank-list__fill rank-list__fill--attorney"
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="rank-list__sub">
                {row.invoiceCount} invoice{row.invoiceCount === 1 ? "" : "s"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

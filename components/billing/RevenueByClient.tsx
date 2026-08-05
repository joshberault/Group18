import Link from "next/link";
import { invoicesHref } from "@/lib/billing/routes";
import type { RevenueByClient as ClientRevenue } from "@/lib/billing/types";

type Props = {
  rows: ClientRevenue[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function clientInvoicesHref(clientName: string): string {
  return invoicesHref({ client: clientName });
}

export function RevenueByClient({ rows }: Props) {
  const max = Math.max(...rows.map((row) => row.revenue), 1);

  return (
    <section className="panel" aria-labelledby="revenue-client-heading">
      <header className="panel__header">
        <h2 id="revenue-client-heading">Revenue by Client</h2>
        <p>
          Total billed and open balances by client relationship. Select a client
          to view their invoices.
        </p>
      </header>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Revenue</th>
              <th scope="col">Open balance</th>
              <th scope="col" className="data-table__bar-col">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const width = Math.round((row.revenue / max) * 100);
              return (
                <tr key={row.clientId}>
                  <td className="data-table__name">
                    <Link
                      href={clientInvoicesHref(row.clientName)}
                      className="data-table__client-link"
                      title={`View invoices for ${row.clientName}`}
                    >
                      {row.clientName}
                    </Link>
                  </td>
                  <td>{formatCurrency(row.revenue)}</td>
                  <td
                    className={
                      row.openBalance > 0
                        ? "data-table__open"
                        : "data-table__muted"
                    }
                  >
                    {formatCurrency(row.openBalance)}
                  </td>
                  <td className="data-table__bar-col">
                    <div className="mini-track" aria-hidden="true">
                      <span
                        className="mini-fill"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="rank-list rank-list--mobile-only">
        {rows.map((row) => (
          <li key={row.clientId} className="rank-list__item">
            <div className="rank-list__meta">
              <Link
                href={clientInvoicesHref(row.clientName)}
                className="rank-list__name data-table__client-link"
                title={`View invoices for ${row.clientName}`}
              >
                {row.clientName}
              </Link>
              <span className="rank-list__value">
                {formatCurrency(row.revenue)}
              </span>
            </div>
            <p className="rank-list__sub">
              Open: {formatCurrency(row.openBalance)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { invoicesHref, revenueByClientHref } from "@/lib/billing/routes";
import type { RevenueByClient as ClientRevenue } from "@/lib/billing/types";

type Props = {
  rows: ClientRevenue[];
  linkMode?: "invoices" | "report";
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueByClient({ rows, linkMode = "invoices" }: Props) {
  const max = Math.max(...rows.map((row) => row.revenue), 1);

  function rowHref(name: string) {
    return linkMode === "report"
      ? revenueByClientHref({ client: name })
      : invoicesHref({ client: name });
  }

  return (
    <Card padding="md">
      <CardHeader>
        <CardTitle>Revenue by Client</CardTitle>
        <CardDescription>
          Total billed and open balances by client relationship.
        </CardDescription>
      </CardHeader>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No client revenue in this period.</p>
      ) : (
        <>
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Open balance</TableHead>
                  <TableHead>Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const width = Math.round((row.revenue / max) * 100);
                  return (
                    <TableRow key={row.clientId}>
                      <TableCell>
                        <Link
                          href={rowHref(row.clientName)}
                          className="font-medium text-navy-900 underline-offset-2 hover:underline"
                        >
                          {row.clientName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatCurrency(row.revenue)}</TableCell>
                      <TableCell
                        className={
                          row.openBalance > 0
                            ? "font-medium text-amber-800"
                            : "text-muted"
                        }
                      >
                        {formatCurrency(row.openBalance)}
                      </TableCell>
                      <TableCell>
                        <div className="h-2 min-w-[4rem] overflow-hidden rounded-full bg-gray-100">
                          <span
                            className="block h-full rounded-full bg-gold-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-3 sm:hidden">
            {rows.map((row) => (
              <li
                key={row.clientId}
                className="rounded-lg border border-gray-100 p-3"
              >
                <div className="flex justify-between gap-2">
                  <Link
                    href={rowHref(row.clientName)}
                    className="text-sm font-semibold text-navy-900"
                  >
                    {row.clientName}
                  </Link>
                  <span className="text-sm font-semibold">
                    {formatCurrency(row.revenue)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Open: {formatCurrency(row.openBalance)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

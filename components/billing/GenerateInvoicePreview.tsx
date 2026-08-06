import { FIRM_INFO } from "@/lib/billing/generate-invoice-seed";
import type {
  GenerateClient,
  GenerateMatter,
  InvoiceTotals,
  UnbilledExpense,
  UnbilledTimeEntry,
} from "@/lib/billing/generate-invoice-types";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type Props = {
  client: GenerateClient;
  matter: GenerateMatter;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "Draft" | "Sent";
  timeEntries: UnbilledTimeEntry[];
  expenses: UnbilledExpense[];
  writeDownTotal: number;
  courtesyDiscount: number;
  retainerApplied: number;
  totals: InvoiceTotals;
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function dateLabel(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function GenerateInvoicePreview({
  client,
  matter,
  invoiceNumber,
  invoiceDate,
  dueDate,
  status,
  timeEntries,
  expenses,
  writeDownTotal,
  courtesyDiscount,
  retainerApplied,
  totals,
}: Props) {
  const attorneyTime = timeEntries.filter((t) => t.role === "Attorney");
  const staffTime = timeEntries.filter((t) => t.role === "Staff");

  return (
    <Card className="space-y-6" aria-label="Invoice preview">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-semibold text-navy-900">
            {FIRM_INFO.name}
          </p>
          <p className="mt-1 text-sm text-muted">{FIRM_INFO.address}</p>
          <p className="text-sm text-muted">
            {FIRM_INFO.phone} · {FIRM_INFO.email}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <Badge variant={status === "Sent" ? "success" : "neutral"}>
            {status}
          </Badge>
          <p className="mt-2 text-navy-900">
            <span className="font-medium">Invoice #</span> {invoiceNumber}
          </p>
          <p className="text-muted">
            <span className="font-medium text-navy-900">Invoice date</span>{" "}
            {dateLabel(invoiceDate)}
          </p>
          <p className="text-muted">
            <span className="font-medium text-navy-900">Due date</span>{" "}
            {dateLabel(dueDate)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Bill to</h3>
          <p className="mt-1 font-medium text-navy-900">{client.name}</p>
          <p className="text-sm text-muted">{client.billingContact}</p>
          <p className="text-sm text-muted">{client.address}</p>
          <p className="text-sm text-muted">{client.email}</p>
          <p className="text-sm text-muted">{client.phone}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Matter</h3>
          <p className="mt-1 font-medium text-navy-900">{matter.matterName}</p>
          <p className="text-sm text-muted">Matter # {matter.matterNumber}</p>
          <p className="text-sm text-muted">
            Responsible attorney: {matter.responsibleAttorney}
          </p>
          <p className="text-sm text-muted">
            Billing period: {matter.billingPeriod}
          </p>
        </div>
      </div>

      <section>
        <CardHeader className="mb-2">
          <CardTitle>Attorney time entries</CardTitle>
        </CardHeader>
        {attorneyTime.length === 0 ? (
          <p className="text-sm text-muted">None selected.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Attorney</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attorneyTime.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{dateLabel(t.date)}</TableCell>
                  <TableCell>{t.person}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>{t.hours.toFixed(1)}</TableCell>
                  <TableCell>{money(t.rate)}</TableCell>
                  <TableCell>{money(t.hours * t.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <CardHeader className="mb-2">
          <CardTitle>Staff time entries</CardTitle>
        </CardHeader>
        {staffTime.length === 0 ? (
          <p className="text-sm text-muted">None selected.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffTime.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{dateLabel(t.date)}</TableCell>
                  <TableCell>{t.person}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>{t.hours.toFixed(1)}</TableCell>
                  <TableCell>{money(t.rate)}</TableCell>
                  <TableCell>{money(t.hours * t.rate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <CardHeader className="mb-2">
          <CardTitle>Reimbursable expenses</CardTitle>
        </CardHeader>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted">None selected.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{dateLabel(e.date)}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{money(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <CardHeader className="mb-2">
          <CardTitle>Adjustments</CardTitle>
        </CardHeader>
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between gap-4">
            <span className="text-muted">Write-downs</span>
            <span className="font-medium text-navy-900">
              −{money(writeDownTotal)}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-muted">Courtesy discounts</span>
            <span className="font-medium text-navy-900">
              −{money(courtesyDiscount)}
            </span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-muted">Retainer applied</span>
            <span className="font-medium text-navy-900">
              −{money(retainerApplied)}
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <CardHeader className="mb-3">
          <CardTitle>Financial summary</CardTitle>
          <CardDescription>Totals for this draft invoice</CardDescription>
        </CardHeader>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Billable time total</dt>
            <dd className="font-medium text-navy-900">
              {money(totals.billableTime)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Expense total</dt>
            <dd className="font-medium text-navy-900">
              {money(totals.expenses)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Total adjustments</dt>
            <dd className="font-medium text-navy-900">
              −{money(totals.totalAdjustments)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 text-base">
            <dt className="font-semibold text-navy-900">Total due</dt>
            <dd className="font-semibold text-navy-900">
              {money(totals.totalDue)}
            </dd>
          </div>
        </dl>
      </section>
    </Card>
  );
}

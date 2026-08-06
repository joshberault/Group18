"use client";

import type { Invoice } from "@/lib/billing/invoice-types";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { InvoiceStatusBadge } from "@/components/billing/invoice-status";

type Props = {
  invoice: Invoice;
  onClose: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-navy-900">{value}</dd>
    </div>
  );
}

export function InvoiceDetailsModal({ invoice, onClose }: Props) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Invoice details"
      description={invoice.invoiceNumber}
      className="max-w-3xl"
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Client information
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Client" value={invoice.clientInfo.name} />
            <Detail label="Contact" value={invoice.clientInfo.contact} />
            <Detail label="Email" value={invoice.clientInfo.email} />
            <Detail label="Phone" value={invoice.clientInfo.phone} />
            <Detail
              label="Billing address"
              value={invoice.clientInfo.billingAddress}
            />
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Matter & attorney
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Detail label="Legal matter" value={invoice.legalMatter} />
            <Detail label="Attorney" value={invoice.attorney} />
            <Detail label="Billing method" value={invoice.billingMethod} />
            <Detail
              label="Status"
              value={<InvoiceStatusBadge status={invoice.status} />}
            />
            <Detail label="Description" value={invoice.matterDescription} />
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Time entries
          </h3>
          {invoice.timeEntries.length === 0 ? (
            <p className="text-sm text-muted">No time entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Attorney</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.attorney}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.hours.toFixed(1)}</TableCell>
                    <TableCell>
                      {entry.amount > 0 ? formatCurrency(entry.amount) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Reimbursable expenses
          </h3>
          {invoice.reimbursableExpenses.length === 0 ? (
            <p className="text-sm text-muted">No reimbursable expenses.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.reimbursableExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">
            Totals & payments
          </h3>
          <dl className="mb-4 grid gap-3 sm:grid-cols-2">
            <Detail
              label="Retainer applied"
              value={formatCurrency(invoice.retainerApplied)}
            />
            <Detail
              label="Invoice total"
              value={formatCurrency(invoice.totalAmount)}
            />
            <Detail
              label="Amount paid"
              value={formatCurrency(invoice.amountPaid)}
            />
            <Detail
              label="Remaining balance"
              value={formatCurrency(invoice.remainingBalance)}
            />
          </dl>
          {invoice.paymentHistory.length === 0 ? (
            <p className="text-sm text-muted">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.reference}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </Modal>
  );
}

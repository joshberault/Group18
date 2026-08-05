"use client";

import type { Invoice } from "@/lib/billing/invoice-types";

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

export function InvoiceDetailsModal({ invoice, onClose }: Props) {
  return (
    <div
      className="inv-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="inv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inv-modal__header">
          <div>
            <p className="inv-modal__kicker">{invoice.invoiceNumber}</p>
            <h2 id="inv-modal-title">Invoice details</h2>
          </div>
          <button type="button" className="inv-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="inv-modal__body">
          <section className="inv-modal__section">
            <h3>Client information</h3>
            <dl className="inv-dl">
              <div>
                <dt>Client</dt>
                <dd>{invoice.clientInfo.name}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{invoice.clientInfo.contact}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{invoice.clientInfo.email}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{invoice.clientInfo.phone}</dd>
              </div>
              <div className="inv-dl--wide">
                <dt>Billing address</dt>
                <dd>{invoice.clientInfo.billingAddress}</dd>
              </div>
            </dl>
          </section>

          <section className="inv-modal__section">
            <h3>Matter & attorney</h3>
            <dl className="inv-dl">
              <div>
                <dt>Legal matter</dt>
                <dd>{invoice.legalMatter}</dd>
              </div>
              <div>
                <dt>Attorney</dt>
                <dd>{invoice.attorney}</dd>
              </div>
              <div>
                <dt>Billing method</dt>
                <dd>{invoice.billingMethod}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{invoice.status}</dd>
              </div>
              <div className="inv-dl--wide">
                <dt>Description</dt>
                <dd>{invoice.matterDescription}</dd>
              </div>
            </dl>
          </section>

          <section className="inv-modal__section">
            <h3>Time entries</h3>
            {invoice.timeEntries.length === 0 ? (
              <p className="inv-empty">No time entries.</p>
            ) : (
              <table className="inv-mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Attorney</th>
                    <th>Description</th>
                    <th>Hours</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.timeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>
                      <td>{entry.attorney}</td>
                      <td>{entry.description}</td>
                      <td>{entry.hours.toFixed(1)}</td>
                      <td>
                        {entry.amount > 0 ? formatCurrency(entry.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="inv-modal__section">
            <h3>Reimbursable expenses</h3>
            {invoice.reimbursableExpenses.length === 0 ? (
              <p className="inv-empty">No reimbursable expenses.</p>
            ) : (
              <table className="inv-mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.reimbursableExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatDate(expense.date)}</td>
                      <td>{expense.description}</td>
                      <td>{formatCurrency(expense.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="inv-modal__section">
            <h3>Write-downs</h3>
            {invoice.writeDowns.length === 0 ? (
              <p className="inv-empty">No write-downs.</p>
            ) : (
              <table className="inv-mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reason</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.writeDowns.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.reason}</td>
                      <td>{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="inv-modal__section">
            <h3>Totals & payments</h3>
            <dl className="inv-dl">
              <div>
                <dt>Retainer applied</dt>
                <dd>{formatCurrency(invoice.retainerApplied)}</dd>
              </div>
              <div>
                <dt>Invoice total</dt>
                <dd>{formatCurrency(invoice.totalAmount)}</dd>
              </div>
              <div>
                <dt>Amount paid</dt>
                <dd>{formatCurrency(invoice.amountPaid)}</dd>
              </div>
              <div>
                <dt>Remaining balance</dt>
                <dd>{formatCurrency(invoice.remainingBalance)}</dd>
              </div>
            </dl>

            <h4 className="inv-modal__subhead">Payment history</h4>
            {invoice.paymentHistory.length === 0 ? (
              <p className="inv-empty">No payments recorded.</p>
            ) : (
              <table className="inv-mini-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.date)}</td>
                      <td>{payment.method}</td>
                      <td>{payment.reference}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

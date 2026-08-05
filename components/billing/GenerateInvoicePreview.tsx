import { FIRM_INFO } from "@/lib/billing/generate-invoice-seed";
import type {
  GenerateClient,
  GenerateMatter,
  InvoiceTotals,
  UnbilledExpense,
  UnbilledTimeEntry,
} from "@/lib/billing/generate-invoice-types";

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
    <article className="gi-preview" aria-label="Invoice preview">
      <header className="gi-preview__banner">
        <div>
          <p className="gi-preview__firm">{FIRM_INFO.name}</p>
          <p>{FIRM_INFO.address}</p>
          <p>
            {FIRM_INFO.phone} · {FIRM_INFO.email}
          </p>
        </div>
        <div className="gi-preview__meta">
          <p className="gi-preview__status">Status: {status}</p>
          <p>
            <strong>Invoice #</strong> {invoiceNumber}
          </p>
          <p>
            <strong>Invoice date</strong> {dateLabel(invoiceDate)}
          </p>
          <p>
            <strong>Due date</strong> {dateLabel(dueDate)}
          </p>
        </div>
      </header>

      <section className="gi-preview__parties">
        <div>
          <h3>Bill to</h3>
          <p className="gi-preview__strong">{client.name}</p>
          <p>{client.billingContact}</p>
          <p>{client.address}</p>
          <p>{client.email}</p>
          <p>{client.phone}</p>
        </div>
        <div>
          <h3>Matter</h3>
          <p className="gi-preview__strong">{matter.matterName}</p>
          <p>Matter # {matter.matterNumber}</p>
          <p>Responsible attorney: {matter.responsibleAttorney}</p>
          <p>Billing period: {matter.billingPeriod}</p>
        </div>
      </section>

      <section>
        <h3>Attorney time entries</h3>
        {attorneyTime.length === 0 ? (
          <p className="gi-muted">None selected.</p>
        ) : (
          <table className="gi-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Attorney</th>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {attorneyTime.map((t) => (
                <tr key={t.id}>
                  <td>{dateLabel(t.date)}</td>
                  <td>{t.person}</td>
                  <td>{t.description}</td>
                  <td>{t.hours.toFixed(1)}</td>
                  <td>{money(t.rate)}</td>
                  <td>{money(t.hours * t.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Staff time entries</h3>
        {staffTime.length === 0 ? (
          <p className="gi-muted">None selected.</p>
        ) : (
          <table className="gi-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Staff</th>
                <th>Description</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {staffTime.map((t) => (
                <tr key={t.id}>
                  <td>{dateLabel(t.date)}</td>
                  <td>{t.person}</td>
                  <td>{t.description}</td>
                  <td>{t.hours.toFixed(1)}</td>
                  <td>{money(t.rate)}</td>
                  <td>{money(t.hours * t.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Reimbursable expenses</h3>
        {expenses.length === 0 ? (
          <p className="gi-muted">None selected.</p>
        ) : (
          <table className="gi-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{dateLabel(e.date)}</td>
                  <td>{e.category}</td>
                  <td>{e.description}</td>
                  <td>{money(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Adjustments</h3>
        <ul className="gi-adj-list">
          <li>
            Write-downs <span>−{money(writeDownTotal)}</span>
          </li>
          <li>
            Courtesy discounts <span>−{money(courtesyDiscount)}</span>
          </li>
          <li>
            Retainer applied <span>−{money(retainerApplied)}</span>
          </li>
        </ul>
      </section>

      <section className="gi-preview__summary">
        <h3>Financial summary</h3>
        <dl>
          <div>
            <dt>Billable time total</dt>
            <dd>{money(totals.billableTime)}</dd>
          </div>
          <div>
            <dt>Expense total</dt>
            <dd>{money(totals.expenses)}</dd>
          </div>
          <div>
            <dt>Total adjustments</dt>
            <dd>−{money(totals.totalAdjustments)}</dd>
          </div>
          <div className="gi-preview__due">
            <dt>Total due</dt>
            <dd>{money(totals.totalDue)}</dd>
          </div>
        </dl>
      </section>
    </article>
  );
}

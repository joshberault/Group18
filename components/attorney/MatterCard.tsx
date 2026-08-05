import { billingLabel, formatCurrency, statusBadgeClass } from "@/lib/attorney/format";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Matter } from "@/types/database";

export function MatterCard({ matter }: { matter: Matter }) {
  return (
    <Card padding="md">
      <CardHeader className="mb-0 flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{matter.title}</CardTitle>
          <CardDescription>
            {matter.client?.company_name || matter.client?.name} · {matter.practice_area?.name}
          </CardDescription>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(matter.status)}`}>
          {matter.status}
        </span>
      </CardHeader>

      {matter.description && (
        <p className="mb-4 mt-3 text-sm text-muted">{matter.description}</p>
      )}

      <div className="rounded-lg bg-gold-100/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">
          Billing Arrangement
        </p>
        <p className="mt-1 text-sm font-medium text-navy-900">{billingLabel(matter.billing_type)}</p>
        <dl className="mt-3 grid gap-2 text-sm text-navy-900 sm:grid-cols-2">
          {matter.billing_type === "hourly" && (
            <div>
              <dt className="text-muted">Hourly rate</dt>
              <dd className="font-medium">{formatCurrency(matter.hourly_rate)}/hr</dd>
            </div>
          )}
          {matter.billing_type === "fixed_fee" && (
            <div>
              <dt className="text-muted">Fixed fee</dt>
              <dd className="font-medium">{formatCurrency(matter.fixed_fee_amount)}</dd>
            </div>
          )}
          {matter.billing_type === "retainer" && (
            <>
              <div>
                <dt className="text-muted">Retainer amount</dt>
                <dd className="font-medium">{formatCurrency(matter.retainer_amount)}</dd>
              </div>
              <div>
                <dt className="text-muted">Retainer balance</dt>
                <dd className="font-medium">{formatCurrency(matter.retainer_balance)}</dd>
              </div>
            </>
          )}
          {matter.expense_terms && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Reimbursable expenses</dt>
              <dd className="font-medium">{matter.expense_terms}</dd>
            </div>
          )}
        </dl>
      </div>
    </Card>
  );
}

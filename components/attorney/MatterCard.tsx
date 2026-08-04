import { billingLabel, formatCurrency, statusBadgeClass } from "@/lib/utils";
import type { Matter } from "@/types/database";

export function MatterCard({ matter }: { matter: Matter }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-700">{matter.title}</h3>
          <p className="text-sm text-slate-600">
            {matter.client?.company_name || matter.client?.name} ·{" "}
            {matter.practice_area?.name}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusBadgeClass(matter.status)}`}>
          {matter.status}
        </span>
      </div>

      {matter.description && (
        <p className="mb-4 text-sm text-slate-600">{matter.description}</p>
      )}

      <div className="rounded-lg bg-brand-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Billing Arrangement
        </p>
        <p className="mt-1 text-sm font-medium text-brand-700">
          {billingLabel(matter.billing_type)}
        </p>
        <dl className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {matter.billing_type === "hourly" && (
            <div>
              <dt className="text-slate-500">Hourly rate</dt>
              <dd className="font-medium">{formatCurrency(matter.hourly_rate)}/hr</dd>
            </div>
          )}
          {matter.billing_type === "fixed_fee" && (
            <div>
              <dt className="text-slate-500">Fixed fee</dt>
              <dd className="font-medium">{formatCurrency(matter.fixed_fee_amount)}</dd>
            </div>
          )}
          {matter.billing_type === "retainer" && (
            <>
              <div>
                <dt className="text-slate-500">Retainer amount</dt>
                <dd className="font-medium">{formatCurrency(matter.retainer_amount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Retainer balance</dt>
                <dd className="font-medium">{formatCurrency(matter.retainer_balance)}</dd>
              </div>
            </>
          )}
          {matter.expense_terms && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Reimbursable expenses</dt>
              <dd className="font-medium">{matter.expense_terms}</dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

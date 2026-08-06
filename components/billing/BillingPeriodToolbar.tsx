"use client";

import {
  PERIOD_PRESET_OPTIONS,
  type BillingPeriodPreset,
  type BillingPeriodState,
} from "@/lib/billing/billing-period";
import { cn } from "@/lib/utils/cn";

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

type Props = {
  period: BillingPeriodState;
  periodLabel: string;
  invoiceCountInPeriod: number;
  invoiceCountAll: number;
  outsidePeriodCount: number;
  onApplyPreset: (preset: BillingPeriodPreset) => void;
  onApplyCustomRange: (start: string, end: string) => void;
  /** Dark hero card (billing dashboard) vs light panel (nested sections) */
  variant?: "hero" | "panel";
  footnote?: string;
  className?: string;
};

export function BillingPeriodToolbar({
  period,
  periodLabel,
  invoiceCountInPeriod,
  invoiceCountAll,
  outsidePeriodCount,
  onApplyPreset,
  onApplyCustomRange,
  variant = "panel",
  footnote,
  className,
}: Props) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        isHero
          ? "rounded-xl border border-gold-500/30 bg-gradient-to-r from-navy-900 to-navy-800 text-white"
          : "rounded-xl border border-gray-200 bg-white text-navy-900",
        className,
      )}
    >
      <div className="p-4 sm:p-6">
        <p
          className={cn(
            "text-sm font-medium",
            isHero ? "text-gold-500" : "text-navy-900",
          )}
        >
          Billing period
        </p>
        <p
          className={cn(
            "mt-2 text-sm",
            isHero ? "text-gray-200" : "text-muted",
          )}
        >
          Showing {formatInteger(invoiceCountInPeriod)} of{" "}
          {formatInteger(invoiceCountAll)} invoices for {periodLabel}
          {outsidePeriodCount > 0
            ? ` (${formatInteger(outsidePeriodCount)} outside this period)`
            : ""}
          .
        </p>
        {footnote ? (
          <p
            className={cn(
              "mt-1 text-xs",
              isHero ? "text-gray-400" : "text-muted",
            )}
          >
            {footnote}
          </p>
        ) : null}
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Billing period quick filters"
        >
          {PERIOD_PRESET_OPTIONS.map((opt) => {
            const active = period.preset === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => onApplyPreset(opt.id)}
                className={
                  active
                    ? isHero
                      ? "inline-flex h-9 items-center justify-center rounded-lg bg-gold-500 px-3 text-sm font-semibold text-navy-950 shadow-sm hover:bg-gold-400"
                      : "inline-flex h-9 items-center justify-center rounded-lg bg-navy-900 px-3 text-sm font-semibold text-white shadow-sm hover:bg-navy-800"
                    : isHero
                      ? "inline-flex h-9 items-center justify-center rounded-lg border border-white/40 bg-white px-3 text-sm font-semibold text-navy-900 shadow-sm hover:bg-gold-100"
                      : "inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-navy-900 shadow-sm hover:bg-gray-50"
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {period.preset === "custom" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label
              className={cn(
                "flex flex-col gap-1.5 text-sm font-medium",
                isHero ? "text-gray-200" : "text-navy-900",
              )}
            >
              Start date
              <input
                type="date"
                value={period.customStart}
                onChange={(e) =>
                  onApplyCustomRange(e.target.value, period.customEnd)
                }
                className={
                  isHero
                    ? "h-10 rounded-lg border border-navy-700 bg-navy-950 px-3 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                    : "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/20"
                }
              />
            </label>
            <label
              className={cn(
                "flex flex-col gap-1.5 text-sm font-medium",
                isHero ? "text-gray-200" : "text-navy-900",
              )}
            >
              End date
              <input
                type="date"
                value={period.customEnd}
                onChange={(e) =>
                  onApplyCustomRange(period.customStart, e.target.value)
                }
                className={
                  isHero
                    ? "h-10 rounded-lg border border-navy-700 bg-navy-950 px-3 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                    : "h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-navy-900 focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/20"
                }
              />
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}

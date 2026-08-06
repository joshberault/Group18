/**
 * Billing period presets and date-range helpers for the dashboard filter.
 * Date comparisons use local calendar days (YYYY-MM-DD strings).
 */

export type BillingPeriodPreset =
  | "all_time"
  | "this_month"
  | "last_month"
  | "last_quarter"
  | "ytd"
  | "custom";

export type DateRange = {
  /** Inclusive start, YYYY-MM-DD */
  start: string;
  /** Inclusive end, YYYY-MM-DD */
  end: string;
};

export type BillingPeriodState = {
  preset: BillingPeriodPreset;
  /** Effective inclusive range (resolved from preset or custom inputs) */
  range: DateRange;
  /** Custom inputs (used when preset === "custom") */
  customStart: string;
  customEnd: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Normalize free-form or browser date values to YYYY-MM-DD (local calendar).
 * Returns null when the value cannot be interpreted as a calendar day.
 */
export function normalizeBillingDate(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (ISO_DATE.test(trimmed)) return trimmed;

  // M/D/YYYY or MM/DD/YYYY
  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, "0");
    const dd = mdy[2].padStart(2, "0");
    return `${mdy[3]}-${mm}-${dd}`;
  }

  // Date-only with time leftover, e.g. 2026-08-05T00:00:00.000Z
  const isoPrefix = trimmed.slice(0, 10);
  if (ISO_DATE.test(isoPrefix) && (trimmed[10] === "T" || trimmed[10] === " ")) {
    // Prefer the calendar day the user selected; if midnight UTC shifted, use local
    if (trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
    }
    return isoPrefix;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
  return null;
}

export function parseIsoDate(iso: string): Date | null {
  const normalized = normalizeBillingDate(iso);
  if (!normalized) return null;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Previous completed calendar quarter relative to asOf */
function lastQuarterRange(asOf: Date): DateRange {
  const month = asOf.getMonth(); // 0-11
  const currentQuarter = Math.floor(month / 3); // 0-3
  const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const year =
    currentQuarter === 0 ? asOf.getFullYear() - 1 : asOf.getFullYear();
  const startMonth = lastQuarter * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function resolvePeriodRange(
  preset: BillingPeriodPreset,
  asOf = new Date(),
  custom?: Partial<DateRange>,
): DateRange {
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());

  switch (preset) {
    case "all_time":
      // Wide inclusive range so historical Supabase invoices (any year) count.
      return {
        start: "2000-01-01",
        end: toIsoDate(today),
      };
    case "this_month": {
      return {
        start: toIsoDate(startOfMonth(today)),
        end: toIsoDate(endOfMonth(today)),
      };
    }
    case "last_month": {
      const ref = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return {
        start: toIsoDate(startOfMonth(ref)),
        end: toIsoDate(endOfMonth(ref)),
      };
    }
    case "last_quarter":
      return lastQuarterRange(today);
    case "ytd":
      return {
        start: toIsoDate(new Date(today.getFullYear(), 0, 1)),
        end: toIsoDate(today),
      };
    case "custom": {
      const fallback = resolvePeriodRange("all_time", today);
      const start = custom?.start && parseIsoDate(custom.start)
        ? custom.start
        : fallback.start;
      const end = custom?.end && parseIsoDate(custom.end)
        ? custom.end
        : fallback.end;
      return start <= end ? { start, end } : { start: end, end: start };
    }
    default:
      return resolvePeriodRange("all_time", today);
  }
}

export function createDefaultBillingPeriod(asOf = new Date()): BillingPeriodState {
  const range = resolvePeriodRange("all_time", asOf);
  return {
    preset: "all_time",
    range,
    customStart: range.start,
    customEnd: range.end,
  };
}

export function isDateInRange(isoDate: string, range: DateRange): boolean {
  const day = normalizeBillingDate(isoDate);
  if (!day) return false;
  return day >= range.start && day <= range.end;
}

/** Human-readable label for the active period (lede / filter status). */
export function formatPeriodLabel(
  preset: BillingPeriodPreset,
  range: DateRange,
): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start = parseIsoDate(range.start);
  const end = parseIsoDate(range.end);
  if (!start || !end) return range.start;

  if (preset === "all_time") {
    return "All time";
  }
  if (preset === "this_month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(start);
  }
  if (preset === "last_month") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(start);
  }
  if (preset === "last_quarter") {
    const q = Math.floor(start.getMonth() / 3) + 1;
    return `Q${q} ${start.getFullYear()}`;
  }
  if (preset === "ytd") {
    return `Year to date ${start.getFullYear()}`;
  }

  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export const PERIOD_PRESET_OPTIONS: {
  id: BillingPeriodPreset;
  label: string;
}[] = [
  { id: "all_time", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_quarter", label: "Last Quarter" },
  { id: "ytd", label: "Year to Date" },
  { id: "custom", label: "Custom Date Range" },
];

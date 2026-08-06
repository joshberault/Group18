export const CRM_PAYMENT_PLAN_KEY = "counselflow-crm-payment-plans";
export const CRM_PAYMENT_PLAN_UPDATE_EVENT = "crm-payment-plans-updated";

export type PaymentFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

export type PaymentPlan = {
  matterId: string;
  frequency: PaymentFrequency;
  installmentAmount: number;
  startDate: string;
  autopay: boolean;
  updatedAt: string;
};

export const FREQUENCY_OPTIONS: Array<{
  value: PaymentFrequency;
  label: string;
  days: number;
}> = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "biweekly", label: "Every two weeks", days: 14 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "quarterly", label: "Quarterly", days: 91 },
];

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> =
  Object.fromEntries(
    FREQUENCY_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<PaymentFrequency, string>;

const SEED_PLANS: PaymentPlan[] = [
  {
    matterId: "crm-1",
    frequency: "monthly",
    installmentAmount: 4600,
    startDate: "2026-08-15",
    autopay: true,
    updatedAt: "2026-06-01T12:00:00.000Z",
  },
  {
    matterId: "crm-2",
    frequency: "monthly",
    installmentAmount: 8550,
    startDate: "2026-08-10",
    autopay: false,
    updatedAt: "2026-05-18T12:00:00.000Z",
  },
  {
    matterId: "crm-3",
    frequency: "biweekly",
    installmentAmount: 1600,
    startDate: "2026-08-07",
    autopay: true,
    updatedAt: "2026-06-22T12:00:00.000Z",
  },
  {
    matterId: "crm-4",
    frequency: "monthly",
    installmentAmount: 2450,
    startDate: "2026-08-20",
    autopay: false,
    updatedAt: "2026-04-30T12:00:00.000Z",
  },
  {
    matterId: "crm-5",
    frequency: "monthly",
    installmentAmount: 1000,
    startDate: "2026-08-12",
    autopay: true,
    updatedAt: "2026-07-02T12:00:00.000Z",
  },
];

function readStoredPlans(): PaymentPlan[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CRM_PAYMENT_PLAN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PaymentPlan[]) : [];
  } catch {
    return [];
  }
}

export function getPaymentPlans(): PaymentPlan[] {
  const stored = readStoredPlans();
  const overrides = new Map(stored.map((plan) => [plan.matterId, plan]));

  const merged = SEED_PLANS.map(
    (plan) => overrides.get(plan.matterId) ?? plan,
  );
  const seeded = new Set(SEED_PLANS.map((plan) => plan.matterId));

  return [...merged, ...stored.filter((plan) => !seeded.has(plan.matterId))];
}

export function getPaymentPlan(matterId: string): PaymentPlan | null {
  return getPaymentPlans().find((plan) => plan.matterId === matterId) ?? null;
}

export function savePaymentPlan(plan: PaymentPlan) {
  if (typeof window === "undefined") return;

  const next = [
    plan,
    ...readStoredPlans().filter((item) => item.matterId !== plan.matterId),
  ];
  window.localStorage.setItem(CRM_PAYMENT_PLAN_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(CRM_PAYMENT_PLAN_UPDATE_EVENT));
}

export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatPlanDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export type PlanSchedule = {
  installments: number;
  finalInstallment: number;
  finalPaymentDate: string;
};

/** Project how a plan retires `target` so the UI can show the payoff date. */
export function projectSchedule(
  plan: Pick<PaymentPlan, "frequency" | "installmentAmount" | "startDate">,
  target: number,
): PlanSchedule | null {
  if (plan.installmentAmount <= 0 || target <= 0) return null;

  const installments = Math.ceil(target / plan.installmentAmount);
  const finalInstallment =
    Math.round((target - plan.installmentAmount * (installments - 1)) * 100) /
    100;
  const cadence =
    FREQUENCY_OPTIONS.find((option) => option.value === plan.frequency)?.days ??
    30;

  return {
    installments,
    finalInstallment,
    finalPaymentDate: addDays(plan.startDate, cadence * (installments - 1)),
  };
}

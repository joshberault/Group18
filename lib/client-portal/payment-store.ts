import {
  addDisputeDeniedNotification,
} from "@/lib/client-portal/notifications-store";

export const RECURRING_PAYMENT_KEY = "counselflow-recurring-payment";
export const RECURRING_PAYMENT_EVENT = "client-recurring-payment-updated";
export const DISPUTE_REQUESTS_KEY = "counselflow-dispute-requests";
export const DISPUTE_REQUESTS_EVENT = "client-dispute-requests-updated";

export interface RecurringPaymentSetup {
  startDate: string;
  endDate: string;
  frequency: string;
  amount: number;
  updatedAt: string;
}

export interface DisputeRequest {
  id: string;
  chargeIds: string[];
  chargeSummaries: string[];
  reason: string;
  status: "pending" | "denied" | "approved";
  submittedAt: string;
  resolvedAt?: string;
}

export function getRecurringPayment(): RecurringPaymentSetup | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = JSON.parse(
      localStorage.getItem(RECURRING_PAYMENT_KEY) ?? "null",
    );
    return stored && typeof stored === "object"
      ? (stored as RecurringPaymentSetup)
      : null;
  } catch {
    return null;
  }
}

export function saveRecurringPayment(
  setup: Omit<RecurringPaymentSetup, "updatedAt">,
) {
  if (typeof window === "undefined") return;

  const payload: RecurringPaymentSetup = {
    ...setup,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(RECURRING_PAYMENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(RECURRING_PAYMENT_EVENT));
}

export function getDisputeRequests(): DisputeRequest[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(
      localStorage.getItem(DISPUTE_REQUESTS_KEY) ?? "[]",
    );
    return Array.isArray(stored) ? (stored as DisputeRequest[]) : [];
  } catch {
    return [];
  }
}

export function saveDisputeRequest(
  input: Omit<DisputeRequest, "id" | "status" | "submittedAt">,
) {
  if (typeof window === "undefined") return;

  const request: DisputeRequest = {
    id: `dispute-${Date.now()}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
    ...input,
  };
  const existing = getDisputeRequests();
  localStorage.setItem(
    DISPUTE_REQUESTS_KEY,
    JSON.stringify([request, ...existing]),
  );
  window.dispatchEvent(new CustomEvent(DISPUTE_REQUESTS_EVENT));
  return request;
}

export function denyDisputeRequest(disputeId: string) {
  if (typeof window === "undefined") return;

  const existing = getDisputeRequests();
  const target = existing.find((item) => item.id === disputeId);
  if (!target || target.status !== "pending") return;

  const updated = existing.map((item) =>
    item.id === disputeId
      ? {
          ...item,
          status: "denied" as const,
          resolvedAt: new Date().toISOString(),
        }
      : item,
  );
  localStorage.setItem(DISPUTE_REQUESTS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(DISPUTE_REQUESTS_EVENT));

  addDisputeDeniedNotification({
    chargeSummaries: target.chargeSummaries,
  });
}

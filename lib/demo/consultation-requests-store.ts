import type { CaseTypeId } from "@/lib/client-portal/case-task-lists";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";

export const CONSULTATION_LEGAL_SERVICE_OPTIONS = [
  { value: "corporate_business", label: "Corporate / Business" },
  { value: "employment", label: "Employment" },
  { value: "litigation", label: "Litigation" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
] as const;

export type ConsultationLegalServiceId =
  (typeof CONSULTATION_LEGAL_SERVICE_OPTIONS)[number]["value"];

export const CONSULTATION_LEGAL_SERVICE_LABELS: Record<
  ConsultationLegalServiceId,
  string
> = {
  corporate_business: "Corporate / Business",
  employment: "Employment",
  litigation: "Litigation",
  real_estate: "Real Estate",
  other: "Other",
};

/** Map intake categories to firm case types for demo matter routing. */
const CONSULTATION_TO_CASE_TYPE: Record<
  Exclude<ConsultationLegalServiceId, "other">,
  CaseTypeId
> = {
  corporate_business: "corporate_business_advisory",
  employment: "employment_litigation_employee",
  litigation: "commercial_litigation",
  real_estate: "commercial_real_estate",
};

export type ConsultationContactMethod = "email" | "phone_call" | "text_message";

export type ConsultationAvailability = {
  date: string;
  times: string[];
};

export type ConsultationRequestPayload = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  contactMethod: ConsultationContactMethod;
  legalServices: ConsultationLegalServiceId[];
  otherLegalServiceDetails?: string;
  availability: ConsultationAvailability[];
  additionalInfo: string;
};

export type ConsultationRequestRecord = ConsultationRequestPayload & {
  id: string;
  createdAt: string;
  assignedTo: "attorney" | "paralegal";
  assigneeName: string;
  matterId: string;
  matterNumber: string;
  matterName: string;
  status: "pending" | "completed";
};

export const CONSULTATION_REQUESTS_KEY = "counselflow-consultation-requests";
export const CONSULTATION_REQUESTS_UPDATE_EVENT =
  "consultation-requests-updated";

const DEMO_ATTORNEY = {
  fullName: "Avery Counsel",
  assignedToLabel: "Avery Counsel — Attorney",
} as const;

const DEMO_PARALEGAL = {
  fullName: "Parker Legal",
  assignedToLabel: "Parker Legal — Paralegal",
} as const;

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function persist(records: ConsultationRequestRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CONSULTATION_REQUESTS_KEY,
    JSON.stringify(records),
  );
  window.dispatchEvent(new CustomEvent(CONSULTATION_REQUESTS_UPDATE_EVENT));
}

export function getConsultationRequests(): ConsultationRequestRecord[] {
  return readArray<ConsultationRequestRecord>(CONSULTATION_REQUESTS_KEY).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
}

export function getConsultationRequestsForAssignee(
  assignee: "attorney" | "paralegal",
): ConsultationRequestRecord[] {
  return getConsultationRequests().filter(
    (item) => item.assignedTo === assignee && item.status === "pending",
  );
}

export function formatConsultationDetails(
  payload: ConsultationRequestPayload,
): string {
  const services = payload.legalServices
    .map((id) =>
      id === "other"
        ? `Other${payload.otherLegalServiceDetails ? `: ${payload.otherLegalServiceDetails}` : ""}`
        : CONSULTATION_LEGAL_SERVICE_LABELS[id],
    )
    .join(", ");

  const availability = payload.availability
    .map((slot) => `${slot.date}: ${slot.times.join(", ")}`)
    .join("\n");

  const contactLabel =
    payload.contactMethod === "email"
      ? "Email"
      : payload.contactMethod === "phone_call"
        ? "Phone call"
        : "Text message";

  return [
    `Prospective client: ${payload.firstName} ${payload.lastName}`,
    `Date of birth: ${payload.dateOfBirth}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `Preferred contact: ${contactLabel}`,
    `Legal services: ${services}`,
    `Availability:\n${availability}`,
    `Additional information: ${payload.additionalInfo.trim()}`,
  ].join("\n");
}

export function resolveConsultationMatter(
  legalServices: ConsultationLegalServiceId[],
): { matterId: string; matterNumber: string; matterName: string } {
  const primary = legalServices.find(
    (service): service is Exclude<ConsultationLegalServiceId, "other"> =>
      service !== "other",
  );
  if (primary) {
    const caseType = CONSULTATION_TO_CASE_TYPE[primary];
    const match = PARALEGAL_ASSIGNED_MATTERS.find(
      (matter) => matter.caseType === caseType,
    );
    if (match) {
      return {
        matterId: match.id,
        matterNumber: match.matterNumber,
        matterName: match.title,
      };
    }
  }

  const fallback = PARALEGAL_ASSIGNED_MATTERS[0];
  return {
    matterId: fallback.id,
    matterNumber: fallback.matterNumber,
    matterName: "Consultation Intake",
  };
}

export function shouldRouteConsultationToParalegal(
  legalServices: ConsultationLegalServiceId[],
): boolean {
  return legalServices.includes("other");
}

export function shouldRouteConsultationToAttorney(
  legalServices: ConsultationLegalServiceId[],
): boolean {
  return legalServices.some((service) => service !== "other");
}

export function addConsultationRequestRecord(
  payload: ConsultationRequestPayload,
  route: "attorney" | "paralegal",
): ConsultationRequestRecord {
  const matter = resolveConsultationMatter(payload.legalServices);
  const assignee =
    route === "attorney" ? DEMO_ATTORNEY : DEMO_PARALEGAL;
  const record: ConsultationRequestRecord = {
    ...payload,
    id: `consultation-${route}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    assignedTo: route,
    assigneeName: assignee.fullName,
    matterId: matter.matterId,
    matterNumber: matter.matterNumber,
    matterName:
      route === "paralegal"
        ? "Consultation Intake — Other"
        : matter.matterName,
    status: "pending",
  };

  const existing = getConsultationRequests();
  persist([record, ...existing.filter((item) => item.id !== record.id)]);
  return record;
}

export function getConsultationAssigneeLabel(
  route: "attorney" | "paralegal",
): string {
  return route === "attorney"
    ? DEMO_ATTORNEY.assignedToLabel
    : DEMO_PARALEGAL.assignedToLabel;
}

/** Generate 30-minute slots from 8:00 AM through 6:00 PM inclusive. */
export function buildConsultationTimeSlots(): string[] {
  const slots: string[] = [];
  for (let minutes = 8 * 60; minutes <= 18 * 60; minutes += 30) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    slots.push(
      `${hour12}:${minute.toString().padStart(2, "0")} ${period}`,
    );
  }
  return slots;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Accepts US numbers only: 10 digits, or 11 digits starting with 1 / +1. */
export function parseUsPhone(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("+") && !trimmed.startsWith("+1")) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

export function formatUsPhoneDisplay(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

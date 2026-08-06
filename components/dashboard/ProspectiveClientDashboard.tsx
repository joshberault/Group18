"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { addAttorneyConsultationRequestNotification } from "@/lib/attorney/notifications-store";
import {
  addConsultationRequestRecord,
  buildConsultationTimeSlots,
  CONSULTATION_LEGAL_SERVICE_LABELS,
  CONSULTATION_LEGAL_SERVICE_OPTIONS,
  formatConsultationDetails,
  formatUsPhoneDisplay,
  getConsultationAssigneeLabel,
  isValidEmail,
  parseUsPhone,
  shouldRouteConsultationToAttorney,
  shouldRouteConsultationToParalegal,
  type ConsultationAvailability,
  type ConsultationContactMethod,
  type ConsultationLegalServiceId,
} from "@/lib/demo/consultation-requests-store";
import { addMatterRequest } from "@/lib/matters/workspace-store";
import { addParalegalConsultationRequestNotification } from "@/lib/paralegal/notifications-store";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";

const CONTACT_METHOD_OPTIONS = [
  { value: "", label: "Select how you would like to be contacted" },
  { value: "email", label: "Email" },
  { value: "phone_call", label: "Phone call" },
  { value: "text_message", label: "Text message" },
];

const TIME_SLOTS = buildConsultationTimeSlots();
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

type FormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  contactMethod: ConsultationContactMethod | "";
  legalServices: ConsultationLegalServiceId[];
  otherLegalServiceDetails: string;
  selectedDates: string[];
  availability: ConsultationAvailability[];
  additionalInfo: string;
};

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  contactMethod: "",
  legalServices: [],
  otherLegalServiceDetails: "",
  selectedDates: [],
  availability: [],
  additionalInfo: "",
};

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ dateKey: string; day: number; inMonth: boolean } | null> =
    [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      dateKey: toDateKey(year, month, day),
      day,
      inMonth: true,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function ProspectiveClientDashboard() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [datesContinued, setDatesContinued] = useState(false);
  const [servicesContinued, setServicesContinued] = useState(false);
  const [openTimeMenu, setOpenTimeMenu] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [calendarCursor, setCalendarCursor] = useState({ year: 2026, month: 7 });

  const monthCells = useMemo(
    () => buildMonthCells(calendarCursor.year, calendarCursor.month),
    [calendarCursor],
  );

  const showOtherDetails =
    servicesContinued && form.legalServices.includes("other");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function toggleLegalService(service: ConsultationLegalServiceId) {
    setForm((current) => {
      const selected = current.legalServices.includes(service)
        ? current.legalServices.filter((item) => item !== service)
        : [...current.legalServices, service];
      return { ...current, legalServices: selected };
    });
    setServicesContinued(false);
    setError(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.legalServices;
      delete next.otherLegalServiceDetails;
      return next;
    });
  }

  function toggleDate(dateKey: string) {
    const date = parseDateKey(dateKey);
    if (isWeekend(date)) return;

    setForm((current) => {
      const selected = current.selectedDates.includes(dateKey)
        ? current.selectedDates.filter((item) => item !== dateKey)
        : [...current.selectedDates, dateKey].sort();
      return {
        ...current,
        selectedDates: selected,
        availability: current.availability.filter((slot) =>
          selected.includes(slot.date),
        ),
      };
    });
    setDatesContinued(false);
    setOpenTimeMenu(null);
    setError(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.selectedDates;
      delete next.availability;
      return next;
    });
  }

  function toggleTime(dateKey: string, time: string) {
    setForm((current) => {
      const existing = current.availability.find((slot) => slot.date === dateKey);
      if (!existing) {
        return {
          ...current,
          availability: [
            ...current.availability,
            { date: dateKey, times: [time] },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        };
      }

      const times = existing.times.includes(time)
        ? existing.times.filter((item) => item !== time)
        : [...existing.times, time].sort(
            (a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b),
          );

      return {
        ...current,
        availability: current.availability
          .map((slot) =>
            slot.date === dateKey ? { ...slot, times } : slot,
          )
          .filter((slot) => slot.times.length > 0),
      };
    });
    setError(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.availability;
      return next;
    });
  }

  function handleContinueDates() {
    if (form.selectedDates.length === 0) {
      setFieldErrors((current) => ({
        ...current,
        selectedDates: "Select at least one weekday date.",
      }));
      setError("Select available weekday dates, then continue.");
      return;
    }

    setForm((current) => ({
      ...current,
      availability: current.selectedDates.map((date) => {
        const existing = current.availability.find((slot) => slot.date === date);
        return existing ?? { date, times: [] };
      }),
    }));
    setDatesContinued(true);
    setError(null);
  }

  function handleContinueServices() {
    if (form.legalServices.length === 0) {
      setFieldErrors((current) => ({
        ...current,
        legalServices: "Select at least one legal service.",
      }));
      setError("Select the legal service(s) needed, then continue.");
      return;
    }

    setServicesContinued(true);
    setError(null);
  }

  function validateBeforeSubmit(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!form.dateOfBirth) nextErrors.dateOfBirth = "Date of birth is required.";

    if (!form.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!isValidEmail(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    const phoneDigits = parseUsPhone(form.phone);
    if (!form.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (!phoneDigits) {
      nextErrors.phone =
        "Enter a valid US phone number (10 digits). Non-US numbers are not accepted.";
    }

    if (!form.contactMethod) {
      nextErrors.contactMethod = "Select how you would like to be contacted.";
    }

    if (form.legalServices.length === 0) {
      nextErrors.legalServices = "Select at least one legal service.";
    }

    if (!servicesContinued) {
      nextErrors.legalServices =
        "Click Continue after selecting legal service(s).";
    }

    if (
      form.legalServices.includes("other") &&
      !form.otherLegalServiceDetails.trim()
    ) {
      nextErrors.otherLegalServiceDetails =
        "Describe the legal case type for “Other.”";
    }

    if (form.selectedDates.length === 0) {
      nextErrors.selectedDates = "Select at least one weekday date.";
    }

    if (!datesContinued) {
      nextErrors.selectedDates =
        "Click Continue after selecting available dates.";
    }

    const missingTimes = form.selectedDates.some((date) => {
      const slot = form.availability.find((item) => item.date === date);
      return !slot || slot.times.length === 0;
    });
    if (missingTimes) {
      nextErrors.availability =
        "Select one or more times for each available date.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Please complete the required fields before submitting.");
      return false;
    }

    return true;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateBeforeSubmit()) return;

    const phoneDigits = parseUsPhone(form.phone);
    if (!phoneDigits || !form.contactMethod) return;

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth,
      email: form.email.trim(),
      phone: formatUsPhoneDisplay(phoneDigits),
      contactMethod: form.contactMethod,
      legalServices: form.legalServices,
      otherLegalServiceDetails: form.legalServices.includes("other")
        ? form.otherLegalServiceDetails.trim()
        : undefined,
      availability: form.selectedDates.map((date) => ({
        date,
        times:
          form.availability.find((slot) => slot.date === date)?.times ?? [],
      })),
      additionalInfo: form.additionalInfo.trim() || undefined,
    };

    const details = formatConsultationDetails(payload);
    const fullName = `${payload.firstName} ${payload.lastName}`;
    const caseTypeSummary = payload.legalServices
      .map((id) => CONSULTATION_LEGAL_SERVICE_LABELS[id])
      .join(", ");
    const submittedAt = Date.now();

    if (shouldRouteConsultationToAttorney(payload.legalServices)) {
      const record = addConsultationRequestRecord(payload, "attorney");
      addMatterRequest({
        id: `${record.id}-${submittedAt}`,
        matterId: record.matterId,
        requestType: "Consultation request",
        subject: `Consultation — ${caseTypeSummary}`,
        details,
        requestedBy: fullName,
        assignedTo: getConsultationAssigneeLabel("attorney"),
        status: "pending",
        createdAt: record.createdAt.slice(0, 10),
      });
      addAttorneyConsultationRequestNotification({
        sentBy: fullName,
        caseTypes: caseTypeSummary,
        matterName: record.matterName,
        matterNumber: record.matterNumber,
      });
    }

    if (shouldRouteConsultationToParalegal(payload.legalServices)) {
      const record = addConsultationRequestRecord(payload, "paralegal");
      addMatterRequest({
        id: `${record.id}-${submittedAt + 1}`,
        matterId: record.matterId,
        requestType: "Consultation request",
        subject: "Consultation — Other",
        details,
        requestedBy: fullName,
        assignedTo: getConsultationAssigneeLabel("paralegal"),
        status: "pending",
        createdAt: record.createdAt.slice(0, 10),
      });
      addParalegalConsultationRequestNotification({
        sentBy: fullName,
        matterName: record.matterName,
        matterNumber: record.matterNumber,
      });
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Your consultation request has been received."
        />
        <Card className="mx-auto max-w-2xl border-gold-500/30">
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-navy-900">
              Thank you
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
              Thank you for requesting a consultation with CounselFlow. One of
              our attorneys or paralegals will review your information and reach
              out shortly using your preferred contact method.
            </p>
            <Button
              className="mt-6"
              variant="secondary"
              onClick={() => {
                setSubmitted(false);
                setForm(INITIAL_FORM);
                setDatesContinued(false);
                setServicesContinued(false);
                setOpenTimeMenu(null);
                setError(null);
                setFieldErrors({});
                setCalendarCursor({ year: 2026, month: 7 });
              }}
            >
              Submit another request
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Request a consultation with CounselFlow. Complete the intake form below."
      />

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Consultation request</CardTitle>
          <CardDescription>
            Please provide your contact information, the legal services you need,
            and the dates and times you are available.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-700">
              Contact information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                error={fieldErrors.firstName}
                required
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                error={fieldErrors.lastName}
                required
              />
            </div>
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => updateField("dateOfBirth", event.target.value)}
              error={fieldErrors.dateOfBirth}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email address"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                error={fieldErrors.email}
                required
              />
              <Input
                label="Phone number"
                type="tel"
                inputMode="tel"
                placeholder="(555) 123-4567"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                error={fieldErrors.phone}
                required
              />
            </div>
            <Select
              label="How would you like to be contacted"
              options={CONTACT_METHOD_OPTIONS}
              value={form.contactMethod}
              onChange={(event) =>
                updateField(
                  "contactMethod",
                  event.target.value as ConsultationContactMethod | "",
                )
              }
              error={fieldErrors.contactMethod}
              required
            />
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-700">
                  Legal service needed
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Select all case types that apply.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleContinueServices}
              >
                Continue
              </Button>
            </div>

            <div
              className={cn(
                "grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-gray-200 p-3 sm:grid-cols-2",
                fieldErrors.legalServices && "border-red-500",
              )}
            >
              {CONSULTATION_LEGAL_SERVICE_OPTIONS.map((option) => {
                const checked = form.legalServices.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-navy-900 hover:bg-surface",
                      checked && "bg-navy-900/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-700"
                      checked={checked}
                      onChange={() => toggleLegalService(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            {fieldErrors.legalServices && (
              <p className="text-xs text-red-600">{fieldErrors.legalServices}</p>
            )}

            {showOtherDetails && (
              <Textarea
                label="Please describe the legal case type"
                rows={4}
                value={form.otherLegalServiceDetails}
                onChange={(event) =>
                  updateField("otherLegalServiceDetails", event.target.value)
                }
                error={fieldErrors.otherLegalServiceDetails}
                placeholder="Provide details about the legal matter not listed above."
                required
              />
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-700">
                  Dates available
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Select weekday dates on the calendar. Weekends are unavailable.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleContinueDates}
              >
                Continue
              </Button>
            </div>

            <div
              className={cn(
                "rounded-xl border border-gray-200 p-4",
                fieldErrors.selectedDates && "border-red-500",
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Previous month"
                  disabled={
                    calendarCursor.year === 2026 && calendarCursor.month === 7
                  }
                  onClick={() =>
                    setCalendarCursor((current) => {
                      if (current.year === 2026 && current.month === 7) {
                        return current;
                      }
                      const date = new Date(current.year, current.month - 1, 1);
                      return {
                        year: date.getFullYear(),
                        month: date.getMonth(),
                      };
                    })
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-semibold text-navy-900">
                  {MONTH_FORMATTER.format(
                    new Date(calendarCursor.year, calendarCursor.month, 1),
                  )}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Next month"
                  onClick={() =>
                    setCalendarCursor((current) => {
                      const date = new Date(current.year, current.month + 1, 1);
                      return {
                        year: date.getFullYear(),
                        month: date.getMonth(),
                      };
                    })
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {monthCells.map((cell, index) => {
                  if (!cell) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const date = parseDateKey(cell.dateKey);
                  const weekend = isWeekend(date);
                  const selected = form.selectedDates.includes(cell.dateKey);

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      disabled={weekend}
                      onClick={() => toggleDate(cell.dateKey)}
                      className={cn(
                        "h-10 rounded-lg text-sm transition-colors",
                        weekend &&
                          "cursor-not-allowed text-gray-300 line-through",
                        !weekend &&
                          !selected &&
                          "text-navy-900 hover:bg-navy-900/5",
                        selected &&
                          "bg-navy-900 font-semibold text-white hover:bg-navy-800",
                      )}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {form.selectedDates.length > 0 && (
                <p className="mt-3 text-xs text-muted">
                  Selected:{" "}
                  {form.selectedDates
                    .map((date) => DATE_FORMATTER.format(parseDateKey(date)))
                    .join("; ")}
                </p>
              )}
            </div>
            {fieldErrors.selectedDates && (
              <p className="text-xs text-red-600">{fieldErrors.selectedDates}</p>
            )}

            {datesContinued && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-navy-900">
                    Times available
                  </h4>
                  <p className="mt-1 text-sm text-muted">
                    Choose one or more times for each selected date (8:00 AM –
                    6:00 PM, every 30 minutes).
                  </p>
                </div>

                {form.selectedDates.map((dateKey) => {
                  const selectedTimes =
                    form.availability.find((slot) => slot.date === dateKey)
                      ?.times ?? [];
                  const open = openTimeMenu === dateKey;

                  return (
                    <div
                      key={dateKey}
                      className="rounded-xl border border-gray-200 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-navy-900">
                          {DATE_FORMATTER.format(parseDateKey(dateKey))}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setOpenTimeMenu((current) =>
                              current === dateKey ? null : dateKey,
                            )
                          }
                        >
                          {selectedTimes.length > 0
                            ? `${selectedTimes.length} time${selectedTimes.length === 1 ? "" : "s"} selected`
                            : "Select times"}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      {selectedTimes.length > 0 && (
                        <p className="mt-2 text-xs text-muted">
                          {selectedTimes.join(", ")}
                        </p>
                      )}

                      {open && (
                        <div className="mt-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-100 bg-surface p-3 sm:grid-cols-3">
                          {TIME_SLOTS.map((time) => {
                            const checked = selectedTimes.includes(time);
                            return (
                              <label
                                key={time}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-navy-900 hover:bg-white",
                                  checked && "bg-white font-medium",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-navy-900 focus:ring-navy-700"
                                  checked={checked}
                                  onChange={() => toggleTime(dateKey, time)}
                                />
                                {time}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {fieldErrors.availability && (
                  <p className="text-xs text-red-600">
                    {fieldErrors.availability}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-700">
              Additional information
            </h3>
            <Textarea
              label="Anything else you would like us to know (optional)"
              rows={5}
              value={form.additionalInfo}
              onChange={(event) =>
                updateField("additionalInfo", event.target.value)
              }
              placeholder="Share any additional details that may help our team prepare for your consultation."
            />
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button type="submit">
              <Send className="h-4 w-4" />
              Submit consultation request
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

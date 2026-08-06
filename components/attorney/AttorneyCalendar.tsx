"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  ATTORNEY_CALENDAR_TYPE_LABELS,
  ATTORNEY_CALENDAR_TYPE_OPTIONS,
  ATTORNEY_CALENDAR_UPDATE_EVENT,
  addAttorneyCalendarEvent,
  confirmAttorneyCalendarEvent,
  declineAttorneyCalendarEvent,
  deleteAttorneyCalendarEvent,
  getAttorneyCalendarEventById,
  getAttorneyCalendarEvents,
  getConfirmedAttorneyCalendarEventIds,
  getDeclinedAttorneyCalendarEventIds,
  updateAttorneyCalendarEvent,
  type AttorneyCalendarEvent,
  type AttorneyCalendarEventType,
} from "@/lib/attorney/calendar-store";
import { PARALEGAL_ASSIGNED_MATTERS } from "@/lib/paralegal/demo-data";
import { addParalegalCalendarDecisionNotification } from "@/lib/paralegal/notifications-store";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type EventFormState = {
  id?: string;
  date: string;
  time: string;
  title: string;
  type: AttorneyCalendarEventType | "";
  matterName: string;
  location: string;
  description: string;
};

const EMPTY_FORM: EventFormState = {
  date: "",
  time: "",
  title: "",
  type: "",
  matterName: "",
  location: "",
  description: "",
};

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function badgeVariant(type: AttorneyCalendarEventType) {
  if (type === "trial" || type === "hearing" || type === "court_appearance") {
    return "danger" as const;
  }
  if (
    type === "filing_deadline" ||
    type === "discovery_deadline" ||
    type === "statute_deadline"
  ) {
    return "warning" as const;
  }
  if (type === "appointment" || type === "client_meeting" || type === "mediation") {
    return "gold" as const;
  }
  return "neutral" as const;
}

function eventDot(type: AttorneyCalendarEventType) {
  if (type === "trial" || type === "hearing" || type === "court_appearance") {
    return "bg-red-500";
  }
  if (
    type === "filing_deadline" ||
    type === "discovery_deadline" ||
    type === "statute_deadline"
  ) {
    return "bg-amber-500";
  }
  if (type === "appointment" || type === "client_meeting" || type === "mediation") {
    return "bg-gold-500";
  }
  if (type === "deposition") return "bg-purple-500";
  return "bg-navy-900";
}

function eventFromForm(
  form: EventFormState,
  actor: { role: "attorney" | "paralegal"; name: string },
  existingId?: string,
): AttorneyCalendarEvent | null {
  if (
    !form.date ||
    !form.time.trim() ||
    !form.title.trim() ||
    !form.type ||
    !form.matterName ||
    !form.location.trim() ||
    !form.description.trim()
  ) {
    return null;
  }

  return {
    id: existingId ?? `attorney-calendar-${Date.now()}`,
    date: form.date,
    time: form.time.trim(),
    title: form.title.trim(),
    type: form.type,
    matterName: form.matterName,
    location: form.location.trim(),
    description: form.description.trim(),
    addedBy: actor,
  };
}

export function AttorneyCalendar() {
  const { identity, selectedRole } = useDemoRole();
  const [events, setEvents] = useState<AttorneyCalendarEvent[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());
  const [visibleMonth, setVisibleMonth] = useState(new Date(2026, 7, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-08-07");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAttorneyRole =
    selectedRole === "attorney" || selectedRole === "managing_partner";
  const actorRole: "attorney" | "paralegal" =
    selectedRole === "paralegal" ? "paralegal" : "attorney";
  const canEditCalendar =
    selectedRole === "attorney" ||
    selectedRole === "paralegal" ||
    selectedRole === "managing_partner";

  const refresh = useCallback(() => {
    setEvents(getAttorneyCalendarEvents());
    setConfirmedIds(getConfirmedAttorneyCalendarEventIds());
    setDeclinedIds(getDeclinedAttorneyCalendarEventIds());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(ATTORNEY_CALENDAR_UPDATE_EVENT, refresh);
    return () =>
      window.removeEventListener(ATTORNEY_CALENDAR_UPDATE_EVENT, refresh);
  }, [refresh]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AttorneyCalendarEvent[]>();
    for (const event of events) {
      map.set(event.date, [...(map.get(event.date) ?? []), event]);
    }
    return map;
  }, [events]);

  const pendingParalegalIds = useMemo(
    () =>
      new Set(
        events
          .filter(
            (event) =>
              event.addedBy.role === "paralegal" &&
              !confirmedIds.has(event.id) &&
              !declinedIds.has(event.id),
          )
          .map((event) => event.id),
      ),
    [events, confirmedIds, declinedIds],
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const calendarCells: Array<{ day: number | null; dateKey: string | null }> =
    [];
  for (let index = 0; index < startWeekday; index += 1) {
    calendarCells.push({ day: null, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push({ day, dateKey: toDateKey(year, month, day) });
  }

  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];

  const matterOptions = [
    { value: "", label: "Select a matter" },
    ...PARALEGAL_ASSIGNED_MATTERS.map((matter) => ({
      value: matter.title,
      label: `${matter.title} · ${matter.matterNumber}`,
    })),
  ];

  function notifyParalegalDecision(
    id: string,
    decision: "approved" | "declined",
  ) {
    const event = getAttorneyCalendarEventById(id);
    if (!event || event.addedBy.role !== "paralegal") return;
    addParalegalCalendarDecisionNotification({
      decision,
      decidedBy: identity.fullName,
      eventTitle: event.title,
      eventDate: formatDate(event.date),
      matterName: event.matterName,
    });
  }

  function confirmEvent(id: string) {
    confirmAttorneyCalendarEvent(id);
    notifyParalegalDecision(id, "approved");
    refresh();
  }

  function declineEvent(id: string) {
    declineAttorneyCalendarEvent(id);
    notifyParalegalDecision(id, "declined");
    refresh();
  }

  function openCreateForm(dateKey?: string | null) {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      date: dateKey ?? selectedDate ?? toDateKey(year, month, 1),
      time: "9:00 AM",
      type: "appointment",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(event: AttorneyCalendarEvent) {
    setEditingId(event.id);
    setForm({
      id: event.id,
      date: event.date,
      time: event.time,
      title: event.title,
      type: event.type,
      matterName: event.matterName,
      location: event.location,
      description: event.description,
    });
    setFormError(null);
    setFormOpen(true);
  }

  function saveForm() {
    const event = eventFromForm(
      form,
      { role: actorRole, name: identity.fullName },
      editingId ?? undefined,
    );
    if (!event) {
      setFormError("Complete every field before saving this calendar date.");
      return;
    }

    if (editingId) {
      updateAttorneyCalendarEvent(event);
    } else {
      addAttorneyCalendarEvent(event);
    }

    setSelectedDate(event.date);
    setVisibleMonth(
      new Date(
        Number(event.date.slice(0, 4)),
        Number(event.date.slice(5, 7)) - 1,
        1,
      ),
    );
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    refresh();
  }

  function removeEvent(id: string) {
    deleteAttorneyCalendarEvent(id);
    refresh();
  }

  return (
    <div id="attorney-calendar" className="scroll-mt-20">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Attorney monthly calendar</CardTitle>
              <CardDescription>
                Important attorney dates — trials, hearings, appointments,
                depositions, mediations, filing and discovery deadlines, and
                client meetings. Paralegal-added dates stay highlighted until an
                attorney confirms them.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canEditCalendar && (
                <Button type="button" size="sm" onClick={() => openCreateForm()}>
                  <Plus className="h-4 w-4" />
                  Add date
                </Button>
              )}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
                <CalendarDays className="h-5 w-5" />
                {pendingParalegalIds.size > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-800 ring-2 ring-white">
                    {pendingParalegalIds.size}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <p className="text-sm font-semibold text-navy-900">{monthLabel}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Trial / hearing / court
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Filing / discovery / statute deadline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
            Appointment / meeting / mediation
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            Deposition
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900">
            Highlighted = paralegal date awaiting confirmation
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="py-2">
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, index) => {
            if (!cell.day || !cell.dateKey) {
              return (
                <div key={`empty-${index}`} className="min-h-16 rounded-lg" />
              );
            }

            const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
            const hasEvents = dayEvents.length > 0;
            const hasPendingParalegalEvent = dayEvents.some((event) =>
              pendingParalegalIds.has(event.id),
            );
            const isSelected = selectedDate === cell.dateKey;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => setSelectedDate(cell.dateKey)}
                onDoubleClick={() => {
                  if (canEditCalendar) openCreateForm(cell.dateKey);
                }}
                aria-label={`${formatDate(cell.dateKey)}${
                  hasEvents
                    ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`
                    : ""
                }${
                  hasPendingParalegalEvent
                    ? ", paralegal date awaiting confirmation"
                    : ""
                }`}
                className={cn(
                  "relative flex min-h-16 flex-col items-center rounded-lg border px-1 py-1.5 text-sm transition-colors",
                  hasEvents
                    ? "border-navy-700/25 bg-gray-50 font-semibold text-navy-900 hover:bg-gray-100"
                    : "border-transparent text-navy-900 hover:bg-gray-50",
                  hasPendingParalegalEvent &&
                    "border-amber-400 bg-amber-100 text-amber-950 shadow-sm hover:bg-amber-200",
                  isSelected && "ring-2 ring-navy-900 ring-offset-1",
                )}
              >
                <span>{cell.day}</span>
                {hasEvents && (
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {dayEvents.slice(0, 4).map((event) => (
                      <span
                        key={event.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          eventDot(event.type),
                        )}
                      />
                    ))}
                  </span>
                )}
                {hasPendingParalegalEvent && (
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wide">
                    Confirm
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-surface px-4 py-4">
          {selectedDate ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-navy-900">
                  {formatDate(selectedDate)}
                </p>
                {canEditCalendar && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openCreateForm(selectedDate)}
                  >
                    <Plus className="h-4 w-4" />
                    Add to this day
                  </Button>
                )}
              </div>
              {selectedEvents.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  No important attorney dates scheduled.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {selectedEvents.map((event) => {
                    const needsConfirmation = pendingParalegalIds.has(event.id);
                    const wasConfirmed =
                      event.addedBy.role === "paralegal" &&
                      confirmedIds.has(event.id);
                    const wasDeclined =
                      event.addedBy.role === "paralegal" &&
                      declinedIds.has(event.id);

                    return (
                      <li
                        key={event.id}
                        className={cn(
                          "rounded-xl border bg-white px-4 py-4",
                          needsConfirmation
                            ? "border-amber-400 bg-amber-50"
                            : wasDeclined
                              ? "border-red-200 bg-red-50/40"
                              : "border-gray-200",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-navy-900">
                                {event.title}
                              </p>
                              <Badge variant={badgeVariant(event.type)}>
                                {ATTORNEY_CALENDAR_TYPE_LABELS[event.type]}
                              </Badge>
                              {needsConfirmation && (
                                <Badge variant="warning">
                                  Needs confirmation
                                </Badge>
                              )}
                              {wasConfirmed && (
                                <Badge variant="success">Confirmed</Badge>
                              )}
                              {wasDeclined && (
                                <Badge variant="danger">Declined</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-navy-900">
                              {event.matterName}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {needsConfirmation && isAttorneyRole && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => confirmEvent(event.id)}
                                >
                                  <Check className="h-4 w-4" />
                                  Confirm
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => declineEvent(event.id)}
                                >
                                  <X className="h-4 w-4" />
                                  Decline
                                </Button>
                              </>
                            )}
                            {canEditCalendar && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditForm(event)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-700"
                                  onClick={() => removeEvent(event.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {event.time}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5" />
                            Added by {event.addedBy.name} ({event.addedBy.role})
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-navy-900">
                          {event.description}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">
              Select a date to view scheduled events.
            </p>
          )}
        </div>
      </Card>

      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
          setFormError(null);
        }}
        title={editingId ? "Edit calendar date" : "Add calendar date"}
        description="Add or update an important attorney date on the monthly calendar."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => {
                setForm((current) => ({ ...current, date: event.target.value }));
                setFormError(null);
              }}
            />
            <Input
              label="Time"
              value={form.time}
              placeholder="9:00 AM"
              onChange={(event) => {
                setForm((current) => ({ ...current, time: event.target.value }));
                setFormError(null);
              }}
            />
          </div>
          <Input
            label="Title"
            value={form.title}
            placeholder="Status conference"
            onChange={(event) => {
              setForm((current) => ({ ...current, title: event.target.value }));
              setFormError(null);
            }}
          />
          <Select
            label="Date type"
            options={[
              { value: "", label: "Select a date type" },
              ...ATTORNEY_CALENDAR_TYPE_OPTIONS,
            ]}
            value={form.type}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                type: event.target.value as AttorneyCalendarEventType | "",
              }));
              setFormError(null);
            }}
          />
          <Select
            label="Matter"
            options={matterOptions}
            value={form.matterName}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                matterName: event.target.value,
              }));
              setFormError(null);
            }}
          />
          <Input
            label="Location"
            value={form.location}
            placeholder="Courthouse, conference room, or video link"
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                location: event.target.value,
              }));
              setFormError(null);
            }}
          />
          <Textarea
            label="Description"
            value={form.description}
            placeholder="What needs to happen on this date?"
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }));
              setFormError(null);
            }}
          />
          {actorRole === "paralegal" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Dates you add or edit stay highlighted on the attorney calendar
              until the attorney confirms them.
            </p>
          )}
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveForm}>
              {editingId ? "Save changes" : "Add to calendar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

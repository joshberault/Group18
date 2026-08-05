"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ATTORNEY_CALENDAR_TYPE_LABELS,
  ATTORNEY_CALENDAR_UPDATE_EVENT,
  confirmAttorneyCalendarEvent,
  getAttorneyCalendarEvents,
  getConfirmedAttorneyCalendarEventIds,
  type AttorneyCalendarEvent,
  type AttorneyCalendarEventType,
} from "@/lib/attorney/calendar-store";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  if (type === "trial" || type === "hearing") return "danger" as const;
  if (type === "filing_deadline") return "warning" as const;
  if (type === "appointment" || type === "client_meeting") return "gold" as const;
  return "neutral" as const;
}

function eventDot(type: AttorneyCalendarEventType) {
  if (type === "trial" || type === "hearing") return "bg-red-500";
  if (type === "filing_deadline") return "bg-amber-500";
  if (type === "appointment" || type === "client_meeting") return "bg-gold-500";
  if (type === "deposition") return "bg-purple-500";
  return "bg-navy-900";
}

export function AttorneyCalendar() {
  const [events, setEvents] = useState<AttorneyCalendarEvent[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [visibleMonth, setVisibleMonth] = useState(new Date(2026, 7, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>("2026-08-07");

  const refresh = useCallback(() => {
    setEvents(getAttorneyCalendarEvents());
    setConfirmedIds(getConfirmedAttorneyCalendarEventIds());
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
              event.addedBy.role === "paralegal" && !confirmedIds.has(event.id),
          )
          .map((event) => event.id),
      ),
    [events, confirmedIds],
  );

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const calendarCells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let index = 0; index < startWeekday; index += 1) {
    calendarCells.push({ day: null, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push({ day, dateKey: toDateKey(year, month, day) });
  }

  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];

  function confirmEvent(id: string) {
    confirmAttorneyCalendarEvent(id);
    setConfirmedIds((current) => new Set([...current, id]));
  }

  return (
    <div id="attorney-calendar" className="scroll-mt-20">
      <Card className="mt-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Attorney calendar</CardTitle>
            <CardDescription>
              Trials, hearings, appointments, deadlines, depositions, and client
              meetings. Dates added by a paralegal remain highlighted until you
              confirm them.
            </CardDescription>
          </div>
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
            <CalendarDays className="h-5 w-5" />
            {pendingParalegalIds.size > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-800 ring-2 ring-white">
                {pendingParalegalIds.size}
              </span>
            )}
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
          Trial / hearing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Filing deadline
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
          Appointment / client meeting
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
            return <div key={`empty-${index}`} className="min-h-16 rounded-lg" />;
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
              aria-label={`${formatDate(cell.dateKey)}${
                hasEvents ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""
              }${hasPendingParalegalEvent ? ", paralegal date awaiting confirmation" : ""}`}
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
            <p className="text-sm font-semibold text-navy-900">
              {formatDate(selectedDate)}
            </p>
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

                  return (
                    <li
                      key={event.id}
                      className={cn(
                        "rounded-xl border bg-white px-4 py-4",
                        needsConfirmation
                          ? "border-amber-400 bg-amber-50"
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
                              <Badge variant="warning">Needs confirmation</Badge>
                            )}
                            {wasConfirmed && (
                              <Badge variant="success">Confirmed</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-navy-900">
                            {event.matterName}
                          </p>
                        </div>
                        {needsConfirmation && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => confirmEvent(event.id)}
                          >
                            <Check className="h-4 w-4" />
                            Confirm
                          </Button>
                        )}
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
    </div>
  );
}

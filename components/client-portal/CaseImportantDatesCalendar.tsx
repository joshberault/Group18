"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  IMPORTANT_DATE_TYPE_LABELS,
  importantCaseDates,
  type ImportantCaseDate,
  type ImportantDateType,
} from "@/lib/mock-data/client-portal";
import { cn } from "@/lib/utils/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function typeBadgeVariant(type: ImportantDateType) {
  if (type === "court_date") return "danger" as const;
  if (type === "appointment") return "gold" as const;
  return "default" as const;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatSelectedDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function CaseImportantDatesCalendar() {
  const initialDate = importantCaseDates[0]
    ? new Date(`${importantCaseDates[0].date}T12:00:00`)
    : new Date(2026, 7, 1);

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(
    importantCaseDates[0]?.date ?? null,
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ImportantCaseDate[]>();
    for (const event of importantCaseDates) {
      const existing = map.get(event.date) ?? [];
      existing.push(event);
      map.set(event.date, existing);
    }
    return map;
  }, []);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  const selectedEvents = selectedDate
    ? (eventsByDate.get(selectedDate) ?? [])
    : [];

  const calendarCells: Array<{ day: number | null; dateKey: string | null }> =
    [];

  for (let i = 0; i < startWeekday; i += 1) {
    calendarCells.push({ day: null, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push({
      day,
      dateKey: toDateKey(year, month, day),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Important dates</CardTitle>
            <CardDescription>
              Appointments, court dates, and meetings. Click a highlighted date
              to view details.
            </CardDescription>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setVisibleMonth(new Date(year, month - 1, 1))
          }
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
          onClick={() =>
            setVisibleMonth(new Date(year, month + 1, 1))
          }
          aria-label="Next month"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-500" /> Appointment
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Court date
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-navy-900" /> Meeting
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
            return <div key={`empty-${index}`} className="min-h-14 rounded-lg" />;
          }

          const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === cell.dateKey;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => setSelectedDate(cell.dateKey)}
              className={cn(
                "relative flex min-h-14 flex-col items-center rounded-lg border px-1 py-1.5 text-sm transition-colors",
                hasEvents
                  ? "border-navy-700/30 bg-gold-100/50 font-semibold text-navy-900 hover:bg-gold-100"
                  : "border-transparent text-navy-900 hover:bg-gray-50",
                isSelected && "ring-2 ring-navy-900 ring-offset-1",
              )}
            >
              <span>{cell.day}</span>
              {hasEvents && (
                <span className="mt-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        event.type === "appointment" && "bg-gold-500",
                        event.type === "court_date" && "bg-red-500",
                        event.type === "meeting" && "bg-navy-900",
                      )}
                    />
                  ))}
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
              {formatSelectedDate(selectedDate)}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No appointments, court dates, or meetings on this date.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {selectedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-navy-900">
                        {event.title}
                      </p>
                      <Badge variant={typeBadgeVariant(event.type)}>
                        {IMPORTANT_DATE_TYPE_LABELS[event.type]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {event.time} · {event.location}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Case {event.caseNumber} — {event.caseTitle}
                    </p>
                    <p className="mt-2 text-sm text-navy-900">
                      {event.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            Select a highlighted date to see what is scheduled.
          </p>
        )}
      </div>
    </Card>
  );
}

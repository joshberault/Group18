"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { CLIENT_SCHEDULE_TYPE_LABELS } from "@/lib/clients/schedule-demo-data";
import type { ClientScheduleEvent } from "@/lib/clients/types";
import { cn } from "@/lib/utils/cn";

interface ClientScheduleCalendarProps {
  events: ClientScheduleEvent[];
  roleLabel: string;
  month: Date;
  onMonthChange: (month: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function typeBadgeVariant(type: string) {
  if (type === "conflict_review") return "warning" as const;
  if (type === "follow_up" || type === "intake") return "gold" as const;
  if (type === "engagement") return "default" as const;
  if (type === "billing") return "neutral" as const;
  return "neutral" as const;
}

function eventDot(type: string) {
  if (type === "conflict_review") return "bg-amber-500";
  if (type === "follow_up" || type === "intake") return "bg-gold-500";
  if (type === "engagement") return "bg-navy-900";
  if (type === "billing") return "bg-purple-500";
  return "bg-gray-400";
}

function eventChipClass(type: string) {
  if (type === "conflict_review") {
    return "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100";
  }
  if (type === "follow_up" || type === "intake") {
    return "border-gold-200 bg-gold-50 text-navy-900 hover:bg-gold-100";
  }
  if (type === "engagement") {
    return "border-navy-200 bg-navy-50 text-navy-900 hover:bg-navy-100";
  }
  if (type === "billing") {
    return "border-purple-200 bg-purple-50 text-purple-950 hover:bg-purple-100";
  }
  return "border-gray-200 bg-white text-navy-800 hover:bg-gray-50";
}

export function ClientScheduleCalendar({
  events,
  roleLabel,
  month,
  onMonthChange,
}: ClientScheduleCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const todayKey = toDateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ClientScheduleEvent[]>();
    for (const event of events) {
      const list = map.get(event.event_date) ?? [];
      list.push(event);
      map.set(event.event_date, list);
    }
    return map;
  }, [events]);

  useEffect(() => {
    const inMonth = events.filter((event) => {
      const d = new Date(`${event.event_date}T00:00:00`);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });
    if (inMonth.length === 0) {
      setSelectedDate(null);
      return;
    }
    if (!selectedDate || !eventsByDate.has(selectedDate)) {
      setSelectedDate(inMonth[0].event_date);
    }
  }, [events, eventsByDate, monthIndex, selectedDate, year]);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = new Date(year, monthIndex, 1).getDay();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(month);

  const calendarCells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < startWeekday; i += 1) {
    calendarCells.push({ day: null, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push({ day, dateKey: toDateKey(year, monthIndex, day) });
  }

  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) ?? []) : [];
  const monthEventCount = events.filter((event) => {
    const d = new Date(`${event.event_date}T00:00:00`);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  }).length;

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      const d = new Date(`${event.event_date}T00:00:00`);
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) continue;
      counts.set(event.event_type, (counts.get(event.event_type) ?? 0) + 1);
    }
    return counts;
  }, [events, monthIndex, year]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Client schedule</CardTitle>
              <CardDescription>
                Follow-ups, conflict reviews, and engagement dates for the {roleLabel} view.
              </CardDescription>
              <p className="mt-2 text-xs font-medium text-navy-700">
                {monthEventCount} scheduled item{monthEventCount === 1 ? "" : "s"} this month
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(typeCounts.entries()).map(([type, count]) => (
              <Badge key={type} variant={typeBadgeVariant(type)}>
                {count} {CLIENT_SCHEDULE_TYPE_LABELS[type] ?? type}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <div className="mb-4 flex items-center justify-between gap-3 px-6">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <p className="text-sm font-semibold text-navy-900">{monthLabel}</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          aria-label="Next month"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 px-6 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
          Follow-up / intake
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Conflict review
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-navy-900" />
          Engagement
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          Billing
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 px-6 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="py-2">
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-6 pb-6">
        {calendarCells.map((cell, index) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${index}`} className="min-h-16 rounded-lg" />;
          }

          const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === cell.dateKey;
          const isToday = cell.dateKey === todayKey;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => setSelectedDate(cell.dateKey)}
              aria-label={`${formatSelectedDate(cell.dateKey)}${
                hasEvents
                  ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`
                  : ""
              }`}
              className={cn(
                "relative flex min-h-16 flex-col items-center rounded-lg border px-1 py-1.5 text-sm transition-colors",
                hasEvents
                  ? "border-navy-700/25 bg-gray-50 font-semibold text-navy-900 hover:bg-gray-100"
                  : "border-transparent text-navy-900 hover:bg-gray-50",
                isToday && "ring-1 ring-gold-500 ring-offset-1",
                isSelected && "ring-2 ring-navy-900 ring-offset-1",
              )}
            >
              <span>{cell.day}</span>
              {hasEvents && (
                <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {dayEvents.slice(0, 4).map((event) => (
                    <span
                      key={event.id}
                      className={cn("h-1.5 w-1.5 rounded-full", eventDot(event.event_type))}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-6 py-4">
        {selectedDate && selectedEvents.length > 0 ? (
          <>
            <p className="text-sm font-semibold text-navy-900">
              {formatSelectedDate(selectedDate)}
            </p>
            <ul className="mt-3 space-y-3">
              {selectedEvents.map((event) => (
                <li
                  key={event.id}
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    eventChipClass(event.event_type),
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold">{event.title}</p>
                    <Badge variant={typeBadgeVariant(event.event_type)}>
                      {CLIENT_SCHEDULE_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </Badge>
                  </div>
                  {event.client && (
                    <p className="mt-1 text-xs opacity-80">
                      Client #{event.client.client_number} · {event.client.name}
                    </p>
                  )}
                  {event.notes && (
                    <p className="mt-2 text-xs leading-5 opacity-90">{event.notes}</p>
                  )}
                  <Link
                    href={`/clients/${event.client_id}`}
                    className="mt-2 inline-block text-xs font-semibold underline-offset-2 hover:underline"
                  >
                    Open client record
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center">
            <p className="text-sm font-medium text-navy-900">No scheduled client items this month</p>
            <p className="mt-1 text-xs text-muted">
              Follow-ups and conflict reviews will appear here when scheduled.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

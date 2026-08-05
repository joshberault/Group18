"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { daysInMonth, monthLabel, todayIsoDate } from "@/lib/attorney/dates";
import { formatDate } from "@/lib/attorney/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  type: "task" | "deadline";
};

function parseIsoDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function CalendarPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks, deadlines } = useAttorneyData();
  const today = new Date(`${todayIsoDate()}T00:00:00`);

  const dateParam = searchParams.get("date");
  const initialSelectedDate = parseIsoDate(dateParam);
  const [viewDate, setViewDate] = useState(initialSelectedDate ?? today);
  const [selectedDate, setSelectedDate] = useState<string | null>(dateParam);

  useEffect(() => {
    const parsed = parseIsoDate(dateParam);
    if (parsed) {
      setViewDate(parsed);
      setSelectedDate(dateParam);
    }
  }, [dateParam]);

  const events = useMemo<CalendarEvent[]>(() => {
    const taskEvents = tasks
      .filter((t) => t.due_date && t.status !== "completed")
      .map((t) => ({
        id: t.id,
        date: t.due_date!,
        title: t.title,
        type: "task" as const,
      }));
    const deadlineEvents = deadlines.map((d) => ({
      id: d.id,
      date: d.due_date,
      title: d.title,
      type: "deadline" as const,
    }));
    return [...taskEvents, ...deadlineEvents];
  }, [tasks, deadlines]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const eventsByDay = events
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      acc[event.date] = acc[event.date] ? [...acc[event.date], event] : [event];
      return acc;
    }, {});

  const selectedDayEvents = selectedDate
    ? events.filter((event) => event.date === selectedDate)
    : [];

  function selectDate(iso: string) {
    setSelectedDate(iso);
    router.replace(`/attorney/calendar?date=${iso}`, { scroll: false });
  }

  function shiftMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function eventHref(event: CalendarEvent) {
    return event.type === "deadline"
      ? `/attorney/deadlines/${event.id}`
      : `/attorney/tasks/${event.id}`;
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Tasks and deadlines across your assigned matters."
      />

      <Card padding="md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">{monthLabel(viewDate)}</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => shiftMonth(-1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setViewDate(today);
                selectDate(todayIsoDate());
              }}
            >
              Today
            </Button>
            <Button size="sm" variant="secondary" onClick={() => shiftMonth(1)}>
              Next
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} />;
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsByDay[iso] ?? [];
            const isToday = iso === todayIsoDate();
            const isSelected = iso === selectedDate;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => selectDate(iso)}
                className={`min-h-24 rounded-lg border p-2 text-left transition hover:border-navy-300 ${
                  isSelected
                    ? "border-navy-700 bg-navy-50 ring-2 ring-navy-700/20"
                    : isToday
                      ? "border-gold-500 bg-gold-100/30"
                      : "border-gray-200"
                }`}
              >
                <p className="text-sm font-medium text-navy-900">{day}</p>
                <ul className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <li
                      key={event.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] ${
                        event.type === "deadline"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                      title={event.title}
                    >
                      {event.title}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDate && (
        <Card padding="md">
          <h2 className="mb-4 text-lg font-semibold text-navy-900">
            {formatDate(selectedDate)}
          </h2>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted">No tasks or deadlines on this date.</p>
          ) : (
            <ul className="space-y-3">
              {selectedDayEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={eventHref(event)}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-2 -mx-2 transition hover:bg-gray-50"
                  >
                    <span className="font-medium text-navy-900">{event.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                        event.type === "deadline"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {event.type === "deadline" ? "Deadline" : "Task"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

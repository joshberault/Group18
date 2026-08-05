"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ClientScheduleEvent } from "@/lib/clients/types";

interface ClientScheduleCalendarProps {
  events: ClientScheduleEvent[];
  roleLabel: string;
  month: Date;
  onMonthChange: (month: Date) => void;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function ClientScheduleCalendar({
  events,
  roleLabel,
  month,
  onMonthChange,
}: ClientScheduleCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = new Date(year, monthIndex, 1).getDay();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, ClientScheduleEvent[]>();
    for (const event of events) {
      const d = new Date(event.event_date + "T00:00:00");
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) {
        continue;
      }
      const day = d.getDate();
      const list = map.get(day) ?? [];
      list.push(event);
      map.set(day, list);
    }
    return map;
  }, [events, year, monthIndex]);

  const cells: Array<number | null> = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Monthly client schedule</CardTitle>
            <CardDescription>
              Follow-ups and conflict reviews for the {roleLabel} demo view.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium text-navy-900">
              {monthLabel(new Date(year, monthIndex, 1))}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="min-h-24 rounded-lg bg-transparent" />;
          }
          const dayEvents = eventsByDay.get(day) ?? [];
          return (
            <div
              key={day}
              className="min-h-24 rounded-lg border border-gray-100 bg-gray-50/60 p-1.5 text-left"
            >
              <div className="text-xs font-semibold text-navy-900">{day}</div>
              <ul className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/clients/${event.client_id}`}
                      className="block truncate rounded bg-white px-1 py-0.5 text-[10px] text-navy-800 ring-1 ring-gray-200 hover:bg-gold-100"
                      title={event.title}
                    >
                      {event.title}
                    </Link>
                  </li>
                ))}
                {dayEvents.length > 2 && (
                  <li className="text-[10px] text-muted">+{dayEvents.length - 2} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

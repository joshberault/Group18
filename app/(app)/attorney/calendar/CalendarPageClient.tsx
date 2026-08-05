"use client";

import { useMemo, useState } from "react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { daysInMonth, monthLabel, todayIsoDate } from "@/lib/attorney/dates";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  type: "task" | "deadline";
};

export function CalendarPageClient() {
  const { tasks, deadlines } = useAttorneyData();
  const today = new Date(`${todayIsoDate()}T00:00:00`);
  const [viewDate, setViewDate] = useState(today);

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

  function shiftMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
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
            <Button size="sm" variant="secondary" onClick={() => setViewDate(today)}>
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

            return (
              <div
                key={iso}
                className={`min-h-24 rounded-lg border p-2 text-left ${
                  isToday ? "border-gold-500 bg-gold-100/30" : "border-gray-200"
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
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

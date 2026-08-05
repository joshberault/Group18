"use client";

import { useMemo } from "react";
import { useAttorneyData } from "@/components/attorney/AttorneyDataProvider";
import { formatDate } from "@/lib/attorney/format";
import { Card } from "@/components/ui/Card";

type TimelineItem = {
  id: string;
  date: string;
  label: string;
  detail: string;
  kind: "time" | "task" | "deadline" | "note";
};

export function MatterTimeline({ matterId }: { matterId: string }) {
  const { timeEntries, tasks, deadlines, notes } = useAttorneyData();

  const items = useMemo(() => {
    const list: TimelineItem[] = [
      ...timeEntries
        .filter((e) => e.matter_id === matterId)
        .map((e) => ({
          id: e.id,
          date: e.entry_date,
          label: `${e.hours}h logged`,
          detail: e.description,
          kind: "time" as const,
        })),
      ...tasks
        .filter((t) => t.matter_id === matterId)
        .map((t) => ({
          id: t.id,
          date: t.due_date ?? "9999-12-31",
          label: `Task: ${t.title}`,
          detail: t.description ?? t.status,
          kind: "task" as const,
        })),
      ...deadlines
        .filter((d) => d.matter_id === matterId)
        .map((d) => ({
          id: d.id,
          date: d.due_date,
          label: `Deadline: ${d.title}`,
          detail: d.description ?? "Filing deadline",
          kind: "deadline" as const,
        })),
      ...notes
        .filter((n) => n.matter_id === matterId)
        .map((n) => ({
          id: n.id,
          date: n.created_at.slice(0, 10),
          label: "Case note added",
          detail: n.note_text,
          kind: "note" as const,
        })),
    ];

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [timeEntries, tasks, deadlines, notes, matterId]);

  if (items.length === 0) {
    return <p className="text-sm text-muted">No timeline activity yet for this matter.</p>;
  }

  return (
    <ol className="space-y-4 border-l-2 border-gold-500/40 pl-4">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full bg-gold-500" />
          <Card padding="md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-navy-900">{item.label}</p>
              <span className="text-xs uppercase tracking-wide text-muted">{item.kind}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{formatDate(item.date)}</p>
            <p className="mt-2 text-sm text-muted">{item.detail}</p>
          </Card>
        </li>
      ))}
    </ol>
  );
}

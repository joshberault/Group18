import type { ClientScheduleEvent, FirmClient } from "@/lib/clients/types";

export const CLIENT_SCHEDULE_TYPE_LABELS: Record<string, string> = {
  follow_up: "Client follow-up",
  conflict_review: "Conflict review",
  engagement: "Engagement check-in",
  intake: "Intake meeting",
  billing: "Billing reminder",
};

const DEMO_TITLES: Array<{
  type: string;
  title: (client: FirmClient) => string;
  notes: string;
}> = [
  {
    type: "follow_up",
    title: (c) => `Follow-up call — ${c.name}`,
    notes: "Confirm contact details and next steps on open matters.",
  },
  {
    type: "conflict_review",
    title: (c) => `Conflict check review — ${c.name}`,
    notes: "Review new party information before additional work begins.",
  },
  {
    type: "engagement",
    title: (c) => `Engagement letter follow-up — ${c.name}`,
    notes: "Verify signed engagement is on file or send reminder.",
  },
  {
    type: "intake",
    title: (c) => `Intake meeting — ${c.name}`,
    notes: "Initial client intake or matter kickoff.",
  },
  {
    type: "billing",
    title: (c) => `Billing check-in — ${c.name}`,
    notes: "Review retainer balance and upcoming invoice timing.",
  },
];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Demo schedule events when Supabase has none — keeps the clients calendar useful in demo mode. */
export function getDemoClientScheduleEvents(
  month: Date,
  clients: FirmClient[],
): ClientScheduleEvent[] {
  if (clients.length === 0) return [];

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const anchorDays = [3, 7, 12, 18, 22, 27].filter((d) => d <= daysInMonth);

  const events: ClientScheduleEvent[] = [];

  anchorDays.forEach((day, index) => {
    const client = clients[index % clients.length];
    const template = DEMO_TITLES[index % DEMO_TITLES.length];
    events.push({
      id: `demo-schedule-${year}-${monthIndex + 1}-${day}-${client.id}`,
      client_id: client.id,
      title: template.title(client),
      event_date: toDateKey(year, monthIndex, day),
      event_type: template.type,
      notes: template.notes,
      created_at: new Date().toISOString(),
      client: {
        id: client.id,
        name: client.name,
        client_number: client.client_number,
      },
    });
  });

  return events;
}

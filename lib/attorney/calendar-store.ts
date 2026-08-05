export const ATTORNEY_CALENDAR_STORAGE_KEY = "counselflow-attorney-calendar-events";
export const ATTORNEY_CALENDAR_CONFIRMED_KEY =
  "counselflow-attorney-calendar-confirmed";
export const ATTORNEY_CALENDAR_UPDATE_EVENT = "attorney-calendar-updated";

export type AttorneyCalendarEventType =
  | "trial"
  | "hearing"
  | "appointment"
  | "filing_deadline"
  | "deposition"
  | "client_meeting"
  | "internal_review";

export type AttorneyCalendarEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: AttorneyCalendarEventType;
  matterName: string;
  location: string;
  description: string;
  addedBy: {
    role: "attorney" | "paralegal";
    name: string;
  };
};

export const ATTORNEY_CALENDAR_TYPE_LABELS: Record<
  AttorneyCalendarEventType,
  string
> = {
  trial: "Trial",
  hearing: "Hearing",
  appointment: "Appointment",
  filing_deadline: "Filing deadline",
  deposition: "Deposition",
  client_meeting: "Client meeting",
  internal_review: "Internal review",
};

const SEED_EVENTS: AttorneyCalendarEvent[] = [
  {
    id: "attorney-calendar-1",
    date: "2026-08-07",
    time: "9:00 AM",
    title: "Status conference",
    type: "hearing",
    matterName: "Santos Wrongful Termination",
    location: "Lafayette County Courthouse · Courtroom 2",
    description: "Appear for the status conference and address the discovery schedule.",
    addedBy: { role: "paralegal", name: "Parker Legal" },
  },
  {
    id: "attorney-calendar-2",
    date: "2026-08-10",
    time: "5:00 PM",
    title: "Answer filing deadline",
    type: "filing_deadline",
    matterName: "Chen v. Apex Supply Dispute",
    location: "Mississippi Electronic Courts",
    description: "File the finalized answer and confirm acceptance by the clerk.",
    addedBy: { role: "paralegal", name: "Parker Legal" },
  },
  {
    id: "attorney-calendar-3",
    date: "2026-08-13",
    time: "2:30 PM",
    title: "Client strategy appointment",
    type: "appointment",
    matterName: "Hale Contract Review",
    location: "Conference Room B",
    description: "Review contract revisions and obtain client direction on open terms.",
    addedBy: { role: "attorney", name: "George Giddens" },
  },
  {
    id: "attorney-calendar-4",
    date: "2026-08-18",
    time: "10:00 AM",
    title: "Corporate representative deposition",
    type: "deposition",
    matterName: "Chen v. Apex Supply Dispute",
    location: "North & Vale LLP · Deposition Suite",
    description: "Take the Apex Supply corporate representative deposition.",
    addedBy: { role: "paralegal", name: "Parker Legal" },
  },
  {
    id: "attorney-calendar-5",
    date: "2026-08-21",
    time: "11:00 AM",
    title: "Settlement authority meeting",
    type: "client_meeting",
    matterName: "Santos Wrongful Termination",
    location: "Secure video conference",
    description: "Confirm settlement parameters with the client before mediation.",
    addedBy: { role: "attorney", name: "George Giddens" },
  },
  {
    id: "attorney-calendar-6",
    date: "2026-08-25",
    time: "9:00 AM",
    title: "Trial begins",
    type: "trial",
    matterName: "Chen v. Apex Supply Dispute",
    location: "Lafayette County Courthouse · Courtroom 1",
    description: "First day of the jury trial. Arrive by 8:15 AM for final preparation.",
    addedBy: { role: "paralegal", name: "Parker Legal" },
  },
  {
    id: "attorney-calendar-7",
    date: "2026-08-28",
    time: "3:00 PM",
    title: "Demand package review",
    type: "internal_review",
    matterName: "Santos Wrongful Termination",
    location: "Attorney Hub review inbox",
    description: "Review the revised demand package before client approval.",
    addedBy: { role: "paralegal", name: "Parker Legal" },
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getAttorneyCalendarEvents(): AttorneyCalendarEvent[] {
  const dynamic = readJson<AttorneyCalendarEvent[]>(
    ATTORNEY_CALENDAR_STORAGE_KEY,
    [],
  );
  const events = new Map(SEED_EVENTS.map((event) => [event.id, event]));
  for (const event of dynamic) events.set(event.id, event);
  return [...events.values()].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
}

export function addAttorneyCalendarEvent(event: AttorneyCalendarEvent) {
  if (typeof window === "undefined") return;
  const dynamic = readJson<AttorneyCalendarEvent[]>(
    ATTORNEY_CALENDAR_STORAGE_KEY,
    [],
  );
  const next = [event, ...dynamic.filter((item) => item.id !== event.id)];
  window.localStorage.setItem(
    ATTORNEY_CALENDAR_STORAGE_KEY,
    JSON.stringify(next),
  );
  window.dispatchEvent(new CustomEvent(ATTORNEY_CALENDAR_UPDATE_EVENT));
}

export function getConfirmedAttorneyCalendarEventIds(): Set<string> {
  return new Set(
    readJson<string[]>(ATTORNEY_CALENDAR_CONFIRMED_KEY, []),
  );
}

export function confirmAttorneyCalendarEvent(id: string) {
  if (typeof window === "undefined") return;
  const confirmed = getConfirmedAttorneyCalendarEventIds();
  confirmed.add(id);
  window.localStorage.setItem(
    ATTORNEY_CALENDAR_CONFIRMED_KEY,
    JSON.stringify([...confirmed]),
  );
  window.dispatchEvent(new CustomEvent(ATTORNEY_CALENDAR_UPDATE_EVENT));
}

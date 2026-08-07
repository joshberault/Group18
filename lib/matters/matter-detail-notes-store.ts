export const MATTER_DETAIL_NOTES_UPDATE_EVENT = "matter-detail-notes-updated";

const STORAGE_KEY = "counselflow-matter-detail-notes-v1";

export type MatterCaseNote = {
  id: string;
  matterId: string;
  author: string;
  body: string;
  createdAt: string;
};

function readAll(): MatterCaseNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatterCaseNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(notes: MatterCaseNote[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event(MATTER_DETAIL_NOTES_UPDATE_EVENT));
}

function defaultNotesForMatter(
  matterId: string,
  attorneyName: string | null,
): MatterCaseNote[] {
  const author = attorneyName ?? "Avery Counsel";
  return [
    {
      id: `mdn-${matterId}-1`,
      matterId,
      author,
      body: "Initial client intake completed. Key documents uploaded to the shared matter folder.",
      createdAt: "2026-08-01T14:30:00.000Z",
    },
    {
      id: `mdn-${matterId}-2`,
      matterId,
      author: "Parker Legal",
      body: "Paralegal review: discovery index drafted and pending attorney sign-off.",
      createdAt: "2026-08-04T16:10:00.000Z",
    },
  ];
}

export function ensureMatterCaseNotes(
  matterId: string,
  attorneyName: string | null,
): MatterCaseNote[] {
  const all = readAll();
  const existing = all.filter((note) => note.matterId === matterId);
  if (existing.length > 0) return existing;

  const seeded = defaultNotesForMatter(matterId, attorneyName);
  writeAll([...all, ...seeded]);
  return seeded;
}

export function getMatterCaseNotes(matterId: string): MatterCaseNote[] {
  return readAll()
    .filter((note) => note.matterId === matterId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function addMatterCaseNote(input: {
  matterId: string;
  author: string;
  body: string;
}): MatterCaseNote {
  const note: MatterCaseNote = {
    id: `mdn-${input.matterId}-${Date.now()}`,
    matterId: input.matterId,
    author: input.author,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  };
  writeAll([note, ...readAll()]);
  return note;
}

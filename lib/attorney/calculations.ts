import type { DemoAttorney, Matter, TimeEntry } from "@/types/database";

export type MatterHoursSummary = {
  matterId: string;
  matterTitle: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
};

export type AttorneyHoursSummary = {
  attorneyId: string;
  attorneyName: string;
  totalHours: number;
  billableHours: number;
};

export function hoursByMatter(
  entries: TimeEntry[],
  matters: Matter[],
): MatterHoursSummary[] {
  const matterTitles = new Map(matters.map((m) => [m.id, m.title]));

  const grouped = new Map<string, MatterHoursSummary>();

  for (const entry of entries) {
    const existing = grouped.get(entry.matter_id) ?? {
      matterId: entry.matter_id,
      matterTitle: entry.matter?.title ?? matterTitles.get(entry.matter_id) ?? "Unknown matter",
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
    };

    existing.totalHours += entry.hours;
    if (entry.is_billable) {
      existing.billableHours += entry.hours;
    } else {
      existing.nonBillableHours += entry.hours;
    }

    grouped.set(entry.matter_id, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalHours - a.totalHours);
}

export function hoursByAttorney(
  entries: TimeEntry[],
  attorneys: DemoAttorney[],
): AttorneyHoursSummary[] {
  const names = new Map(attorneys.map((a) => [a.id, a.full_name]));
  const grouped = new Map<string, AttorneyHoursSummary>();

  for (const entry of entries) {
    const existing = grouped.get(entry.profile_id) ?? {
      attorneyId: entry.profile_id,
      attorneyName: names.get(entry.profile_id) ?? "Unknown attorney",
      totalHours: 0,
      billableHours: 0,
    };

    existing.totalHours += entry.hours;
    if (entry.is_billable) {
      existing.billableHours += entry.hours;
    }

    grouped.set(entry.profile_id, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => b.totalHours - a.totalHours);
}

export function formatHours(value: number) {
  return `${value.toFixed(1)}h`;
}

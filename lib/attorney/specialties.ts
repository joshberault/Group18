/** Demo attorney specialty — not a UserRole; maps to practice_areas.name for filtering. */
export type AttorneyDemoSpecialty =
  | "corporate"
  | "employment"
  | "litigation"
  | "real_estate";

export const DEMO_ATTORNEY_SPECIALTY_STORAGE_KEY =
  "counselflow-demo-attorney-specialty-v1";

export const DEFAULT_ATTORNEY_DEMO_SPECIALTY: AttorneyDemoSpecialty = "litigation";

export interface AttorneyDemoSpecialtyOption {
  id: AttorneyDemoSpecialty;
  label: string;
  practiceAreaName: string;
}

export const ATTORNEY_DEMO_SPECIALTIES: AttorneyDemoSpecialtyOption[] = [
  {
    id: "corporate",
    label: "Corporate/Business Attorney",
    practiceAreaName: "Corporate",
  },
  {
    id: "employment",
    label: "Employment Attorney",
    practiceAreaName: "Employment",
  },
  {
    id: "litigation",
    label: "Litigation Attorney",
    practiceAreaName: "Litigation",
  },
  {
    id: "real_estate",
    label: "Real Estate Attorney",
    practiceAreaName: "Real Estate",
  },
];

const SPECIALTY_IDS = new Set<string>(
  ATTORNEY_DEMO_SPECIALTIES.map((option) => option.id),
);

export function isValidAttorneyDemoSpecialty(
  value: string,
): value is AttorneyDemoSpecialty {
  return SPECIALTY_IDS.has(value);
}

export function getAttorneySpecialtyOption(
  specialty: AttorneyDemoSpecialty,
): AttorneyDemoSpecialtyOption {
  return (
    ATTORNEY_DEMO_SPECIALTIES.find((option) => option.id === specialty) ??
    ATTORNEY_DEMO_SPECIALTIES.find((option) => option.id === DEFAULT_ATTORNEY_DEMO_SPECIALTY)!
  );
}

export function getStoredAttorneySpecialty(): AttorneyDemoSpecialty {
  if (typeof window === "undefined") {
    return DEFAULT_ATTORNEY_DEMO_SPECIALTY;
  }
  const stored = localStorage.getItem(DEMO_ATTORNEY_SPECIALTY_STORAGE_KEY);
  if (stored && isValidAttorneyDemoSpecialty(stored)) {
    return stored;
  }
  return DEFAULT_ATTORNEY_DEMO_SPECIALTY;
}

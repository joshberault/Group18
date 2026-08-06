/**
 * Demo specialty lead attorneys in Supabase (profiles + practice_areas).
 * IDs match supabase/migrations/20260806203000_specialty_attorney_profiles.sql
 */

import type { AttorneyDemoSpecialty } from "@/lib/attorney/specialties";

export type SpecialtyAttorneyProfile = {
  id: string;
  fullName: string;
  email: string;
  specialty: AttorneyDemoSpecialty;
  practiceAreaName: string;
};

/** George Giddens — real auth user; litigation lead */
export const LITIGATION_ATTORNEY_ID = "4a0bef63-d0d2-4ca9-aa8f-69082b6c5384";

export const SPECIALTY_ATTORNEY_PROFILES: SpecialtyAttorneyProfile[] = [
  {
    id: "bbbb0101-0001-4001-8001-000000000001",
    fullName: "Jordan Brooks",
    email: "jordan.brooks@demo.counselflow.example",
    specialty: "corporate",
    practiceAreaName: "Corporate",
  },
  {
    id: "bbbb0102-0001-4001-8001-000000000002",
    fullName: "Taylor Ellis",
    email: "taylor.ellis@demo.counselflow.example",
    specialty: "employment",
    practiceAreaName: "Employment",
  },
  {
    id: LITIGATION_ATTORNEY_ID,
    fullName: "George Giddens",
    email: "gsgidden@go.olemiss.edu",
    specialty: "litigation",
    practiceAreaName: "Litigation",
  },
  {
    id: "bbbb0103-0001-4001-8001-000000000003",
    fullName: "Riley Grant",
    email: "riley.grant@demo.counselflow.example",
    specialty: "real_estate",
    practiceAreaName: "Real Estate",
  },
];

const BY_PRACTICE_AREA = new Map(
  SPECIALTY_ATTORNEY_PROFILES.map((attorney) => [
    attorney.practiceAreaName,
    attorney,
  ]),
);

const BY_SPECIALTY = new Map(
  SPECIALTY_ATTORNEY_PROFILES.map((attorney) => [attorney.specialty, attorney]),
);

/** IP matters route to corporate counsel for demo (no IP specialty attorney). */
const IP_FALLBACK_PRACTICE_AREA = "Corporate";

export function getLeadAttorneyForPracticeArea(
  practiceAreaName: string | null | undefined,
): SpecialtyAttorneyProfile {
  const normalized = practiceAreaName?.trim();
  if (!normalized) {
    return BY_SPECIALTY.get("litigation")!;
  }
  if (normalized === "Intellectual Property") {
    return BY_PRACTICE_AREA.get(IP_FALLBACK_PRACTICE_AREA)!;
  }
  return (
    BY_PRACTICE_AREA.get(normalized) ?? BY_SPECIALTY.get("litigation")!
  );
}

export function getLeadAttorneyForSpecialty(
  specialty: AttorneyDemoSpecialty,
): SpecialtyAttorneyProfile {
  return BY_SPECIALTY.get(specialty) ?? BY_SPECIALTY.get("litigation")!;
}

export function getSpecialtyAttorneyById(
  profileId: string,
): SpecialtyAttorneyProfile | undefined {
  return SPECIALTY_ATTORNEY_PROFILES.find((attorney) => attorney.id === profileId);
}

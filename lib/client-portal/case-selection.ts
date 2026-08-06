import { clientEngagedCases } from "@/lib/mock-data/client-portal";

export const PORTAL_CASE_SELECTION_KEY = "counselflow-portal-case-selection";
export const PORTAL_CASE_SELECTION_EVENT = "client-portal-case-selection-updated";
export const PORTAL_CASE_SELECTION_ALL = "all";

export type PortalCaseSelection = typeof PORTAL_CASE_SELECTION_ALL | string;

export function getPortalCaseSelection(): PortalCaseSelection {
  if (typeof window === "undefined") return PORTAL_CASE_SELECTION_ALL;

  try {
    const stored = localStorage.getItem(PORTAL_CASE_SELECTION_KEY);
    if (stored === PORTAL_CASE_SELECTION_ALL) return PORTAL_CASE_SELECTION_ALL;
    if (stored && clientEngagedCases.some((item) => item.id === stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors and fall back to all cases.
  }

  return PORTAL_CASE_SELECTION_ALL;
}

export function setPortalCaseSelection(selection: PortalCaseSelection) {
  if (typeof window === "undefined") return;

  localStorage.setItem(PORTAL_CASE_SELECTION_KEY, selection);
  window.dispatchEvent(new CustomEvent(PORTAL_CASE_SELECTION_EVENT));
}

export function getMatterNameForCaseNumber(caseNumber: string) {
  return (
    clientEngagedCases.find((item) => item.caseNumber === caseNumber)?.title ??
    caseNumber
  );
}

export function getVisibleEngagedCases(selection: PortalCaseSelection) {
  if (selection === PORTAL_CASE_SELECTION_ALL) return clientEngagedCases;
  return clientEngagedCases.filter((item) => item.id === selection);
}

export function getVisibleCaseNumbers(selection: PortalCaseSelection) {
  return new Set(
    getVisibleEngagedCases(selection).map((item) => item.caseNumber),
  );
}

export function matchesPortalCaseSelection(
  caseNumber: string | undefined | null,
  selection: PortalCaseSelection,
) {
  if (selection === PORTAL_CASE_SELECTION_ALL) return true;
  if (!caseNumber) return false;
  return getVisibleCaseNumbers(selection).has(caseNumber);
}

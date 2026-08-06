import { clientEngagedCases } from "@/lib/mock-data/client-portal";

export const PORTAL_CASE_SELECTION_KEY = "counselflow-portal-case-selection";
export const PORTAL_CASE_SELECTION_EVENT = "client-portal-case-selection-updated";
export const PORTAL_CASE_SELECTION_ALL = "all" as const;

/** `"all"` or a non-empty list of engaged-case ids. */
export type PortalCaseSelection =
  | typeof PORTAL_CASE_SELECTION_ALL
  | string[];

const VALID_CASE_IDS = new Set(clientEngagedCases.map((item) => item.id));

/** Cached snapshot so useSyncExternalStore does not see a new array each read. */
let cachedSelection: PortalCaseSelection = PORTAL_CASE_SELECTION_ALL;

function selectionsEqual(
  a: PortalCaseSelection,
  b: PortalCaseSelection,
): boolean {
  if (a === b) return true;
  if (a === PORTAL_CASE_SELECTION_ALL || b === PORTAL_CASE_SELECTION_ALL) {
    return false;
  }
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function uniqueValidIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const id of ids) {
    if (!VALID_CASE_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

/** Normalize raw storage / UI values into a stable selection. */
export function normalizePortalCaseSelection(
  value: unknown,
): PortalCaseSelection {
  if (value === PORTAL_CASE_SELECTION_ALL || value == null) {
    return PORTAL_CASE_SELECTION_ALL;
  }

  if (typeof value === "string") {
    if (value === PORTAL_CASE_SELECTION_ALL) return PORTAL_CASE_SELECTION_ALL;
    if (VALID_CASE_IDS.has(value)) return [value];
    return PORTAL_CASE_SELECTION_ALL;
  }

  if (Array.isArray(value)) {
    const ids = uniqueValidIds(
      value.filter((item): item is string => typeof item === "string"),
    );
    if (ids.length === 0) return PORTAL_CASE_SELECTION_ALL;
    if (ids.length >= clientEngagedCases.length) {
      return PORTAL_CASE_SELECTION_ALL;
    }
    return ids;
  }

  return PORTAL_CASE_SELECTION_ALL;
}

function readSelectionFromStorage(): PortalCaseSelection {
  if (typeof window === "undefined") return PORTAL_CASE_SELECTION_ALL;

  try {
    const stored = localStorage.getItem(PORTAL_CASE_SELECTION_KEY);
    if (!stored) return PORTAL_CASE_SELECTION_ALL;
    if (stored === PORTAL_CASE_SELECTION_ALL) return PORTAL_CASE_SELECTION_ALL;

    try {
      return normalizePortalCaseSelection(JSON.parse(stored));
    } catch {
      // Legacy single-id string (pre multi-select).
      return normalizePortalCaseSelection(stored);
    }
  } catch {
    // Ignore storage errors and fall back to all cases.
  }

  return PORTAL_CASE_SELECTION_ALL;
}

export function getPortalCaseSelection(): PortalCaseSelection {
  const next = readSelectionFromStorage();
  if (selectionsEqual(cachedSelection, next)) {
    return cachedSelection;
  }
  cachedSelection = next;
  return cachedSelection;
}

export function setPortalCaseSelection(selection: PortalCaseSelection) {
  if (typeof window === "undefined") return;

  const normalized = normalizePortalCaseSelection(selection);
  const stored =
    normalized === PORTAL_CASE_SELECTION_ALL
      ? PORTAL_CASE_SELECTION_ALL
      : JSON.stringify(normalized);

  localStorage.setItem(PORTAL_CASE_SELECTION_KEY, stored);
  cachedSelection = normalized;
  window.dispatchEvent(new CustomEvent(PORTAL_CASE_SELECTION_EVENT));
}

export function togglePortalCaseId(
  selection: PortalCaseSelection,
  caseId: string,
): PortalCaseSelection {
  if (!VALID_CASE_IDS.has(caseId)) return selection;

  const currentIds =
    selection === PORTAL_CASE_SELECTION_ALL
      ? clientEngagedCases.map((item) => item.id)
      : [...selection];

  const nextIds = currentIds.includes(caseId)
    ? currentIds.filter((id) => id !== caseId)
    : [...currentIds, caseId];

  // Keep at least one matter selected.
  if (nextIds.length === 0) return [caseId];

  return normalizePortalCaseSelection(nextIds);
}

export function getMatterNameForCaseNumber(caseNumber: string) {
  return (
    clientEngagedCases.find((item) => item.caseNumber === caseNumber)?.title ??
    caseNumber
  );
}

export function getVisibleEngagedCases(selection: PortalCaseSelection) {
  if (selection === PORTAL_CASE_SELECTION_ALL) return clientEngagedCases;
  const selected = new Set(selection);
  return clientEngagedCases.filter((item) => selected.has(item.id));
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

export function isPortalCaseSelected(
  caseId: string,
  selection: PortalCaseSelection,
) {
  if (selection === PORTAL_CASE_SELECTION_ALL) return true;
  return selection.includes(caseId);
}

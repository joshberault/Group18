"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getPortalCaseSelection,
  getVisibleCaseNumbers,
  getVisibleEngagedCases,
  matchesPortalCaseSelection,
  PORTAL_CASE_SELECTION_ALL,
  PORTAL_CASE_SELECTION_EVENT,
  setPortalCaseSelection,
  type PortalCaseSelection,
} from "@/lib/client-portal/case-selection";
import type { ClientEngagedCase } from "@/lib/mock-data/client-portal";

function subscribe(callback: () => void) {
  window.addEventListener(PORTAL_CASE_SELECTION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PORTAL_CASE_SELECTION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

interface CaseSelectionContextValue {
  selection: PortalCaseSelection;
  setSelection: (selection: PortalCaseSelection) => void;
  isAllCases: boolean;
  selectedCases: ClientEngagedCase[];
  selectedCaseNumbers: Set<string>;
  matchesCase: (caseNumber: string | undefined | null) => boolean;
}

const CaseSelectionContext = createContext<CaseSelectionContextValue | null>(
  null,
);

export function CaseSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const selection = useSyncExternalStore(
    subscribe,
    getPortalCaseSelection,
    () => PORTAL_CASE_SELECTION_ALL,
  );

  const setSelection = useCallback((next: PortalCaseSelection) => {
    setPortalCaseSelection(next);
  }, []);

  const selectedCases = useMemo(
    () => getVisibleEngagedCases(selection),
    [selection],
  );

  const selectedCaseNumbers = useMemo(
    () => getVisibleCaseNumbers(selection),
    [selection],
  );

  const matchesCase = useCallback(
    (caseNumber: string | undefined | null) =>
      matchesPortalCaseSelection(caseNumber, selection),
    [selection],
  );

  const value = useMemo<CaseSelectionContextValue>(
    () => ({
      selection,
      setSelection,
      isAllCases: selection === PORTAL_CASE_SELECTION_ALL,
      selectedCases,
      selectedCaseNumbers,
      matchesCase,
    }),
    [selection, setSelection, selectedCases, selectedCaseNumbers, matchesCase],
  );

  return (
    <CaseSelectionContext.Provider value={value}>
      {children}
    </CaseSelectionContext.Provider>
  );
}

export function useCaseSelection() {
  const context = useContext(CaseSelectionContext);
  if (!context) {
    throw new Error(
      "useCaseSelection must be used within CaseSelectionProvider",
    );
  }
  return context;
}

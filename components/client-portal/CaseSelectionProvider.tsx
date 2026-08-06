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
  isPortalCaseSelected,
  matchesPortalCaseSelection,
  PORTAL_CASE_SELECTION_ALL,
  PORTAL_CASE_SELECTION_EVENT,
  setPortalCaseSelection,
  togglePortalCaseId,
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
  toggleCaseId: (caseId: string) => void;
  selectAllCases: () => void;
  isCaseSelected: (caseId: string) => boolean;
  isAllCases: boolean;
  isMultipleCases: boolean;
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
    (): PortalCaseSelection => PORTAL_CASE_SELECTION_ALL,
  );

  const setSelection = useCallback((next: PortalCaseSelection) => {
    setPortalCaseSelection(next);
  }, []);

  const toggleCaseId = useCallback(
    (caseId: string) => {
      setPortalCaseSelection(togglePortalCaseId(selection, caseId));
    },
    [selection],
  );

  const selectAllCases = useCallback(() => {
    setPortalCaseSelection(PORTAL_CASE_SELECTION_ALL);
  }, []);

  const isCaseSelected = useCallback(
    (caseId: string) => isPortalCaseSelected(caseId, selection),
    [selection],
  );

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
      toggleCaseId,
      selectAllCases,
      isCaseSelected,
      isAllCases: selection === PORTAL_CASE_SELECTION_ALL,
      isMultipleCases: selectedCases.length > 1,
      selectedCases,
      selectedCaseNumbers,
      matchesCase,
    }),
    [
      selection,
      setSelection,
      toggleCaseId,
      selectAllCases,
      isCaseSelected,
      selectedCases,
      selectedCaseNumbers,
      matchesCase,
    ],
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

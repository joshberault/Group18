"use client";

import { Select } from "@/components/ui/Select";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import { PORTAL_CASE_SELECTION_ALL } from "@/lib/client-portal/case-selection";
import { clientEngagedCases } from "@/lib/mock-data/client-portal";

export function PortalCaseSelector() {
  const { selection, setSelection, isAllCases, selectedCases } =
    useCaseSelection();

  const options = [
    { value: PORTAL_CASE_SELECTION_ALL, label: "All matter names" },
    ...clientEngagedCases.map((engagedCase) => ({
      value: engagedCase.id,
      label: engagedCase.title,
    })),
  ];

  const summary = isAllCases
    ? `Showing information for all ${clientEngagedCases.length} matters`
    : `Showing information for ${selectedCases[0]?.title ?? "selected matter"}`;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-xl">
          <Select
            label="View by matter name"
            options={options}
            value={selection}
            onChange={(event) => setSelection(event.target.value)}
          />
        </div>
        <p className="text-sm text-muted sm:pb-2">{summary}</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useCaseSelection } from "@/components/client-portal/CaseSelectionProvider";
import { clientEngagedCases } from "@/lib/mock-data/client-portal";
import { cn } from "@/lib/utils/cn";

export function PortalCaseSelector() {
  const {
    isAllCases,
    isMultipleCases,
    selectedCases,
    isCaseSelected,
    toggleCaseId,
    selectAllCases,
  } = useCaseSelection();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const triggerLabel = isAllCases
    ? "All matter names"
    : selectedCases.length === 1
      ? `${selectedCases[0].title} · #${selectedCases[0].caseNumber}`
      : `${selectedCases.length} matters selected`;

  const summary = isAllCases
    ? `Showing information for all ${clientEngagedCases.length} matters`
    : isMultipleCases
      ? `Showing information for ${selectedCases.length} selected matters`
      : `Showing information for ${selectedCases[0]?.title ?? "selected matter"} · #${selectedCases[0]?.caseNumber ?? ""}`;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-xl" ref={rootRef}>
          <p className="mb-1.5 text-sm font-medium text-navy-900">
            View by matter name / case #
          </p>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            onClick={() => setOpen((current) => !current)}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-navy-900 transition-colors",
              "hover:border-navy-700/40 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20",
              open && "border-navy-700 ring-2 ring-navy-700/20",
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {open && (
            <div
              id={listboxId}
              role="listbox"
              aria-multiselectable="true"
              aria-label="Select matters by name or case number"
              className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              <div className="border-b border-gray-100 px-3 py-2">
                <p className="text-xs text-muted">
                  Select one matter, multiple matters, or all.
                </p>
              </div>

              <ul className="max-h-72 overflow-y-auto py-1">
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isAllCases}
                    onClick={() => {
                      selectAllCases();
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50",
                      isAllCases && "bg-navy-900/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isAllCases
                          ? "border-navy-900 bg-navy-900 text-white"
                          : "border-gray-300 bg-white",
                      )}
                    >
                      {isAllCases && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="block font-medium text-navy-900">
                        All matter names
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        Show every engaged matter ({clientEngagedCases.length})
                      </span>
                    </span>
                  </button>
                </li>

                {clientEngagedCases.map((engagedCase) => {
                  const checked = isCaseSelected(engagedCase.id);

                  return (
                    <li key={engagedCase.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={checked}
                        onClick={() => toggleCaseId(engagedCase.id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50",
                          checked && !isAllCases && "bg-navy-900/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            checked
                              ? "border-navy-900 bg-navy-900 text-white"
                              : "border-gray-300 bg-white",
                          )}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-navy-900">
                            {engagedCase.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            Case # {engagedCase.caseNumber}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <p className="text-sm text-muted sm:pb-2">{summary}</p>
      </div>
    </div>
  );
}

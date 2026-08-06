"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ATTORNEY_DEMO_SPECIALTIES,
  getAttorneySpecialtyOption,
  type AttorneyDemoSpecialty,
} from "@/lib/attorney/specialties";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useDemoRole } from "./DemoRoleProvider";

interface DemoRoleSelectProps {
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

function roleTriggerLabel(
  selectedRole: UserRole,
  attorneySpecialty: AttorneyDemoSpecialty | null,
): string {
  if (selectedRole === "attorney" && attorneySpecialty) {
    return getAttorneySpecialtyOption(attorneySpecialty).label;
  }
  return USER_ROLE_LABELS[selectedRole];
}

export function DemoRoleSelect({
  onRoleChange,
  className,
}: DemoRoleSelectProps) {
  const { selectedRole, attorneySpecialty, selectAttorneySpecialty } = useDemoRole();
  const [open, setOpen] = useState(false);
  const [attorneySubmenuOpen, setAttorneySubmenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setAttorneySubmenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectRole(role: UserRole) {
    onRoleChange(role);
    setOpen(false);
    setAttorneySubmenuOpen(false);
  }

  function selectSpecialty(specialty: AttorneyDemoSpecialty) {
    selectAttorneySpecialty(specialty);
    setOpen(false);
    setAttorneySubmenuOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-[220px]", className)}>
      <label className="mb-1.5 block text-sm font-medium text-navy-900">Demo role</label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch demonstration role"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-navy-900 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
      >
        <span className="truncate">{roleTriggerLabel(selectedRole, attorneySpecialty)}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Demonstration roles"
          className="absolute right-0 z-50 mt-1 max-h-[min(24rem,calc(100vh-8rem))] w-full min-w-[260px] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {USER_ROLES.map((role) => {
            if (role === "attorney") {
              return (
                <li
                  key={role}
                  className="relative"
                  onMouseEnter={() => setAttorneySubmenuOpen(true)}
                  onMouseLeave={() => setAttorneySubmenuOpen(false)}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedRole === "attorney"}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-navy-900 hover:bg-gray-50",
                      selectedRole === "attorney" && "bg-navy-50 font-medium",
                    )}
                    onClick={() => {
                      if (attorneySpecialty) {
                        selectAttorneySpecialty(attorneySpecialty);
                      } else {
                        selectAttorneySpecialty("litigation");
                      }
                    }}
                  >
                    <span>{USER_ROLE_LABELS.attorney}</span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>

                  {attorneySubmenuOpen && (
                    <ul
                      role="listbox"
                      aria-label="Attorney specialties"
                      className="absolute left-full top-0 z-50 ml-1 w-[min(17rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      {ATTORNEY_DEMO_SPECIALTIES.map((option) => (
                        <li key={option.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={
                              selectedRole === "attorney" &&
                              attorneySpecialty === option.id
                            }
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm text-navy-900 hover:bg-gray-50",
                              selectedRole === "attorney" &&
                                attorneySpecialty === option.id &&
                                "bg-navy-50 font-medium",
                            )}
                            onClick={() => selectSpecialty(option.id)}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={role}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedRole === role}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm text-navy-900 hover:bg-gray-50",
                    selectedRole === role && "bg-navy-50 font-medium",
                  )}
                  onClick={() => selectRole(role)}
                >
                  {USER_ROLE_LABELS[role]}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

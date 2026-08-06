"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import {
  ATTORNEY_DEMO_SPECIALTIES,
  getAttorneySpecialtyOption,
  type AttorneyDemoSpecialty,
} from "@/lib/attorney/specialties";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/types";
import { DEFAULT_DEMO_ROLE } from "@/lib/roles/role-config";
import { cn } from "@/lib/utils/cn";
import { useDemoRole } from "./DemoRoleProvider";

interface DemoRoleSelectProps {
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

const SUBMENU_CLOSE_DELAY_MS = 160;

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
  const { selectedRole, attorneySpecialty, selectAttorneySpecialty, isClientReady } =
    useDemoRole();
  const [open, setOpen] = useState(false);
  const [attorneySubmenuOpen, setAttorneySubmenuOpen] = useState(false);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const attorneyRowRef = useRef<HTMLLIElement>(null);
  const submenuCloseTimerRef = useRef<number | null>(null);

  const syncFlyoutPosition = useCallback(() => {
    const row = attorneyRowRef.current;
    const panel = panelRef.current;
    if (!row || !panel) return;
    const rowRect = row.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    setFlyoutTop(rowRect.top - panelRect.top);
  }, []);

  const clearSubmenuCloseTimer = useCallback(() => {
    if (submenuCloseTimerRef.current !== null) {
      window.clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
  }, []);

  const openAttorneySubmenu = useCallback(() => {
    clearSubmenuCloseTimer();
    syncFlyoutPosition();
    setAttorneySubmenuOpen(true);
  }, [clearSubmenuCloseTimer, syncFlyoutPosition]);

  const scheduleCloseAttorneySubmenu = useCallback(() => {
    clearSubmenuCloseTimer();
    submenuCloseTimerRef.current = window.setTimeout(() => {
      setAttorneySubmenuOpen(false);
      submenuCloseTimerRef.current = null;
    }, SUBMENU_CLOSE_DELAY_MS);
  }, [clearSubmenuCloseTimer]);

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

  useEffect(() => {
    if (!open) {
      setAttorneySubmenuOpen(false);
      return;
    }
    syncFlyoutPosition();
    window.addEventListener("resize", syncFlyoutPosition);
    return () => window.removeEventListener("resize", syncFlyoutPosition);
  }, [open, syncFlyoutPosition]);

  useEffect(() => {
    return () => clearSubmenuCloseTimer();
  }, [clearSubmenuCloseTimer]);

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
        <span className="truncate" suppressHydrationWarning>
          {isClientReady
            ? roleTriggerLabel(selectedRole, attorneySpecialty)
            : USER_ROLE_LABELS[DEFAULT_DEMO_ROLE]}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 z-50 mt-1 w-full min-w-[260px] overflow-visible rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <ul
            role="listbox"
            aria-label="Demonstration roles"
            className="max-h-[min(24rem,calc(100vh-8rem))] overflow-y-auto py-1"
          >
            {USER_ROLES.map((role) => {
              if (role === "attorney") {
                return (
                  <li
                    key={role}
                    ref={attorneyRowRef}
                    onMouseEnter={openAttorneySubmenu}
                    onMouseLeave={scheduleCloseAttorneySubmenu}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedRole === "attorney"}
                      aria-expanded={attorneySubmenuOpen}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-navy-900 hover:bg-gray-50",
                        (selectedRole === "attorney" || attorneySubmenuOpen) &&
                          "bg-navy-50 font-medium",
                      )}
                      onClick={() => {
                        openAttorneySubmenu();
                        if (attorneySpecialty) {
                          selectAttorneySpecialty(attorneySpecialty);
                        } else {
                          selectAttorneySpecialty("litigation");
                        }
                      }}
                    >
                      <span>{USER_ROLE_LABELS.attorney}</span>
                      <ChevronLeft
                        className={cn(
                          "h-4 w-4 text-muted transition",
                          attorneySubmenuOpen && "text-navy-700",
                        )}
                      />
                    </button>
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

          {attorneySubmenuOpen && (
            <div
              className="absolute z-[60] flex items-stretch"
              style={{ top: flyoutTop, right: "100%" }}
              onMouseEnter={openAttorneySubmenu}
              onMouseLeave={scheduleCloseAttorneySubmenu}
            >
              <div className="w-2 shrink-0 self-stretch" aria-hidden />
              <ul
                role="listbox"
                aria-label="Attorney specialties"
                className="w-[min(17.5rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
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
                        "w-full px-3 py-2.5 text-left text-sm text-navy-900 hover:bg-gray-50",
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

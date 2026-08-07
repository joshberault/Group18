"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import {
  ATTORNEY_DEMO_SPECIALTIES,
  getAttorneySpecialtyOption,
  type AttorneyDemoSpecialty,
} from "@/lib/attorney/specialties";
import { getLeadAttorneyForSpecialty } from "@/lib/attorney/specialty-attorneys";
import { DEFAULT_DEMO_ROLE } from "@/lib/roles/role-config";
import { USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { useDemoRole } from "./DemoRoleProvider";

interface DemoRoleSelectProps {
  onRoleChange: (role: UserRole) => void;
  className?: string;
}

const SUBMENU_CLOSE_DELAY_MS = 200;
const FLYOUT_WIDTH_PX = 280;

function roleTriggerLabel(
  selectedRole: UserRole,
  attorneySpecialty: AttorneyDemoSpecialty | null,
): string {
  if (selectedRole === "attorney" && attorneySpecialty) {
    return getAttorneySpecialtyOption(attorneySpecialty).label;
  }
  return USER_ROLE_LABELS[selectedRole];
}

type FlyoutPlacement = {
  top: number;
  left: number;
};

export function DemoRoleSelect({
  onRoleChange,
  className,
}: DemoRoleSelectProps) {
  const { selectedRole, attorneySpecialty, selectAttorneySpecialty, isClientReady } =
    useDemoRole();
  const [open, setOpen] = useState(false);
  const [attorneySubmenuOpen, setAttorneySubmenuOpen] = useState(false);
  const [flyoutPlacement, setFlyoutPlacement] = useState<FlyoutPlacement | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const attorneyRowRef = useRef<HTMLLIElement>(null);
  const submenuCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncFlyoutPosition = useCallback(() => {
    const row = attorneyRowRef.current;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const gap = 8;
    let left = rect.left - FLYOUT_WIDTH_PX - gap;
    let top = rect.top;

    if (left < gap) {
      left = Math.max(gap, rect.right - FLYOUT_WIDTH_PX);
    }

    const maxTop = window.innerHeight - 220;
    top = Math.min(Math.max(gap, top), maxTop);
    setFlyoutPlacement({ top, left });
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

  const toggleAttorneySubmenu = useCallback(() => {
    if (attorneySubmenuOpen) {
      setAttorneySubmenuOpen(false);
      return;
    }
    openAttorneySubmenu();
  }, [attorneySubmenuOpen, openAttorneySubmenu]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const flyout = document.getElementById("attorney-specialty-flyout");
      if (flyout?.contains(target)) return;
      setOpen(false);
      setAttorneySubmenuOpen(false);
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
    window.addEventListener("scroll", syncFlyoutPosition, true);
    return () => {
      window.removeEventListener("resize", syncFlyoutPosition);
      window.removeEventListener("scroll", syncFlyoutPosition, true);
    };
  }, [open, syncFlyoutPosition]);

  useEffect(() => {
    if (attorneySubmenuOpen) {
      syncFlyoutPosition();
    }
  }, [attorneySubmenuOpen, syncFlyoutPosition]);

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

  const specialtyFlyout =
    mounted && attorneySubmenuOpen && flyoutPlacement
      ? createPortal(
          <div
            id="attorney-specialty-flyout"
            className="fixed z-[200] w-[min(17.5rem,calc(100vw-1rem))]"
            style={{
              top: flyoutPlacement.top,
              left: flyoutPlacement.left,
              maxWidth: FLYOUT_WIDTH_PX,
            }}
            onMouseEnter={openAttorneySubmenu}
            onMouseLeave={scheduleCloseAttorneySubmenu}
          >
            <ul
              role="listbox"
              aria-label="Attorney specialties"
              className="rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
            >
              {ATTORNEY_DEMO_SPECIALTIES.map((option) => {
                const lead = getLeadAttorneyForSpecialty(option.id);
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={
                        selectedRole === "attorney" &&
                        attorneySpecialty === option.id
                      }
                      className={cn(
                        "w-full px-3 py-2.5 text-left hover:bg-gray-50",
                        selectedRole === "attorney" &&
                          attorneySpecialty === option.id &&
                          "bg-navy-50",
                      )}
                      onClick={() => selectSpecialty(option.id)}
                    >
                      <span className="block text-sm font-medium text-navy-900">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted">
                        {lead.fullName}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative min-w-[180px] sm:min-w-[220px]", className)}>
      <span className="sr-only">Demo role</span>
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
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 z-[100] mt-1 w-full min-w-[260px] rounded-lg border border-gray-200 bg-white shadow-lg"
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
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleAttorneySubmenu();
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
        </div>
      )}

      {specialtyFlyout}
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ATTORNEY_DEMO_SPECIALTY,
  DEMO_ATTORNEY_SPECIALTY_STORAGE_KEY,
  getAttorneySpecialtyOption,
  getStoredAttorneySpecialty,
  type AttorneyDemoSpecialty,
} from "@/lib/attorney/specialties";
import type { NavItem } from "@/lib/navigation";
import type { Permission } from "@/lib/roles/permissions";
import {
  canAccessRoute,
  DEFAULT_DEMO_ROLE,
  DEMO_IDENTITIES,
  DEMO_ROLE_STORAGE_KEY,
  getDefaultRouteForRole,
  getNavigationForRole,
  getPermissionsForRole,
  getRoleDefinition,
  isValidDemoRole,
} from "@/lib/roles/role-config";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";

function getStoredRole(): UserRole {
  if (typeof window === "undefined") {
    return DEFAULT_DEMO_ROLE;
  }
  const stored = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
  if (stored && isValidDemoRole(stored)) {
    return stored;
  }
  return DEFAULT_DEMO_ROLE;
}

const DEMO_PREFERENCES_CHANGED_EVENT = "counselflow-demo-preferences-changed";

function subscribeToDemoPreferences(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(DEMO_PREFERENCES_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DEMO_PREFERENCES_CHANGED_EVENT, callback);
  };
}

function notifyDemoPreferencesChanged() {
  window.dispatchEvent(new Event(DEMO_PREFERENCES_CHANGED_EVENT));
}

interface DemoRoleContextValue {
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
  /** Active when selectedRole is attorney — used for demo matter/client filtering. */
  attorneySpecialty: AttorneyDemoSpecialty | null;
  attorneyPracticeAreaName: string | null;
  selectAttorneySpecialty: (specialty: AttorneyDemoSpecialty) => void;
  /** Header-friendly role line (includes specialty when attorney). */
  roleDisplayLabel: string;
  /** False during SSR/first paint — avoids localStorage hydration mismatches. */
  isClientReady: boolean;
  /** @deprecated Use selectedRole — kept for main-branch components */
  role: UserRole;
  /** @deprecated Use setSelectedRole */
  setRole: (role: UserRole) => void;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  navigationItems: NavItem[];
  defaultRoute: string;
  identity: { fullName: string; initials: string };
  dashboardTitle: string;
  dashboardDescription: string;
}

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

export function DemoRoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const selectedRole = useSyncExternalStore(
    subscribeToDemoPreferences,
    getStoredRole,
    () => DEFAULT_DEMO_ROLE,
  );

  const attorneySpecialtyStored = useSyncExternalStore(
    subscribeToDemoPreferences,
    getStoredAttorneySpecialty,
    () => DEFAULT_ATTORNEY_DEMO_SPECIALTY,
  );

  const attorneySpecialty =
    selectedRole === "attorney" ? attorneySpecialtyStored : null;

  const attorneyPracticeAreaName = attorneySpecialty
    ? getAttorneySpecialtyOption(attorneySpecialty).practiceAreaName
    : null;

  const navigateIfNeeded = useCallback(
    (role: UserRole) => {
      const currentPath = window.location.pathname;
      if (!canAccessRoute(role, currentPath)) {
        router.push(getDefaultRouteForRole(role));
      }
    },
    [router],
  );

  const setSelectedRole = useCallback(
    (newRole: UserRole) => {
      localStorage.setItem(DEMO_ROLE_STORAGE_KEY, newRole);
      notifyDemoPreferencesChanged();
      navigateIfNeeded(newRole);
    },
    [navigateIfNeeded],
  );

  const selectAttorneySpecialty = useCallback(
    (specialty: AttorneyDemoSpecialty) => {
      localStorage.setItem(DEMO_ATTORNEY_SPECIALTY_STORAGE_KEY, specialty);
      localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "attorney");
      notifyDemoPreferencesChanged();
      navigateIfNeeded("attorney");
    },
    [navigateIfNeeded],
  );

  const permissions = useMemo(
    () => getPermissionsForRole(selectedRole),
    [selectedRole],
  );

  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  );

  const navigationItems = useMemo(
    () => getNavigationForRole(selectedRole),
    [selectedRole],
  );

  const roleDefinition = useMemo(
    () => getRoleDefinition(selectedRole),
    [selectedRole],
  );

  const roleDisplayLabel = useMemo(() => {
    if (selectedRole === "attorney" && attorneySpecialty) {
      return getAttorneySpecialtyOption(attorneySpecialty).label;
    }
    return USER_ROLE_LABELS[selectedRole];
  }, [attorneySpecialty, selectedRole]);

  const stableRole = isClientReady ? selectedRole : DEFAULT_DEMO_ROLE;
  const stableIdentity = DEMO_IDENTITIES[stableRole];
  const stableRoleDisplayLabel = isClientReady
    ? roleDisplayLabel
    : USER_ROLE_LABELS[DEFAULT_DEMO_ROLE];

  const value = useMemo<DemoRoleContextValue>(
    () => ({
      selectedRole,
      setSelectedRole,
      attorneySpecialty,
      attorneyPracticeAreaName,
      selectAttorneySpecialty,
      roleDisplayLabel: stableRoleDisplayLabel,
      isClientReady,
      role: selectedRole,
      setRole: setSelectedRole,
      permissions,
      hasPermission,
      navigationItems,
      defaultRoute: roleDefinition.defaultRoute,
      identity: stableIdentity,
      dashboardTitle: roleDefinition.dashboardTitle,
      dashboardDescription: roleDefinition.dashboardDescription,
    }),
    [
      selectedRole,
      setSelectedRole,
      attorneySpecialty,
      attorneyPracticeAreaName,
      selectAttorneySpecialty,
      stableRoleDisplayLabel,
      isClientReady,
      permissions,
      hasPermission,
      navigationItems,
      roleDefinition,
      stableIdentity,
    ],
  );

  return (
    <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error("useDemoRole must be used within DemoRoleProvider");
  }
  return context;
}

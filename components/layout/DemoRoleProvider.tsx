"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
import { resolveDemoIdentity } from "@/lib/roles/demo-identity";
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

function readStoredRole(): UserRole {
  if (typeof window === "undefined") return DEFAULT_DEMO_ROLE;
  const stored = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
  if (stored && isValidDemoRole(stored)) return stored;
  return DEFAULT_DEMO_ROLE;
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
  // Always start from DEFAULT so SSR and the first client paint match.
  const [selectedRole, setSelectedRoleState] = useState<UserRole>(DEFAULT_DEMO_ROLE);
  const [attorneySpecialtyStored, setAttorneySpecialtyStored] =
    useState<AttorneyDemoSpecialty>(DEFAULT_ATTORNEY_DEMO_SPECIALTY);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setSelectedRoleState(readStoredRole());
    setAttorneySpecialtyStored(getStoredAttorneySpecialty());
    setIsClientReady(true);

    const onChange = () => {
      setSelectedRoleState(readStoredRole());
      setAttorneySpecialtyStored(getStoredAttorneySpecialty());
    };
    window.addEventListener("storage", onChange);
    window.addEventListener("counselflow-demo-preferences-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("counselflow-demo-preferences-changed", onChange);
    };
  }, []);

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
      setSelectedRoleState(newRole);
      window.dispatchEvent(new Event("counselflow-demo-preferences-changed"));
      navigateIfNeeded(newRole);
    },
    [navigateIfNeeded],
  );

  const selectAttorneySpecialty = useCallback(
    (specialty: AttorneyDemoSpecialty) => {
      localStorage.setItem(DEMO_ATTORNEY_SPECIALTY_STORAGE_KEY, specialty);
      localStorage.setItem(DEMO_ROLE_STORAGE_KEY, "attorney");
      setAttorneySpecialtyStored(specialty);
      setSelectedRoleState("attorney");
      window.dispatchEvent(new Event("counselflow-demo-preferences-changed"));
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

  // Keep SSR + first client paint on the default role nav to avoid hydration
  // mismatches when localStorage has a different demo role.
  const navigationRole = isClientReady ? selectedRole : DEFAULT_DEMO_ROLE;

  const navigationItems = useMemo(
    () => getNavigationForRole(navigationRole),
    [navigationRole],
  );

  const roleDefinition = useMemo(
    () => getRoleDefinition(navigationRole),
    [navigationRole],
  );

  const roleDisplayLabel = useMemo(() => {
    if (selectedRole === "attorney" && attorneySpecialty) {
      return getAttorneySpecialtyOption(attorneySpecialty).label;
    }
    return USER_ROLE_LABELS[selectedRole];
  }, [attorneySpecialty, selectedRole]);

  const identity = useMemo(
    () =>
      isClientReady
        ? resolveDemoIdentity(navigationRole, attorneySpecialty)
        : DEMO_IDENTITIES[DEFAULT_DEMO_ROLE],
    [attorneySpecialty, isClientReady, navigationRole],
  );

  const value = useMemo<DemoRoleContextValue>(
    () => ({
      selectedRole,
      setSelectedRole,
      attorneySpecialty,
      attorneyPracticeAreaName,
      selectAttorneySpecialty,
      roleDisplayLabel: isClientReady
        ? roleDisplayLabel
        : USER_ROLE_LABELS[DEFAULT_DEMO_ROLE],
      isClientReady,
      role: selectedRole,
      setRole: setSelectedRole,
      permissions,
      hasPermission,
      navigationItems,
      defaultRoute: roleDefinition.defaultRoute,
      identity,
      dashboardTitle: roleDefinition.dashboardTitle,
      dashboardDescription: roleDefinition.dashboardDescription,
    }),
    [
      selectedRole,
      setSelectedRole,
      attorneySpecialty,
      attorneyPracticeAreaName,
      selectAttorneySpecialty,
      roleDisplayLabel,
      isClientReady,
      permissions,
      hasPermission,
      navigationItems,
      roleDefinition,
      identity,
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

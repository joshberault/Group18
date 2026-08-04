"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import type { NavItem } from "@/lib/navigation";
import type { Permission } from "@/lib/roles/permissions";
import {
  canAccessRoute,
  DEFAULT_DEMO_ROLE,
  DEMO_IDENTITIES,
  getDefaultRouteForRole,
  getNavigationForRole,
  getPermissionsForRole,
  getRoleDefinition,
  isValidDemoRole,
} from "@/lib/roles/role-config";
import type { UserRole } from "@/lib/types";

const STORAGE_KEY = "counselflow-demo-role";

function getStoredRole(): UserRole {
  if (typeof window === "undefined") {
    return DEFAULT_DEMO_ROLE;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidDemoRole(stored)) {
    return stored;
  }
  return DEFAULT_DEMO_ROLE;
}

function subscribeToRole(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

interface DemoRoleContextValue {
  selectedRole: UserRole;
  setSelectedRole: (role: UserRole) => void;
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
  const selectedRole = useSyncExternalStore(
    subscribeToRole,
    getStoredRole,
    () => DEFAULT_DEMO_ROLE,
  );

  const setSelectedRole = useCallback(
    (newRole: UserRole) => {
      localStorage.setItem(STORAGE_KEY, newRole);
      window.dispatchEvent(new Event("storage"));

      const currentPath = window.location.pathname;
      if (!canAccessRoute(newRole, currentPath)) {
        router.push(getDefaultRouteForRole(newRole));
      }
    },
    [router],
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

  const value = useMemo<DemoRoleContextValue>(
    () => ({
      selectedRole,
      setSelectedRole,
      permissions,
      hasPermission,
      navigationItems,
      defaultRoute: roleDefinition.defaultRoute,
      identity: DEMO_IDENTITIES[selectedRole],
      dashboardTitle: roleDefinition.dashboardTitle,
      dashboardDescription: roleDefinition.dashboardDescription,
    }),
    [
      selectedRole,
      setSelectedRole,
      permissions,
      hasPermission,
      navigationItems,
      roleDefinition,
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

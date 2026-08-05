"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserRole } from "@/lib/types";
import { USER_ROLES } from "@/lib/types";

const STORAGE_KEY = "counselflow-demo-role";

interface DemoRoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const DemoRoleContext = createContext<DemoRoleContextValue | null>(null);

function isValidRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function DemoRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("firm_administrator");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidRole(stored)) {
      setRoleState(stored);
    }
  }, []);

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem(STORAGE_KEY, newRole);
  }, []);

  return (
    <DemoRoleContext.Provider value={{ role, setRole }}>
      {children}
    </DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error("useDemoRole must be used within DemoRoleProvider");
  }
  return context;
}

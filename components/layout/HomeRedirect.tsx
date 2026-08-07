"use client";

import { useEffect } from "react";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_STORAGE_KEY,
  getDefaultRouteForRole,
  isValidDemoRole,
} from "@/lib/roles/role-config";

export function HomeRedirect() {
  useEffect(() => {
    let dest = "/dashboard";
    try {
      const stored = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
      const role =
        stored && isValidDemoRole(stored) ? stored : DEFAULT_DEMO_ROLE;
      dest = getDefaultRouteForRole(role);
    } catch {
      dest = getDefaultRouteForRole(DEFAULT_DEMO_ROLE);
    }

    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.location.replace(dest);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-stone-50 px-6 text-center">
      <p className="text-lg font-semibold text-navy-900">CounselFlow</p>
      <p className="text-sm text-stone-600">Loading your workspace…</p>
    </div>
  );
}

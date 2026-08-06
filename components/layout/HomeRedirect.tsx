"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_STORAGE_KEY,
  getDefaultRouteForRole,
  isValidDemoRole,
} from "@/lib/roles/role-config";

export function HomeRedirect() {
  const router = useRouter();
  const [status, setStatus] = useState("Opening CounselFlow…");

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

    setStatus("Loading your workspace…");
    router.replace(dest);

    // Hard fallback if soft navigation stalls (common on cold Next.js compiles)
    const hardNav = window.setTimeout(() => {
      if (window.location.pathname === "/" || window.location.pathname === "") {
        setStatus("Still loading — jumping to dashboard…");
        window.location.assign(dest);
      }
    }, 1500);

    return () => window.clearTimeout(hardNav);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-stone-50 px-6 text-center">
      <p className="text-lg font-semibold text-navy-900">CounselFlow</p>
      <p className="text-sm text-stone-600">{status}</p>
      <p className="text-xs text-stone-400">
        First load can take a moment while the app compiles.
      </p>
    </div>
  );
}

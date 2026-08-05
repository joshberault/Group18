"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_STORAGE_KEY,
  getDefaultRouteForRole,
  isValidDemoRole,
} from "@/lib/roles/role-config";

export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    const role =
      stored && isValidDemoRole(stored) ? stored : DEFAULT_DEMO_ROLE;
    router.replace(getDefaultRouteForRole(role));
  }, [router]);

  return null;
}

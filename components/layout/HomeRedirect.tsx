"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_DEMO_ROLE,
  getDefaultRouteForRole,
  isValidDemoRole,
} from "@/lib/roles/role-config";

const STORAGE_KEY = "counselflow-demo-role";

export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const role =
      stored && isValidDemoRole(stored) ? stored : DEFAULT_DEMO_ROLE;
    router.replace(getDefaultRouteForRole(role));
  }, [router]);

  return null;
}

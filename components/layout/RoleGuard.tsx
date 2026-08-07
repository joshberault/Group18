"use client";

import { usePathname } from "next/navigation";
import { canAccessRoute } from "@/lib/roles/role-config";
import { useDemoRole } from "./DemoRoleProvider";
import { AccessRestricted } from "./AccessRestricted";

/**
 * Demo frontend route guard. Hides unauthorized page content and shows
 * Access Restricted. Production security must also use Supabase RLS.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { selectedRole, isClientReady } = useDemoRole();

  if (!isClientReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted">
        Loading workspace…
      </div>
    );
  }

  if (!canAccessRoute(selectedRole, pathname)) {
    return <AccessRestricted attemptedPath={pathname} />;
  }

  return <>{children}</>;
}

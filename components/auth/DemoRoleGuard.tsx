"use client";

import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";

interface DemoRoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  title?: string;
}

export function DemoRoleGuard({
  allowedRoles,
  children,
  title = "Access restricted",
}: DemoRoleGuardProps) {
  const { role } = useDemoRole();

  if (!allowedRoles.includes(role)) {
    return (
      <EmptyState
        title={title}
        description={`The ${USER_ROLE_LABELS[role]} role cannot view this page. Use the Demo role dropdown in the header to switch roles and explore who has access to each area.`}
      />
    );
  }

  return <>{children}</>;
}

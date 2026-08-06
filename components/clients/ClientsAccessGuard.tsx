"use client";

import Link from "next/link";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/types";

interface ClientsAccessGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/** Access gate for Clients routes with Client-role redirect guidance. */
export function ClientsAccessGuard({
  allowedRoles,
  children,
}: ClientsAccessGuardProps) {
  const { role } = useDemoRole();

  if (role === "client") {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Access denied"
          description="Client portal users cannot open the firm-wide Clients directory or other clients’ records. Use the Client Portal for your own information."
          moduleLabel="Restricted"
        />
        <div className="flex justify-center">
          <Link href="/client-portal/account-summary">
            <Button>Go to Account Summary</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <EmptyState
        title="Access denied"
        description={`The ${USER_ROLE_LABELS[role]} role cannot view this page.`}
        moduleLabel="Restricted"
      />
    );
  }

  return <>{children}</>;
}

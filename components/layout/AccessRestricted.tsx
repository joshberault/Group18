"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface AccessRestrictedProps {
  attemptedPath?: string;
}

/**
 * Shown when a user navigates directly to a route their demo role cannot access.
 * Production authorization must also be enforced via Supabase Row Level Security.
 */
export function AccessRestricted({ attemptedPath }: AccessRestrictedProps) {
  const { defaultRoute } = useDemoRole();

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 text-gold-500">
        <ShieldX className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold text-navy-900">Access Restricted</h2>
      <p className="mt-2 max-w-md text-sm text-muted">
        Your current demonstration role does not have permission to view this
        page{attemptedPath ? ` (${attemptedPath})` : ""}.
      </p>
      <Badge variant="gold" className="mt-4">
        Demo frontend authorization
      </Badge>
      <Link href={defaultRoute} className="mt-6">
        <Button>Return to Your Workspace</Button>
      </Link>
    </div>
  );
}

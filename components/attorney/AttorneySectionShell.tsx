"use client";

import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { AttorneyDataProvider } from "@/components/attorney/AttorneyDataProvider";
import type { UserRole } from "@/lib/types";

const ATTORNEY_SECTION_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
];

export function AttorneySectionShell({ children }: { children: React.ReactNode }) {
  return (
    <DemoRoleGuard
      allowedRoles={ATTORNEY_SECTION_ROLES}
      title="Attorney workflow restricted"
    >
      <AttorneyDataProvider>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Demo mode — changes save locally in your browser. Switch roles in the header
          to preview access.
        </div>
        {children}
      </AttorneyDataProvider>
    </DemoRoleGuard>
  );
}

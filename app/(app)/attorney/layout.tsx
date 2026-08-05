import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import type { UserRole } from "@/lib/types";

const ATTORNEY_SECTION_ROLES: UserRole[] = [
  "managing_partner",
  "attorney",
  "paralegal",
  "billing_specialist",
];

export default function AttorneySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoRoleGuard
      allowedRoles={ATTORNEY_SECTION_ROLES}
      title="Attorney workflow restricted"
    >
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        Demo mode — use the role dropdown in the header to see who can access
        attorney workflows. Sample data is shown until real auth is added.
      </div>
      {children}
    </DemoRoleGuard>
  );
}

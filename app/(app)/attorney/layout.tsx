import { isDevPreview } from "@/lib/attorney/demo-data";
import { requireStaffRole } from "@/lib/auth/require-role";

export default async function AttorneySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffRole();

  if (isDevPreview()) {
    return (
      <>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Demo preview mode — no login required. Forms won&apos;t save until auth is working.
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}

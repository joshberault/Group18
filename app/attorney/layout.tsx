import { AttorneyShell } from "@/components/layout/AttorneyShell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { isDevPreview } from "@/lib/attorney/demo-data";
import { requireStaffRole } from "@/lib/auth/require-role";

export default async function AttorneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaffRole();
  const preview = isDevPreview();

  return (
    <AttorneyShell>
      {preview && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900">
          Demo preview mode — no login required. Forms won&apos;t save until auth is working.
        </div>
      )}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="font-medium text-brand-700">
            {profile.full_name} · <span className="capitalize">{profile.role}</span>
          </p>
        </div>
        {!preview && <SignOutButton />}
      </header>
      <main className="flex-1 p-6">{children}</main>
    </AttorneyShell>
  );
}

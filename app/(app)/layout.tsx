import { DemoRoleProvider } from "@/components/layout/DemoRoleProvider";
import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoRoleProvider>
      <AppShell>
        <RoleGuard>{children}</RoleGuard>
      </AppShell>
    </DemoRoleProvider>
  );
}

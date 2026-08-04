import { DemoRoleProvider } from "@/components/layout/DemoRoleProvider";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoRoleProvider>
      <AppShell>{children}</AppShell>
    </DemoRoleProvider>
  );
}

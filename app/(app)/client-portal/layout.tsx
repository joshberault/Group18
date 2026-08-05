import { CaseSelectionProvider } from "@/components/client-portal/CaseSelectionProvider";

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CaseSelectionProvider>{children}</CaseSelectionProvider>;
}

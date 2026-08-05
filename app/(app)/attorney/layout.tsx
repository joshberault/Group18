import { AttorneySectionShell } from "@/components/attorney/AttorneySectionShell";

export default function AttorneySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AttorneySectionShell>{children}</AttorneySectionShell>;
}

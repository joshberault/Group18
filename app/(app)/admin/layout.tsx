import { AdminAccessGate } from "@/components/admin/AdminAccessGate";

/** Gates all /admin routes to the Firm Administrator demo role. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminAccessGate>{children}</AdminAccessGate>;
}

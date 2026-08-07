import { AdminDataProvider } from "@/components/admin/AdminDataProvider";
import { ManagerDashboard } from "@/components/admin/ManagerDashboard";
import { PageHeader } from "@/components/ui/PageHeader";
import { DEMO_IDENTITIES } from "@/lib/roles/role-config";

/** Firm Administrator Dashboard — Person 5 daily action center. */
export default function AdminDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Manager Dashboard"
        description="Overview of staffing signals. Use the sidebar sections for detailed work."
      />
      <div className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-base font-semibold text-navy-900">
          Welcome, {DEMO_IDENTITIES.firm_administrator.fullName}
        </p>
        <p className="text-sm text-muted">Role: Administrator</p>
      </div>
      <AdminDataProvider>
        <ManagerDashboard />
      </AdminDataProvider>
    </div>
  );
}

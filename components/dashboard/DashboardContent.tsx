"use client";

import dynamic from "next/dynamic";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";

const loading = () => <LoadingState message="Loading dashboard…" />;

const ParalegalDashboard = dynamic(
  () =>
    import("@/components/dashboard/ParalegalDashboard").then((m) => ({
      default: m.ParalegalDashboard,
    })),
  { loading },
);

const AttorneyDashboard = dynamic(
  () =>
    import("@/components/dashboard/AttorneyDashboard").then((m) => ({
      default: m.AttorneyDashboard,
    })),
  { loading },
);

const AccountingManagerDashboard = dynamic(
  () =>
    import("@/components/accounting-manager/dashboard/AccountingManagerDashboard").then(
      (m) => ({
        default: m.AccountingManagerDashboard,
      }),
    ),
  { loading },
);

const ProspectiveClientDashboard = dynamic(
  () =>
    import("@/components/dashboard/ProspectiveClientDashboard").then((m) => ({
      default: m.ProspectiveClientDashboard,
    })),
  { loading },
);

const FirmDashboardContent = dynamic(
  () =>
    import("@/components/dashboard/FirmDashboardContent").then((m) => ({
      default: m.FirmDashboardContent,
    })),
  { loading },
);

export function DashboardContent() {
  const { role } = useDemoRole();

  switch (role) {
    case "paralegal":
      return <ParalegalDashboard />;
    case "attorney":
      return <AttorneyDashboard />;
    case "accounting_manager":
      return <AccountingManagerDashboard />;
    case "prospective_client":
      return <ProspectiveClientDashboard />;
    default:
      return <FirmDashboardContent />;
  }
}

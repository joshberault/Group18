import { Notifications } from "@/components/client-portal/Notifications";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function NotificationsPage() {
  return (
    <PortalFeatureShell
      title="Notifications"
      description="Requests, case updates, and invoice reminders requiring your attention."
    >
      <Notifications />
    </PortalFeatureShell>
  );
}

import { MyBadges } from "@/components/client-portal/MyBadges";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

export default function MyBadgesPage() {
  return (
    <PortalFeatureShell
      title="My Badges"
      description="See every badge you can earn—and which ones you’ve already unlocked."
    >
      <MyBadges />
    </PortalFeatureShell>
  );
}

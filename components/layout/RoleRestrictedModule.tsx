"use client";

import { DemoRoleGuard } from "@/components/auth/DemoRoleGuard";
import { getNavRoles } from "@/lib/navigation";
import { ModulePlaceholder } from "./ModulePlaceholder";

interface RoleRestrictedModuleProps {
  href: string;
  title: string;
  description: string;
  iconName: string;
}

export function RoleRestrictedModule({
  href,
  ...placeholderProps
}: RoleRestrictedModuleProps) {
  return (
    <DemoRoleGuard allowedRoles={getNavRoles(href)}>
      <ModulePlaceholder {...placeholderProps} />
    </DemoRoleGuard>
  );
}

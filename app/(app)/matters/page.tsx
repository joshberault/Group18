import { RoleRestrictedModule } from "@/components/layout/RoleRestrictedModule";

export default function MattersPage() {
  return (
    <RoleRestrictedModule
      href="/matters"
      title="Matters"
      description="Track legal matters, engagement terms, responsible attorneys, and matter lifecycle status."
      iconName="briefcase"
    />
  );
}

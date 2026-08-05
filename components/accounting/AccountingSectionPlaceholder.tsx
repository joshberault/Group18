import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface AccountingSectionPlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function AccountingSectionPlaceholder({
  title,
  description,
  icon,
}: AccountingSectionPlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${title} — under development`}
        description="This Accounting Manager workspace section is being built on the Accounting branch. The navigation and route are in place for integration with live data later."
        moduleLabel="Accounting Manager module — in development"
        icon={icon}
      />
    </>
  );
}

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
        title={`${title}`}
        description="This accounting workspace section is available to the Accounting Manager role. Switch to Accounting Manager or open the linked module from your dashboard."
        moduleLabel="Accounting workspace"
        icon={icon}
      />
    </>
  );
}

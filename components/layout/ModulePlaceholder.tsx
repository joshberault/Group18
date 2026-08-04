import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Calculator,
  Clock,
  FileText,
  ListTodo,
  Receipt,
  UserCircle,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  briefcase: Briefcase,
  clock: Clock,
  tasks: ListTodo,
  billing: Receipt,
  invoices: FileText,
  accounting: Calculator,
  reports: BarChart3,
  portal: UserCircle,
};

interface ModulePlaceholderProps {
  title: string;
  description: string;
  iconName: string;
}

export function ModulePlaceholder({
  title,
  description,
  iconName,
}: ModulePlaceholderProps) {
  const Icon = iconMap[iconName] ?? Briefcase;

  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`${title} module`}
        description={`This module will support ${title.toLowerCase()} workflows as part of the contract-to-cash process. Feature development will be completed on a dedicated teammate branch.`}
        moduleLabel="Ready for feature development"
        icon={<Icon className="h-7 w-7" />}
      />
    </>
  );
}

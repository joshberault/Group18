"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PortalCaseSelector } from "@/components/client-portal/PortalCaseSelector";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";

interface PortalFeatureShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PortalFeatureShell({
  title,
  description,
  children,
}: PortalFeatureShellProps) {
  const { selectedRole } = useDemoRole();
  const showHubBackLink = selectedRole !== "client";

  return (
    <>
      {showHubBackLink && (
        <div className="mb-4">
          <Link
            href="/client-portal"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-900 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Client Portal
          </Link>
        </div>
      )}
      <PageHeader title={title} description={description} />
      <PortalCaseSelector />
      {children}
    </>
  );
}

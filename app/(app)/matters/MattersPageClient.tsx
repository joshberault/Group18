"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AccountingManagerMattersView } from "@/components/accounting-manager/matters/AccountingManagerMattersView";
import { BillingSpecialistMattersView } from "@/components/matters/BillingSpecialistMattersView";
import { FirmAdministratorMattersView } from "@/components/matters/FirmAdministratorMattersView";
import { ManagingPartnerMattersView } from "@/components/matters/ManagingPartnerMattersView";
import { MatterRegisterList } from "@/components/matters/MatterRegisterList";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { MatterWorkspace } from "@/components/matters/MatterWorkspace";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

function MattersPageContent() {
  const { selectedRole } = useDemoRole();

  if (selectedRole === "accounting_manager") {
    return <AccountingManagerMattersView />;
  }

  if (selectedRole === "managing_partner") {
    return (
      <Suspense
        fallback={
          <PageHeader
            title="Firm Matters"
            description="Loading firm-wide matter register…"
          />
        }
      >
        <ManagingPartnerMattersView />
      </Suspense>
    );
  }

  if (selectedRole === "billing_specialist") {
    return <BillingSpecialistMattersView />;
  }

  if (selectedRole === "firm_administrator") {
    return (
      <Suspense
        fallback={
          <PageHeader
            title="Matters"
            description="Loading matter administration…"
          />
        }
      >
        <FirmAdministratorMattersView />
      </Suspense>
    );
  }

  if (selectedRole === "paralegal") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Matters"
          description="Open a matter for tasks, documents, client details, and case notes. Case work modules remain below."
        >
          <Link href="/attorney/matters">
            <Button variant="secondary">Open in Attorney Hub</Button>
          </Link>
        </PageHeader>

        <MatterRegisterList
          title="Assigned matters"
          description="Click a matter to open the shared matter detail screen."
          strictAssigneeFilter
        />

        <MatterWorkspace />
      </div>
    );
  }

  if (selectedRole === "attorney") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Matters"
          description="Open a matter for tasks, documents, client details, and case notes."
        >
          <Link href="/attorney/matters">
            <Button variant="secondary">View matter cards</Button>
          </Link>
        </PageHeader>

        <MatterRegisterList
          title="Your matters"
          description="Click a matter to open the shared matter detail screen."
          strictAssigneeFilter
        />

        <MatterWorkspace />
      </div>
    );
  }

  return null;
}

export function MattersPageClient() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted">Loading matters…</p>}>
      <MattersPageContent />
    </Suspense>
  );
}

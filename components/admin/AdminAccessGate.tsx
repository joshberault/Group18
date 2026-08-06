"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { USER_ROLE_LABELS } from "@/lib/types";

/**
 * Demo-only gate for Person 5 Admin/Staff Information.
 * Not production authorization — switch Demo role to Firm Administrator.
 */
export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { role, setRole } = useDemoRole();

  if (role === "firm_administrator") {
    return <>{children}</>;
  }

  return (
    <Card className="border-amber-200 bg-amber-50" padding="lg">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-500">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </div>
        <CardTitle className="text-navy-900">
          Firm Administrator demo role required
        </CardTitle>
        <CardDescription className="text-navy-800">
          Admin/Staff Information (employees, assignments, approvals, workload,
          and roles) is available under the{" "}
          <strong>Firm Administrator</strong> demo role. Your current demo role
          is <strong>{USER_ROLE_LABELS[role]}</strong>.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setRole("firm_administrator")}>
          Switch to Firm Administrator
        </Button>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">
        Demo gate only — not server-enforced security. Use the Demo role
        control in the header anytime.
      </p>
    </Card>
  );
}

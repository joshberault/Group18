"use client";

import {
  AlertTriangle,
  Building2,
  UserRound,
  Users,
  ShieldAlert,
} from "lucide-react";
import { KPICard } from "@/components/ui/KPICard";
import type { FirmClient } from "@/lib/clients/types";
import { summarizeClients } from "@/lib/clients/utils";

export function ClientSummaryCards({ clients }: { clients: FirmClient[] }) {
  const summary = summarizeClients(clients);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KPICard title="Total clients" value={String(summary.total)} icon={Users} />
      <KPICard
        title="Active"
        value={String(summary.active)}
        icon={ShieldAlert}
        subtitle="Currently engaged / available"
      />
      <KPICard
        title="Individuals"
        value={String(summary.individual)}
        icon={UserRound}
      />
      <KPICard
        title="Companies"
        value={String(summary.company)}
        icon={Building2}
      />
      <KPICard
        title="Conflict alerts"
        value={String(summary.conflictAlerts)}
        icon={AlertTriangle}
        subtitle="Pending or possible conflict"
      />
    </div>
  );
}

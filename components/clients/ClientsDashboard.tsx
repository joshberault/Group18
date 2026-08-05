"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClientSummaryCards } from "@/components/clients/ClientSummaryCards";
import {
  ClientFilters,
  applyClientFilters,
  type ClientFilterState,
} from "@/components/clients/ClientFilters";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientScheduleCalendar } from "@/components/clients/ClientScheduleCalendar";
import { ClientsAccessGuard } from "@/components/clients/ClientsAccessGuard";
import {
  filterClientsForRole,
  getClientPermissions,
} from "@/lib/clients/permissions";
import { CLIENTS_MODULE_ROLES } from "@/lib/clients/types";
import type { ClientScheduleEvent, FirmClient } from "@/lib/clients/types";
import { fetchClients, fetchScheduleEvents } from "@/lib/clients/queries";
import { USER_ROLE_LABELS } from "@/lib/types";

export function ClientsDashboard() {
  const { role } = useDemoRole();
  const permissions = getClientPermissions(role);

  const [clients, setClients] = useState<FirmClient[]>([]);
  const [events, setEvents] = useState<ClientScheduleEvent[]>([]);
  const [scheduleMonth, setScheduleMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientFilterState>({
    search: "",
    status: "all",
    type: "all",
    conflict: "all",
  });

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    const clientResult = await fetchClients();
    if (clientResult.error) setError(clientResult.error);
    setClients(clientResult.data);
    setLoading(false);
  }, []);

  const loadSchedule = useCallback(async (month: Date) => {
    const scheduleResult = await fetchScheduleEvents(month);
    setEvents(scheduleResult.data);
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  useEffect(() => {
    void loadSchedule(scheduleMonth);
  }, [loadSchedule, scheduleMonth]);

  const visibleClients = useMemo(() => {
    // assignedClientIds reserved for future attorney/paralegal matter scoping
    const scoped = filterClientsForRole(clients, role, /* assignedClientIds */ []);
    return applyClientFilters(scoped, filters);
  }, [clients, role, filters]);

  return (
    <ClientsAccessGuard allowedRoles={CLIENTS_MODULE_ROLES}>
      <div className="space-y-6">
        <PageHeader
          title="Clients"
          description="Create, search, and maintain client records. Identify conflict risks before legal work begins."
        >
          {permissions.canCreate && (
            <Link href="/clients/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </Link>
          )}
        </PageHeader>

        {loading ? (
          <LoadingState message="Loading clients..." />
        ) : error ? (
          <EmptyState title="Unable to load clients" description={error} />
        ) : (
          <>
            <ClientSummaryCards clients={visibleClients} />

            <ClientFilters value={filters} onChange={setFilters} />

            {visibleClients.length === 0 ? (
              <EmptyState
                title={clients.length === 0 ? "No clients yet" : "No matching clients"}
                description={
                  clients.length === 0
                    ? permissions.canCreate
                      ? "Add the firm’s first client to get started."
                      : "No client records are available for this role yet."
                    : "Try adjusting search or filters."
                }
              />
            ) : (
              <ClientTable clients={visibleClients} permissions={permissions} />
            )}

            <ClientScheduleCalendar
              events={events}
              roleLabel={USER_ROLE_LABELS[role]}
              month={scheduleMonth}
              onMonthChange={setScheduleMonth}
            />
          </>
        )}
      </div>
    </ClientsAccessGuard>
  );
}

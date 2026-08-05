"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ConflictCheckStatus } from "@/lib/clients/types";
import { CONFLICT_STATUS_LABELS } from "@/lib/clients/types";

export type ClientFilterState = {
  search: string;
  status: "all" | "active" | "inactive";
  type: "all" | "individual" | "company";
  conflict: "all" | ConflictCheckStatus;
};

interface ClientFiltersProps {
  value: ClientFilterState;
  onChange: (next: ClientFilterState) => void;
}

export function ClientFilters({ value, onChange }: ClientFiltersProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Input
        label="Search"
        placeholder="Number, name, company, contact, email..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
      />
      <Select
        label="Status"
        value={value.status}
        onChange={(e) =>
          onChange({
            ...value,
            status: e.target.value as ClientFilterState["status"],
          })
        }
        options={[
          { value: "all", label: "All clients" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />
      <Select
        label="Client type"
        value={value.type}
        onChange={(e) =>
          onChange({
            ...value,
            type: e.target.value as ClientFilterState["type"],
          })
        }
        options={[
          { value: "all", label: "All types" },
          { value: "individual", label: "Individual" },
          { value: "company", label: "Company" },
        ]}
      />
      <Select
        label="Conflict status"
        value={value.conflict}
        onChange={(e) =>
          onChange({
            ...value,
            conflict: e.target.value as ClientFilterState["conflict"],
          })
        }
        options={[
          { value: "all", label: "All conflict statuses" },
          ...(
            Object.entries(CONFLICT_STATUS_LABELS) as [ConflictCheckStatus, string][]
          ).map(([v, label]) => ({ value: v, label })),
        ]}
      />
    </div>
  );
}

export function applyClientFilters(
  clients: import("@/lib/clients/types").FirmClient[],
  filters: ClientFilterState,
) {
  const q = filters.search.trim().toLowerCase();
  return clients.filter((client) => {
    if (filters.status !== "all" && client.status !== filters.status) return false;
    if (filters.type !== "all" && client.client_type !== filters.type) return false;
    if (filters.conflict !== "all" && client.conflict_check_status !== filters.conflict) {
      return false;
    }
    if (!q) return true;
    const haystack = [
      client.client_number,
      client.name,
      client.company_name,
      client.first_name,
      client.last_name,
      client.primary_contact_name,
      client.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

import { createClientSafe } from "@/lib/supabase/client";
import { calculateUtilizationRate } from "@/lib/admin/calculations";

export interface UtilizationSummary {
  billableHours: number;
  proBonoHours: number;
  totalHours: number;
  availableHours: number;
  utilizationRate: number;
  attorneyCount: number;
}

const DEFAULT_CAPACITY_PER_ATTORNEY = 40;

/**
 * Firm-wide utilization from Supabase time_entries (billable vs pro bono).
 */
export async function fetchUtilizationSummary(): Promise<{
  data: UtilizationSummary | null;
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const [timeRes, profilesRes] = await Promise.all([
    supabase
      .from("time_entries")
      .select("hours, is_billable, status, profile_id")
      .in("status", ["approved", "pending"]),
    supabase
      .from("profiles")
      .select("id, role")
      .in("role", ["attorney", "managing_partner", "paralegal"]),
  ]);

  if (timeRes.error) {
    return { data: null, error: timeRes.error.message };
  }

  let billableHours = 0;
  let proBonoHours = 0;
  for (const row of timeRes.data ?? []) {
    const hrs = Number(row.hours) || 0;
    if (row.is_billable) billableHours += hrs;
    else proBonoHours += hrs;
  }

  const attorneyCount = (profilesRes.data ?? []).length;
  const availableHours = attorneyCount * DEFAULT_CAPACITY_PER_ATTORNEY;
  const utilizationRate = calculateUtilizationRate(billableHours, availableHours);

  return {
    data: {
      billableHours: Math.round(billableHours * 10) / 10,
      proBonoHours: Math.round(proBonoHours * 10) / 10,
      totalHours: Math.round((billableHours + proBonoHours) * 10) / 10,
      availableHours,
      utilizationRate,
      attorneyCount,
    },
    error: null,
  };
}

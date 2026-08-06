import { createClientSafe } from "@/lib/supabase/client";

export function getAccountingSupabase() {
  return createClientSafe();
}

export function accountingUnavailableMessage(): string {
  return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.";
}

export function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type QueryResult<T> = {
  data: T;
  error: string | null;
  empty: boolean;
};

export async function logAuditEvent(input: {
  actorName: string;
  actorRole: string;
  module: string;
  action: string;
  recordType: string;
  recordId: string;
  description: string;
  riskLevel?: string;
  beforeValue?: string;
  afterValue?: string;
  reason?: string;
}): Promise<void> {
  const supabase = getAccountingSupabase();
  if (!supabase) return;
  await supabase.from("audit_events").insert({
    actor_name: input.actorName,
    actor_role: input.actorRole,
    module: input.module,
    action: input.action,
    record_type: input.recordType,
    record_id: input.recordId,
    description: input.description,
    risk_level: input.riskLevel ?? "Low",
    before_value: input.beforeValue ?? null,
    after_value: input.afterValue ?? null,
    reason: input.reason ?? null,
  });
}

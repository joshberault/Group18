import {
  accountingUnavailableMessage,
  getAccountingSupabase,
  type QueryResult,
} from "./db";
import type { AuditEvent } from "@/lib/mock-data/accounting-manager/audit";

export async function fetchAuditEvents(): Promise<QueryResult<AuditEvent[]>> {
  const supabase = getAccountingSupabase();
  if (!supabase) {
    return { data: [], error: accountingUnavailableMessage(), empty: true };
  }

  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .order("event_timestamp", { ascending: false })
    .limit(200);

  if (error) {
    return { data: [], error: error.message, empty: true };
  }

  const rows: AuditEvent[] = (data ?? []).map((e) => ({
    id: e.id as string,
    timestamp: e.event_timestamp as string,
    user: e.actor_name as string,
    role: (e.actor_role as string) ?? "",
    module: e.module as AuditEvent["module"],
    action: e.action as AuditEvent["action"],
    recordType: e.record_type as string,
    recordId: e.record_id as string,
    description: e.description as string,
    riskLevel: e.risk_level as AuditEvent["riskLevel"],
    ipOrSession: (e.ip_or_session as string) ?? "",
    reviewStatus: e.review_status as AuditEvent["reviewStatus"],
    flagged: Boolean(e.flagged),
    reviewNote: (e.review_note as string) ?? undefined,
    detail: {
      beforeValue: (e.before_value as string) ?? undefined,
      afterValue: (e.after_value as string) ?? undefined,
      reason: (e.reason as string) ?? undefined,
      relatedRecord: (e.related_record as string) ?? undefined,
      sourceModule: (e.source_module as string) ?? undefined,
      sessionReference: (e.ip_or_session as string) ?? "session",
    },
  }));

  return { data: rows, error: null, empty: rows.length === 0 };
}

import type { EngagementFeeType } from "@/lib/matters/firm-portfolio";
import { createClientSafe } from "@/lib/supabase/client";

export type ScopeChecklistItem = {
  id: string;
  label: string;
  default?: boolean;
};

export type EngagementTemplate = {
  id: string;
  practiceAreaId: string;
  practiceAreaName: string;
  caseType: string | null;
  name: string;
  feeType: EngagementFeeType;
  hourlyRate: number | null;
  flatFeeAmount: number | null;
  scopeChecklist: ScopeChecklistItem[];
  letterBody: string;
  isActive: boolean;
};

type TemplateRow = {
  id: string;
  practice_area_id: string;
  case_type: string | null;
  name: string;
  fee_type: string;
  hourly_rate: number | string | null;
  flat_fee_amount: number | string | null;
  scope_checklist: ScopeChecklistItem[] | null;
  letter_body: string;
  is_active: boolean;
  practice_area?: { name?: string | null } | { name?: string | null }[] | null;
  practice_areas?: { name?: string | null } | { name?: string | null }[] | null;
};

function mapFeeType(raw: string): EngagementFeeType {
  const t = raw.toLowerCase();
  if (t === "flat") return "flat";
  if (t === "contingency") return "contingency";
  if (t === "retainer") return "retainer";
  if (t === "hybrid") return "hybrid";
  return "hourly";
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function practiceAreaNameFromEmbed(
  embed: { name?: string | null } | { name?: string | null }[] | null | undefined,
): string {
  if (!embed) return "General";
  if (Array.isArray(embed)) {
    return embed[0]?.name?.trim() || "General";
  }
  return embed.name?.trim() || "General";
}

function mapTemplateRow(row: TemplateRow): EngagementTemplate {
  const practiceAreaName =
    practiceAreaNameFromEmbed(row.practice_area) !== "General"
      ? practiceAreaNameFromEmbed(row.practice_area)
      : practiceAreaNameFromEmbed(row.practice_areas);

  return {
    id: String(row.id),
    practiceAreaId: String(row.practice_area_id),
    practiceAreaName,
    caseType: row.case_type,
    name: row.name,
    feeType: mapFeeType(row.fee_type),
    hourlyRate: toNumber(row.hourly_rate),
    flatFeeAmount: toNumber(row.flat_fee_amount),
    scopeChecklist: Array.isArray(row.scope_checklist) ? row.scope_checklist : [],
    letterBody: row.letter_body ?? "",
    isActive: row.is_active !== false,
  };
}

export async function fetchTemplates(options?: {
  practiceAreaId?: string;
  practiceAreaName?: string;
}): Promise<{ templates: EngagementTemplate[]; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { templates: [], error: "Supabase unavailable" };
  }

  let query = supabase
    .from("engagement_templates")
    .select(
      "id, practice_area_id, case_type, name, fee_type, hourly_rate, flat_fee_amount, scope_checklist, letter_body, is_active, practice_area:practice_areas ( name )",
    )
    .eq("is_active", true)
    .order("name");

  if (options?.practiceAreaId) {
    query = query.eq("practice_area_id", options.practiceAreaId);
  }

  const { data, error } = await query;
  if (error) {
    return { templates: [], error: error.message };
  }

  let templates = (data ?? []).map((row) =>
    mapTemplateRow(row as unknown as TemplateRow),
  );

  if (options?.practiceAreaName) {
    const target = options.practiceAreaName.trim().toLowerCase();
    templates = templates.filter(
      (t) => t.practiceAreaName.toLowerCase() === target,
    );
  }

  return { templates, error: null };
}

export async function getTemplateById(
  id: string,
): Promise<{ template: EngagementTemplate | null; error: string | null }> {
  const supabase = createClientSafe();
  if (!supabase) {
    return { template: null, error: "Supabase unavailable" };
  }

  const { data, error } = await supabase
    .from("engagement_templates")
    .select(
      "id, practice_area_id, case_type, name, fee_type, hourly_rate, flat_fee_amount, scope_checklist, letter_body, is_active, practice_area:practice_areas ( name )",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { template: null, error: error.message };
  }

  if (!data) {
    return { template: null, error: null };
  }

  return { template: mapTemplateRow(data as unknown as TemplateRow), error: null };
}

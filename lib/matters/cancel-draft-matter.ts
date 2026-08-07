import { createClientSafe } from "@/lib/supabase/client";
import {
  setMatterLifecycle,
  updateFirmPortfolioMatter,
} from "@/lib/matters/firm-portfolio-store";

export async function cancelDraftMatter(matterId: string): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const supabase = createClientSafe();
  if (supabase) {
    const { error } = await supabase
      .from("matters")
      .update({
        status: "closed",
        activation_status: "draft",
      })
      .eq("id", matterId);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  updateFirmPortfolioMatter(matterId, {
    activationStatus: "draft",
  });
  setMatterLifecycle(matterId, "archived");

  return { ok: true, error: null };
}

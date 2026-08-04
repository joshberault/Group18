import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEMO_PROFILE, isDevPreview } from "@/lib/attorney/demo-data";
import { STAFF_ROLES, type Profile, type UserRole } from "@/types/database";

export async function requireStaffRole(): Promise<Profile> {
  if (isDevPreview()) {
    return DEMO_PROFILE;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/attorney/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || !STAFF_ROLES.includes(profile.role as UserRole)) {
    redirect("/?error=unauthorized");
  }

  return profile as Profile;
}

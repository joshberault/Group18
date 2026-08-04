import { MatterCard } from "@/components/attorney/MatterCard";
import { DEMO_MATTERS, isDevPreview } from "@/lib/attorney/demo-data";
import { extractMatters } from "@/lib/attorney/queries";
import { createClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth/require-role";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
export default async function AttorneyMattersPage() {
  const profile = await requireStaffRole();

  let matters = DEMO_MATTERS;

  if (!isDevPreview()) {
    const supabase = await createClient();
    const { data: assignments } = await supabase
      .from("matter_assignments")
      .select(
        `
        matter:matters (
          id,
          title,
          description,
          status,
          billing_type,
          hourly_rate,
          fixed_fee_amount,
          retainer_amount,
          retainer_balance,
          expense_terms,
          client:clients ( id, name, email, company_name, conflict_flag ),
          practice_area:practice_areas ( name )
        )
      `
      )
      .eq("profile_id", profile.id);

    matters = extractMatters(assignments);
  }

  return (
    <div>
      <PageHeader
        title="My Matters"
        description="Assigned cases with billing arrangements for your attorney workflow."
      />

      {matters.length === 0 ? (
        <EmptyState
          title="No assigned matters yet"
          description="Create your Supabase user, set role to attorney, and run seed_assignments.sql."
        />
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {matters.map((matter) => (
            <MatterCard key={matter.id} matter={matter} />
          ))}
        </div>
      )}
    </div>
  );
}

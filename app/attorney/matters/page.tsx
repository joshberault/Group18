import { MatterCard } from "@/components/attorney/MatterCard";
import { DEMO_MATTERS, isDevPreview } from "@/lib/attorney/demo-data";
import { extractMatters } from "@/lib/attorney/queries";
import { createClient } from "@/lib/supabase/server";
import { requireStaffRole } from "@/lib/auth/require-role";

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
      <h1 className="text-2xl font-bold text-brand-700">My Matters</h1>
      <p className="mt-1 text-slate-600">
        Assigned cases with billing arrangements.
      </p>

      {matters.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
          <p className="font-medium text-brand-700">No assigned matters yet</p>
        </div>
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

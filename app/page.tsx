import Link from "next/link";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
        Group 18 · Law Firm System
      </p>
      <h1 className="mt-2 text-4xl font-bold text-brand-700">Attorney Workflow</h1>
      <p className="mt-4 text-slate-600">
        George Giddens feature branch. Staff users can access assigned matters, log time,
        and submit reimbursable expenses for manager approval.
      </p>

      {params.error === "login-required" && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Please <Link href="/login" className="font-medium underline">sign in</Link> to access
          the attorney workflow.
        </div>
      )}

      {params.error === "unauthorized" && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Access denied. Attorney workflow is restricted to staff roles only. Clients are
          redirected here.
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/attorney/dashboard"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          View Attorney Dashboard (Demo)
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        <p className="font-medium text-brand-700">First-time setup</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Create a user in Supabase Auth (Authentication → Users).</li>
          <li>Set role to <strong>attorney</strong> in the profiles table.</li>
          <li>Run the assignment SQL in <code>supabase/seed_assignments.sql</code>.</li>
          <li>Sign in at <Link href="/login" className="underline">/login</Link>.</li>
        </ol>
      </div>
    </main>
  );
}

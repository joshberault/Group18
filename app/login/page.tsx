import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
          Group 18 Law Firm
        </p>
        <h1 className="mt-2 text-2xl font-bold text-brand-700">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Temporary login for attorney workflow testing. Your auth teammate can replace
          this later.
        </p>

        {params.error === "auth-callback-failed" && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Email link failed or expired. Sign in with your password below instead.
          </p>
        )}

        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <Link href="/" className="mt-4 text-center text-sm text-slate-500 hover:text-brand-700">
        Back to home
      </Link>
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="w-full max-w-md" padding="lg">
        <div className="mb-8 text-center">
          <p className="text-xl font-bold text-gold-500">CounselFlow</p>
          <h1 className="mt-2 text-2xl font-semibold text-navy-900">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Law Firm Matter and Revenue Management
          </p>
        </div>

        {params.error === "auth-callback-failed" && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Email link failed or expired. Sign in with your password below.
          </p>
        )}

        <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
          <LoginForm />
        </Suspense>

        <div className="mt-4 space-y-2">
          <Link href="/attorney/dashboard" className="block">
            <Button variant="secondary" className="w-full" type="button">
              Continue to Attorney Dashboard (Demo)
            </Button>
          </Link>
          <Link href="/dashboard" className="block text-center text-sm text-muted hover:text-navy-900">
            Back to firm dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
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

        <form className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@firm.com"
            disabled
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            disabled
          />
          <p className="text-xs text-muted">
            Authentication will be connected to Supabase on a future branch.
            For now, use the dashboard to explore the application foundation.
          </p>
          <Link href="/dashboard" className="block">
            <Button className="w-full" type="button">
              Continue to Dashboard (Demo)
            </Button>
          </Link>
        </form>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Briefcase, Clock, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  DEMO_MATTERS,
  DEMO_TASKS,
  DEMO_TIME_ENTRIES,
  isDevPreview,
} from "@/lib/attorney/demo-data";
import { createClient } from "@/lib/supabase/server";

export default async function AttorneyDashboardPage() {
  const profile = await requireStaffRole();

  let matterCount = DEMO_MATTERS.length;
  let pendingTime = DEMO_TIME_ENTRIES.filter((e) => e.status === "pending").length;
  let openTasks = DEMO_TASKS.filter((t) => t.status !== "completed").length;

  if (!isDevPreview()) {
    const supabase = await createClient();
    const [{ count: m }, { count: t }, { count: tasks }] = await Promise.all([
      supabase
        .from("matter_assignments")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id),
      supabase
        .from("time_entries")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("status", "pending"),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .neq("status", "completed"),
    ]);
    matterCount = m ?? 0;
    pendingTime = t ?? 0;
    openTasks = tasks ?? 0;
  }

  const cards = [
    { label: "Assigned matters", value: String(matterCount), href: "/attorney/matters", icon: Briefcase },
    { label: "Pending time entries", value: String(pendingTime), href: "/attorney/time", icon: Clock },
    { label: "Open tasks", value: String(openTasks), href: "/attorney/tasks", icon: ListTodo },
  ];

  return (
    <div>
      <PageHeader
        title="Attorney Hub"
        description={`Welcome back, ${profile.full_name}. Track matters, time, and tasks.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="block transition hover:opacity-95">
            <KPICard title={card.label} value={card.value} icon={card.icon} />
          </Link>
        ))}
      </div>
    </div>
  );
}

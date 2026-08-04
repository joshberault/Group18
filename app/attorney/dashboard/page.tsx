import Link from "next/link";
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
    { label: "Assigned matters", value: matterCount, href: "/attorney/matters" },
    { label: "Pending time entries", value: pendingTime, href: "/attorney/time" },
    { label: "Open tasks", value: openTasks, href: "/attorney/tasks" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-700">Attorney Dashboard</h1>
      <p className="mt-1 text-slate-600">
        Daily work hub for matters, time, expenses, and tasks.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-brand-700">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

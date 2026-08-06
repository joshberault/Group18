"use client";

import Link from "next/link";
import { Briefcase, Clock, ListTodo } from "lucide-react";
import { AttorneyCalendar } from "@/components/attorney/AttorneyCalendar";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { ParalegalAttorneyHub } from "@/components/paralegal/ParalegalAttorneyHub";
import { PageHeader } from "@/components/ui/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import {
  DEMO_ATTORNEY_TITLE,
  DEMO_MATTERS,
  DEMO_PROFILE,
  DEMO_TASKS,
  DEMO_TIME_ENTRIES,
} from "@/lib/attorney/demo-data";

export default function AttorneyDashboardPage() {
  const { role } = useDemoRole();
  if (role === "paralegal") {
    return <ParalegalAttorneyHub />;
  }

  const matterCount = DEMO_MATTERS.length;
  const pendingTime = DEMO_TIME_ENTRIES.filter((e) => e.status === "pending").length;
  const openTasks = DEMO_TASKS.filter((t) => t.status !== "completed").length;

  const cards = [
    { label: "Assigned matters", value: String(matterCount), href: "/attorney/matters", icon: Briefcase },
    { label: "Pending time entries", value: String(pendingTime), href: "/attorney/time", icon: Clock },
    { label: "Open tasks", value: String(openTasks), href: "/attorney/tasks", icon: ListTodo },
  ];

  return (
    <div>
      <PageHeader
        title="Attorney Hub"
        description={`Welcome back, ${DEMO_PROFILE.full_name}, ${DEMO_ATTORNEY_TITLE}. Track matters, time, and tasks.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="block transition hover:opacity-95">
            <KPICard title={card.label} value={card.value} icon={card.icon} />
          </Link>
        ))}
      </div>

      <AttorneyCalendar />
    </div>
  );
}

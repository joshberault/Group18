"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarPageClient } from "./CalendarPageClient";
import { useDemoRole } from "@/components/layout/DemoRoleProvider";
import { LoadingState } from "@/components/ui/LoadingState";

function CalendarPageBody() {
  const router = useRouter();
  const { selectedRole } = useDemoRole();

  useEffect(() => {
    if (selectedRole === "managing_partner") {
      router.replace("/attorney/tasks?view=calendar");
    }
  }, [router, selectedRole]);

  if (selectedRole === "managing_partner") {
    return <LoadingState message="Opening Tasks & Deadlines…" />;
  }

  return <CalendarPageClient />;
}

export default function AttorneyCalendarPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading calendar…" />}>
      <CalendarPageBody />
    </Suspense>
  );
}

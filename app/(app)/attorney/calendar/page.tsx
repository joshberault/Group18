import { Suspense } from "react";
import { CalendarPageClient } from "./CalendarPageClient";

export default function AttorneyCalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageClient />
    </Suspense>
  );
}

import { TimeEntriesPageClient } from "./TimeEntriesPageClient";
import {
  DEMO_MATTERS,
  DEMO_PROFILE,
  DEMO_TIME_ENTRIES,
} from "@/lib/attorney/demo-data";

export default function AttorneyTimePage() {
  return (
    <TimeEntriesPageClient
      profileId={DEMO_PROFILE.id}
      initialMatters={DEMO_MATTERS}
      initialEntries={DEMO_TIME_ENTRIES}
      previewMode
    />
  );
}

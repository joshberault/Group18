import { Suspense } from "react";
import { MatterDetailPageClient } from "./MatterDetailPageClient";
import { LoadingState } from "@/components/ui/LoadingState";

export default function MatterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<LoadingState message="Loading matter…" />}>
      <MatterDetailPageClient params={params} />
    </Suspense>
  );
}

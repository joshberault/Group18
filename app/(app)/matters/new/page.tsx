"use client";

import { Suspense } from "react";
import { NewMatterView } from "@/components/matters/NewMatterView";
import { LoadingState } from "@/components/ui/LoadingState";

export default function NewMatterPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading matter form…" />}>
      <NewMatterView />
    </Suspense>
  );
}

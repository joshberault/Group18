"use client";

import { use } from "react";
import { SharedMatterDetailScreen } from "@/components/matters/SharedMatterDetailScreen";

export function MatterDetailPageClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SharedMatterDetailScreen matterId={id} />;
}

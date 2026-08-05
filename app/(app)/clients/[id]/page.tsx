"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ClientDetailView } from "@/components/clients/ClientDetailView";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <Suspense fallback={<LoadingState message="Loading client..." />}>
      <ClientDetailView clientId={id} />
    </Suspense>
  );
}

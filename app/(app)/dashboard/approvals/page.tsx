"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";

/** Legacy route — approval queue lives on the Managing Partner dashboard. */
export default function ApprovalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard#approval-queue");
  }, [router]);

  return <LoadingState message="Opening approval queue..." />;
}

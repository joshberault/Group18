"use client";

import { useSearchParams } from "next/navigation";
import {
  PipelineHandoffBanner,
  PipelineHandoffLink,
} from "@/components/pipeline/PipelineHandoffBanner";
import { buildGenerateInvoiceUrl } from "@/lib/pipeline/contract-to-cash";

export function ApprovalsPipelineBanner() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted");

  if (submitted !== "time-entry") return null;

  return (
    <PipelineHandoffBanner
      stage="work_completed"
      title="Time entry submitted for manager approval."
    >
      <p>
        After approving time entries below, open{" "}
        <PipelineHandoffLink href={buildGenerateInvoiceUrl()}>
          Create Invoice
        </PipelineHandoffLink>{" "}
        to bill the client.
      </p>
    </PipelineHandoffBanner>
  );
}

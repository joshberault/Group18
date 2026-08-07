import Link from "next/link";
import type { ReactNode } from "react";
import type { PipelineStage } from "@/lib/demo/fifteen-clients";
import {
  pipelineNextActorLabel,
  pipelineNextStepLabel,
  pipelineStepLabel,
} from "@/lib/pipeline/contract-to-cash";

export function PipelineHandoffBanner({
  stage,
  title,
  children,
  tone = "success",
}: {
  stage: PipelineStage;
  title: string;
  children?: ReactNode;
  tone?: "success" | "info";
}) {
  const nextActor = pipelineNextActorLabel(stage);
  const toneClasses =
    tone === "info"
      ? "border-navy-200 bg-navy-50 text-navy-900"
      : "border-green-200 bg-green-50 text-green-900";

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${toneClasses}`}>
      <p className="font-medium">
        {pipelineStepLabel(stage)} — {title}
      </p>
      <p className="mt-1 text-muted">
        Next pipeline step: {pipelineNextStepLabel(stage)}
        {nextActor ? ` (${nextActor})` : ""}.
      </p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

export function PipelineHandoffLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium underline underline-offset-2 hover:opacity-90"
    >
      {children}
    </Link>
  );
}

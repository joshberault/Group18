"use client";

import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { IntakeQueueView } from "@/components/intake/IntakeQueueView";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

/** Intake and approval queues embedded on MP / Firm Admin dashboards. */
export function FirmOperationsQueues() {
  return (
    <div className="mb-6 space-y-6">
      <section id="approval-queue">
        <ApprovalQueue />
      </section>

      <section id="intake-queue">
        <Card className="mb-4 border-0 bg-transparent p-0 shadow-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Intake Queue</CardTitle>
            <CardDescription>
              Prospective client consultation requests — screen, schedule, convert,
              or close without engagement.
            </CardDescription>
          </CardHeader>
        </Card>
        <IntakeQueueView />
      </section>
    </div>
  );
}

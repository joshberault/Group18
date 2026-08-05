import { Badge } from "@/components/ui/Badge";
import type { ConflictCheckStatus } from "@/lib/clients/types";
import { conflictBadgeVariant, conflictLabel } from "@/lib/clients/utils";

export function ConflictBadge({ status }: { status: ConflictCheckStatus }) {
  return (
    <Badge variant={conflictBadgeVariant(status)}>{conflictLabel(status)}</Badge>
  );
}

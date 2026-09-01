import { StatusPill } from "@/components/shared/status-pill";
import { operationStatusPresentation } from "@/lib/utils/status";
import type { OperationStatus } from "@/types/domain";

export function OperationStatusBadge({ status }: { status: OperationStatus }) {
  const { label, tone } = operationStatusPresentation(status);
  return <StatusPill label={label} tone={tone} />;
}

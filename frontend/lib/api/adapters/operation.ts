import type { OperationResponse } from "@/schemas/operation";
import type { Operation } from "@/types/domain";

export function toOperation(raw: OperationResponse): Operation {
  return {
    id: raw.id,
    correlationId: raw.correlation_id,
    userId: raw.user_id,
    resourceId: raw.resource_id,
    provider: raw.provider,
    action: raw.action,
    requiredPermission: raw.required_permission,
    status: raw.status,
    resultSummary: raw.result_summary,
    errorCode: raw.error_code,
    errorMessage: raw.error_message,
    requestedAt: new Date(raw.requested_at),
    completedAt: raw.completed_at ? new Date(raw.completed_at) : null,
  };
}

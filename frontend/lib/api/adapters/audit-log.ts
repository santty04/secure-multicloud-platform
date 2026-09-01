import type { AuditLogResponse } from "@/schemas/audit-log";
import type { AuditLog } from "@/types/domain";

export function toAuditLog(raw: AuditLogResponse): AuditLog {
  return {
    id: raw.id,
    correlationId: raw.correlation_id,
    operationId: raw.operation_id,
    userId: raw.user_id,
    resourceId: raw.resource_id,
    provider: raw.provider,
    action: raw.action,
    decision: raw.decision,
    reasonCode: raw.reason_code,
    requiredPermission: raw.required_permission,
    roleCode: raw.role_code,
    eventType: raw.event_type,
    httpMethod: raw.http_method,
    requestPath: raw.request_path,
    details: raw.details,
    createdAt: new Date(raw.created_at),
  };
}

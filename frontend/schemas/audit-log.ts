import { z } from "zod";
import { cloudProviderSchema } from "./common";
import { operationActionSchema } from "./operation";

export const auditDecisionSchema = z.enum(["allowed", "denied"]);

/** `AuditLogResponse` — GET /api/v1/audit-logs. Read-only, never written from the frontend. */
export const auditLogResponseSchema = z.object({
  id: z.string(),
  correlation_id: z.string(),
  operation_id: z.string().nullable(),
  user_id: z.string().nullable(),
  resource_id: z.string().nullable(),
  provider: cloudProviderSchema,
  action: operationActionSchema,
  decision: auditDecisionSchema,
  reason_code: z.string(),
  required_permission: z.string(),
  role_code: z.string().nullable(),
  event_type: z.string(),
  http_method: z.string().nullable(),
  request_path: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const auditLogListResponseSchema = z.array(auditLogResponseSchema);

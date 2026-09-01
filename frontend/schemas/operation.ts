import { z } from "zod";
import { cloudProviderSchema } from "./common";

export const operationActionSchema = z.enum(["create", "read", "start", "stop", "update", "delete"]);
export const operationStatusSchema = z.enum(["pending", "success", "failed"]);

/** `OperationResponse` — GET /api/v1/operations, GET /api/v1/operations/{id}. */
export const operationResponseSchema = z.object({
  id: z.string(),
  correlation_id: z.string(),
  user_id: z.string().nullable(),
  resource_id: z.string().nullable(),
  provider: cloudProviderSchema,
  action: operationActionSchema,
  required_permission: z.string(),
  status: operationStatusSchema,
  result_summary: z.record(z.string(), z.unknown()).nullable(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  requested_at: z.string(),
  completed_at: z.string().nullable(),
});
export type OperationResponse = z.infer<typeof operationResponseSchema>;

export const operationListResponseSchema = z.array(operationResponseSchema);

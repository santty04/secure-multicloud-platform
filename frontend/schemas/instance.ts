import { z } from "zod";
import { cloudProviderSchema } from "./common";

/** `InstanceSummary` — GET /api/v1/instances (bare array, no envelope). */
export const instanceSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: cloudProviderSchema,
  resource_type: z.string(),
  region: z.string(),
  environment: z.string(),
  status: z.string(),
  is_managed: z.boolean(),
});
export type InstanceSummaryResponse = z.infer<typeof instanceSummarySchema>;

export const instanceListResponseSchema = z.array(instanceSummarySchema);

/**
 * `InstanceActionResponse` — start/stop/delete. These calls are
 * synchronous: the response IS the final result, there is no
 * pending → running polling step.
 */
export const instanceActionResponseSchema = z.object({
  resource_id: z.string(),
  provider: cloudProviderSchema,
  action: z.enum(["start", "stop", "delete"]),
  status: z.enum(["success", "simulated"]),
  requested_by: z.string(),
});
export type InstanceActionResponse = z.infer<typeof instanceActionResponseSchema>;

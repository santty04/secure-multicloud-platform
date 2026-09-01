import type { InstanceActionResponse, InstanceSummaryResponse } from "@/schemas/instance";
import type { Instance, InstanceActionResult } from "@/types/domain";

export function toInstance(raw: InstanceSummaryResponse): Instance {
  return {
    id: raw.id,
    name: raw.name,
    provider: raw.provider,
    resourceType: raw.resource_type,
    region: raw.region,
    environment: raw.environment,
    status: raw.status,
    isManaged: raw.is_managed,
  };
}

export function toInstanceActionResult(raw: InstanceActionResponse): InstanceActionResult {
  return {
    resourceId: raw.resource_id,
    provider: raw.provider,
    action: raw.action,
    status: raw.status,
    requestedBy: raw.requested_by,
  };
}

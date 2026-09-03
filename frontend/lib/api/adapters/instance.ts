import type {
  InstanceCreateResponse,
  InstanceActionResponse,
  InstanceStatusResponse,
  InstanceSummaryResponse,
  LiveAwsInstanceSummaryResponse,
} from "@/schemas/instance";
import type { Instance, InstanceActionResult, InstanceCreateResult, InstanceStatus, LiveAwsInstance } from "@/types/domain";

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

export function toLiveAwsInstance(raw: LiveAwsInstanceSummaryResponse): LiveAwsInstance {
  return {
    instanceId: raw.instance_id,
    name: raw.name,
    state: raw.state,
    instanceType: raw.instance_type,
    privateIp: raw.private_ip,
    provider: raw.provider,
    region: raw.region,
  };
}

export function toInstanceStatus(raw: InstanceStatusResponse): InstanceStatus {
  return {
    resourceId: raw.resource_id,
    provider: raw.provider,
    name: raw.name,
    status: raw.status,
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

export function toInstanceCreateResult(raw: InstanceCreateResponse): InstanceCreateResult {
  return {
    resourceId: raw.resource_id,
    cloudResourceId: raw.cloud_resource_id,
    provider: raw.provider,
    name: raw.name,
    status: raw.status,
    requestedBy: raw.requested_by,
  };
}

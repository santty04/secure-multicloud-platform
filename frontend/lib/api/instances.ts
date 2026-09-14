import { apiFetch } from "@/lib/api/client";
import { toInstance, toInstanceCreateResult, toInstanceStatus, toLiveAwsInstance } from "@/lib/api/adapters/instance";
import { endpoints } from "@/lib/api/endpoints";
import { unexpectedResponseError } from "@/lib/api/errors";
import {
  type AwsInstanceCreateRequest,
  type AzureInstanceCreateRequest,
  instanceCreateResponseSchema,
  instanceListResponseSchema,
  instanceStatusResponseSchema,
  liveAwsInstanceListResponseSchema,
} from "@/schemas/instance";
import type { CloudProvider, Instance, InstanceCreateResult, InstanceStatus, LiveAwsInstance } from "@/types/domain";

export async function getManagedInstances(): Promise<Instance[]> {
  const raw = await apiFetch<unknown>(endpoints.instances());
  const parsed = instanceListResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data.map(toInstance);
}

export async function getLiveAwsInstances(): Promise<LiveAwsInstance[]> {
  const raw = await apiFetch<unknown>(endpoints.liveAwsInstances());
  const parsed = liveAwsInstanceListResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data.map(toLiveAwsInstance);
}

export async function getInstanceStatus(
  provider: CloudProvider,
  resourceId: string,
): Promise<InstanceStatus> {
  const raw = await apiFetch<unknown>(endpoints.instanceStatus(provider, resourceId));
  const parsed = instanceStatusResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();
  return toInstanceStatus(parsed.data);
}

export async function createAwsInstance(payload: AwsInstanceCreateRequest): Promise<InstanceCreateResult> {
  const raw = await apiFetch<unknown>(endpoints.createAwsInstance(), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const parsed = instanceCreateResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();
  return toInstanceCreateResult(parsed.data);
}

export async function createAzureInstance(payload: AzureInstanceCreateRequest): Promise<InstanceCreateResult> {
  const raw = await apiFetch<unknown>(endpoints.createAzureInstance(), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const parsed = instanceCreateResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();
  return toInstanceCreateResult(parsed.data);
}

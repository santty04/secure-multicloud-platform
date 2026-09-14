"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAwsInstance, createAzureInstance } from "@/lib/api/instances";
import { apiFetch, type ApiError } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import {
  type AwsInstanceCreateRequest,
  type AzureInstanceCreateRequest,
  instanceActionResponseSchema,
} from "@/schemas/instance";
import { toInstanceActionResult } from "@/lib/api/adapters/instance";
import type { CloudProvider, InstanceActionResult, InstanceCreateResult } from "@/types/domain";
import { instanceKeys } from "./keys";
import { operationKeys } from "@/features/operations/keys";

export type InstanceActionVars = { provider: CloudProvider; resourceId: string; name: string };

/**
 * Shared factory for start/stop/delete: all three are synchronous on the
 * backend (the response IS the final state, no pending → running polling —
 * see HANDOFF.md §9.7), so a mutation is enough, no subscription needed.
 */
function useInstanceAction(action: "start" | "stop" | "delete") {
  const queryClient = useQueryClient();
  const path =
    action === "start" ? endpoints.instanceStart : action === "stop" ? endpoints.instanceStop : endpoints.instanceDelete;
  const method = action === "delete" ? "DELETE" : "POST";

  return useMutation<InstanceActionResult, ApiError, InstanceActionVars>({
    mutationKey: ["instances", "action", action],
    mutationFn: async ({ provider, resourceId }) => {
      const raw = await apiFetch<unknown>(path(provider, resourceId), { method });
      return toInstanceActionResult(instanceActionResponseSchema.parse(raw));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.all() });
      queryClient.invalidateQueries({ queryKey: operationKeys.all() });
    },
  });
}

export function useStartInstance() {
  return useInstanceAction("start");
}
export function useStopInstance() {
  return useInstanceAction("stop");
}
export function useDeleteInstance() {
  return useInstanceAction("delete");
}

export type CreateInstanceVars =
  | { provider: "aws"; payload: AwsInstanceCreateRequest }
  | { provider: "azure"; payload: AzureInstanceCreateRequest };

export function useCreateInstance() {
  const queryClient = useQueryClient();

  return useMutation<InstanceCreateResult, ApiError, CreateInstanceVars>({
    mutationKey: ["instances", "create"],
    mutationFn: ({ provider, payload }) =>
      provider === "aws" ? createAwsInstance(payload) : createAzureInstance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: instanceKeys.all() });
      queryClient.invalidateQueries({ queryKey: operationKeys.all() });
    },
  });
}

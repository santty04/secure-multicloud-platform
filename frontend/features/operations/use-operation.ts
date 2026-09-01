"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { operationResponseSchema } from "@/schemas/operation";
import { toOperation } from "@/lib/api/adapters/operation";
import { operationKeys } from "./keys";

export function useOperation(operationId: string | null) {
  return useQuery({
    queryKey: operationKeys.detail(operationId ?? ""),
    queryFn: async () => {
      const raw = await apiFetch<unknown>(endpoints.operation(operationId as string));
      return toOperation(operationResponseSchema.parse(raw));
    },
    enabled: Boolean(operationId),
  });
}

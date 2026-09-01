"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { operationListResponseSchema } from "@/schemas/operation";
import { toOperation } from "@/lib/api/adapters/operation";
import { operationKeys } from "./keys";

/** GET /api/v1/operations only supports `?limit=` — status/provider/action filters are applied on the client. */
export function useOperations() {
  return useQuery({
    queryKey: operationKeys.list(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>(endpoints.operations());
      return operationListResponseSchema.parse(raw).map(toOperation);
    },
  });
}

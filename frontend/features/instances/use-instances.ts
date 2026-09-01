"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { instanceListResponseSchema } from "@/schemas/instance";
import { toInstance } from "@/lib/api/adapters/instance";
import { instanceKeys } from "./keys";

/** GET /api/v1/instances has no server-side filters — search/provider/status are applied on the client. */
export function useInstances() {
  return useQuery({
    queryKey: instanceKeys.list(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>(endpoints.instances());
      return instanceListResponseSchema.parse(raw).map(toInstance);
    },
  });
}

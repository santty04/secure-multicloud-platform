"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

/**
 * `GET /health` returns only `{status:"ok"}` — there is no "degraded"
 * value, so "backend down" is purely "the request failed" (network error
 * or non-200), not a status field to branch on.
 */
export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ status: "ok" }>(endpoints.health(), { auth: false }),
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 0,
  });
}

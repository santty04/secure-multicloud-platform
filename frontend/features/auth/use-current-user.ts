"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { currentUserResponseSchema } from "@/schemas/auth";
import { toCurrentUser } from "@/lib/api/adapters/auth";
import { authKeys } from "./keys";

/**
 * The session guard: no token → 401 → `isError`. `(dashboard)/layout.tsx`
 * reads `isPending`/`isError`/`data` off this to decide skeleton vs.
 * redirect vs. render, so nothing else needs to poke at the token directly.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>(endpoints.me());
      return toCurrentUser(currentUserResponseSchema.parse(raw));
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

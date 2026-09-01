"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/api/auth";
import { authKeys } from "./keys";

/**
 * The session guard: no token → 401 → `isError`. `(dashboard)/layout.tsx`
 * reads `isPending`/`isError`/`data` off this to decide skeleton vs.
 * redirect vs. render, so nothing else needs to poke at the token directly.
 */
export function useCurrentUser(options: { enabled?: boolean } = {}) {
  const hasToken = Boolean(getAccessToken());

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: getCurrentUser,
    enabled: options.enabled ?? hasToken,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listAuthEvents } from "@/lib/api/auth-events";
import { auditKeys } from "./keys";

/** Sign-in trail; filtering and pagination run server-side. */
export function useAuthEvents(filters: { email: string; eventType: string; offset: number }) {
  return useQuery({
    queryKey: auditKeys.authEvents(filters),
    queryFn: () => listAuthEvents(filters),
    placeholderData: keepPreviousData,
  });
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { clearAccessToken } from "@/lib/auth/session";

/** No `/auth/logout` endpoint exists on the backend — logging out is purely a client-side token clear. */
export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    clearAccessToken();
    queryClient.clear();
  };
}

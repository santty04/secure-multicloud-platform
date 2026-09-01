"use client";

import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "@/lib/auth/token-store";

/** No `/auth/logout` endpoint exists on the backend — logging out is purely a client-side token clear. */
export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    tokenStore.clear();
    queryClient.clear();
  };
}

"use client";

import { useSyncExternalStore } from "react";
import { hasAccessToken, subscribeToAccessToken } from "@/lib/auth/session";

export function useHasAccessToken() {
  return useSyncExternalStore(subscribeToAccessToken, hasAccessToken, () => false);
}

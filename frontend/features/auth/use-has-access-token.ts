"use client";

import { useEffect, useState } from "react";
import { hasAccessToken, subscribeToAccessToken } from "@/lib/auth/session";

export function useHasAccessToken(): boolean | null {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(hasAccessToken());
    return subscribeToAccessToken(() => setHasToken(hasAccessToken()));
  }, []);

  return hasToken;
}

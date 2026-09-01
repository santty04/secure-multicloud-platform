"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/token-store";

/** Same-tick redirect to /dashboard or /login — this route never shows real UI. */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(tokenStore.get() ? "/dashboard" : "/login");
  }, [router]);

  return null;
}

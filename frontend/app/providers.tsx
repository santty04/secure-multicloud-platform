"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { session } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";

const mocksEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // When mocks are on, hold rendering until the MSW worker is intercepting —
  // otherwise the first render's queries race the worker and hit the real
  // (probably absent) backend. `mocks/browser.ts` must never be imported
  // from anywhere reachable outside this flag: see mocks/README notes.
  const [mocksReady, setMocksReady] = useState(!mocksEnabled);
  const [mocksError, setMocksError] = useState<string | null>(null);

  useEffect(() => {
    // Without this, a query cached before expiry (e.g. authKeys.me()) lingers
    // and /login reads it as "already authenticated", bouncing back to the
    // page it just left — a redirect loop between /login and /dashboard.
    return session.onExpire(() => {
      queryClient.clear();
    });
  }, [queryClient]);

  useEffect(() => {
    if (!mocksEnabled) return;
    let cancelled = false;

    const start = import("@/mocks/browser").then(({ startWorker }) => startWorker());
    // `worker.start()` waits on a postMessage handshake with the service
    // worker; that can hang indefinitely in some browser/automation setups
    // (SW registered but the page never gets "controlled"). Never block the
    // whole app forever on that — time out and surface it instead.
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out waiting for the MSW service worker to activate (10s).")), 10_000);
    });

    Promise.race([start, timeout])
      .then(() => {
        if (!cancelled) setMocksReady(true);
      })
      .catch((error: unknown) => {
        console.error("[mocks] failed to start MSW worker", error);
        if (!cancelled) setMocksError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mocksError) {
    return (
      <div className="grid min-h-screen place-items-center bg-smp-bg p-8 text-smp-ink">
        <div className="max-w-md rounded-2xl border border-smp-danger/40 bg-smp-surface p-6 text-center">
          <div className="mb-2 text-sm font-semibold text-smp-danger-text">No se pudo iniciar el mock service worker</div>
          <div className="font-mono text-xs text-smp-ink-dim">{mocksError}</div>
        </div>
      </div>
    );
  }
  if (!mocksReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  );
}

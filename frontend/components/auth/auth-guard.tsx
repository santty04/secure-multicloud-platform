"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useHasAccessToken } from "@/features/auth/hooks";
import { isApiError } from "@/lib/api/errors";
import { session } from "@/lib/auth/session";

const mocksEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true";

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-smp-bg">
      <aside className="sticky top-0 hidden h-screen w-[236px] flex-none flex-col md:flex gap-2 border-r border-smp-line-soft bg-smp-surface-raised px-3 py-4">
        <div className="mb-3 flex items-center gap-2.5 border-b border-smp-line-soft px-1.5 pb-4">
          <Skeleton className="size-[30px] rounded-[9px]" />
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full rounded-[10px]" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3.5 border-b border-smp-line-soft bg-smp-surface-raised px-4 md:px-[22px]">
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-[10px]" />
        </header>
        <main className="flex-1 px-4 pt-5 pb-16 md:px-[22px] md:pt-6">
          <Skeleton className="h-40 w-full max-w-[1500px] rounded-2xl" />
        </main>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const hasToken = useHasAccessToken();
  const { data: user, isPending, isError, error } = useCurrentUser({ enabled: hasToken === true });
  const isUnauthenticated = isError && isApiError(error) && error.status === 401;

  useEffect(() => {
    if (hasToken === false) router.replace("/login");
  }, [hasToken, router]);

  useEffect(() => {
    // Only a real 401 means the session is invalid. Network hiccups, 5xx, or a
    // cold-starting backend must not bounce the user to /login — session.expire()
    // (triggered by apiFetch on 401) already handles the real case via `hasToken`.
    if (isUnauthenticated) router.replace("/login");
  }, [isUnauthenticated, router]);

  useEffect(() => {
    return session.onExpire(() => {
      router.replace("/login");
    });
  }, [router]);

  if (hasToken !== true || isPending) return <ShellSkeleton />;
  if (isUnauthenticated) return null;

  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-smp-bg px-6">
        <div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
          <AlertTriangle className="size-8 text-smp-warning" strokeWidth={1.8} aria-hidden="true" />
          <p className="text-[14.5px] text-smp-ink-muted">
            {isApiError(error) ? error.message : "No se pudo conectar con la plataforma. Inténtalo de nuevo."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-smp-bg">
      <AppSidebar mobileOpen={mobileNavOpen} onMobileClose={closeMobileNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader menuOpen={mobileNavOpen} onMenuClick={() => setMobileNavOpen(true)} />
        {mocksEnabled && (
          <div className="flex items-center gap-2.5 border-b border-smp-warning/22 bg-smp-warning/8 px-4 py-2 md:px-[22px] text-[12px] text-smp-warning-ink">
            <AlertTriangle className="size-3.5 flex-none" strokeWidth={2} />
            <span>
              <strong className="font-semibold">Modo demostración:</strong> datos servidos por mocks (MSW).
            </span>
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 pt-5 pb-16 md:px-[22px] md:pt-6">{children}</main>
      </div>
    </div>
  );
}

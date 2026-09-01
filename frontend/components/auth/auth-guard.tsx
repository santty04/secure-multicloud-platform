"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useHasAccessToken } from "@/features/auth/hooks";
import { session } from "@/lib/auth/session";

const mocksEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true";

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-smp-bg">
      <aside className="sticky top-0 flex h-screen w-[236px] flex-none flex-col gap-2 border-r border-smp-line-soft bg-smp-surface-raised px-3 py-4">
        <div className="mb-3 flex items-center gap-2.5 border-b border-smp-line-soft px-1.5 pb-4">
          <Skeleton className="size-[30px] rounded-[9px]" />
          <Skeleton className="h-4 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full rounded-[10px]" />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3.5 border-b border-smp-line-soft bg-smp-surface-raised px-[22px]">
          <Skeleton className="h-4 w-40" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-[10px]" />
        </header>
        <main className="flex-1 px-[22px] pt-6 pb-16">
          <Skeleton className="h-40 w-full max-w-[1500px] rounded-2xl" />
        </main>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasToken = useHasAccessToken();
  const { data: user, isPending, isError } = useCurrentUser({ enabled: hasToken });

  useEffect(() => {
    if (!hasToken) router.replace("/login");
  }, [hasToken, router]);

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  useEffect(() => {
    return session.onExpire(() => {
      router.replace("/login");
    });
  }, [router]);

  if (!hasToken || isPending) return <ShellSkeleton />;
  if (isError || !user) return null;

  return (
    <div className="flex min-h-screen bg-smp-bg">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        {mocksEnabled && (
          <div className="flex items-center gap-2.5 border-b border-smp-warning/22 bg-smp-warning/8 px-[22px] py-2 text-[12px] text-smp-warning-ink">
            <AlertTriangle className="size-3.5 flex-none" strokeWidth={2} />
            <span>
              <strong className="font-semibold">Modo demostración:</strong> datos servidos por mocks (MSW).
            </span>
          </div>
        )}
        <main className="min-w-0 flex-1 px-[22px] pt-6 pb-16">{children}</main>
      </div>
    </div>
  );
}

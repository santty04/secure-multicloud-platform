"use client";

import { usePathname } from "next/navigation";
import { BackendStatusChip } from "@/components/layout/backend-status-chip";
import { ProfileMenu } from "@/components/layout/profile-menu";

const SECTION_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/instances": "Instancias",
  "/operations": "Operaciones",
  "/audit-logs": "Auditoría",
  "/rbac": "Matriz de permisos",
  "/users": "Usuarios y roles",
};

function sectionLabelFor(pathname: string): string {
  const exact = SECTION_LABELS[pathname];
  if (exact) return exact;
  const match = Object.entries(SECTION_LABELS).find(([path]) => pathname.startsWith(`${path}/`));
  return match?.[1] ?? "";
}

export function AppHeader() {
  const pathname = usePathname();
  const crumbLabel = sectionLabelFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3.5 border-b border-smp-line-soft bg-smp-surface-raised/92 px-[22px] backdrop-blur-[8px]">
      <nav aria-label="Ruta" className="flex min-w-0 items-center gap-2 text-[12.5px] text-smp-ink-dim">
        <span>Secure Multicloud</span>
        {crumbLabel && (
          <>
            <span className="text-smp-ink-faint">/</span>
            <span className="font-semibold text-smp-ink">{crumbLabel}</span>
          </>
        )}
      </nav>
      <div className="flex-1" />
      <BackendStatusChip />
      <div className="h-[22px] w-px bg-smp-line" />
      <ProfileMenu />
    </header>
  );
}

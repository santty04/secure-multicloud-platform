"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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

export function AppHeader({ onMenuClick, menuOpen }: { onMenuClick: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const crumbLabel = sectionLabelFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-smp-line-soft bg-smp-surface-raised/92 px-3 backdrop-blur-[8px] md:gap-3.5 md:px-[22px]">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="grid size-10 flex-none place-items-center rounded-lg border-0 bg-transparent text-smp-ink-muted hover:text-smp-ink md:hidden"
      >
        <Menu className="size-5" />
      </button>
      <nav aria-label="Ruta" className="flex min-w-0 items-center gap-2 text-[12.5px] text-smp-ink-dim">
        <span className="hidden md:inline">Secure Multicloud</span>
        {crumbLabel && (
          <>
            <span className="hidden text-smp-ink-faint md:inline">/</span>
            <span className="truncate font-semibold text-smp-ink">{crumbLabel}</span>
          </>
        )}
      </nav>
      <div className="flex-1" />
      <BackendStatusChip />
      <div className="hidden h-[22px] w-px bg-smp-line md:block" />
      <ProfileMenu />
    </header>
  );
}

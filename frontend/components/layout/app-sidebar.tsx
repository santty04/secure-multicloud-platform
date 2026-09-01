"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, FileText, History, LayoutGrid, Server, ShieldCheck, UserCog } from "lucide-react";
import { useInstances } from "@/features/instances/use-instances";
import { useOperations } from "@/features/operations/use-operations";
import { cn } from "@/lib/utils";

const COLLAPSED_STORAGE_KEY = "smp.sidebar-collapsed";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/instances", label: "Instancias", icon: Server },
  { href: "/operations", label: "Operaciones", icon: History },
  { href: "/audit-logs", label: "Auditoría", icon: FileText },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      // ignore — localStorage can be unavailable (private browsing, etc.)
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const instances = useInstances();
  const operations = useOperations();

  const instanceCount = instances.data ? String(instances.data.length) : "–";
  const pendingOpsCount = operations.data
    ? String(operations.data.filter((op) => op.status === "pending").length)
    : "–";

  const badgeByHref: Record<string, string | null> = {
    "/dashboard": null,
    "/instances": instanceCount,
    "/operations": pendingOpsCount,
    "/audit-logs": null,
  };

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-none flex-col border-r border-smp-line-soft bg-smp-surface-raised transition-[width] duration-150",
        collapsed ? "w-[66px] px-2.5 py-4" : "w-[236px] px-3 py-4",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5 border-b border-smp-line-soft px-1.5 pb-4">
        <div className="flex size-[30px] flex-none items-center justify-center rounded-[9px] bg-smp-accent">
          <ShieldCheck className="size-[17px] text-smp-bg" strokeWidth={2.3} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold tracking-tight text-smp-ink">Secure Multicloud</div>
            <div className="text-[10px] tracking-[.08em] text-smp-ink-faint">PLATFORM</div>
          </div>
        )}
      </div>

      <nav aria-label="Navegación principal" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge = badgeByHref[item.href];
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-colors hover:bg-smp-line-soft hover:text-white",
                isActive
                  ? "bg-smp-line-soft font-semibold text-white shadow-[inset_3px_0_0_var(--color-smp-accent)]"
                  : "font-medium text-smp-ink-muted",
              )}
            >
              <Icon className="size-[17px] flex-none" strokeWidth={1.9} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {badge !== null && (
                    <span className="font-mono text-[10.5px] text-smp-ink-dim">{badge}</span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        <button
          type="button"
          disabled
          title="Módulo futuro"
          className="flex cursor-not-allowed items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-left text-[13px] font-medium text-smp-disabled"
        >
          <UserCog className="size-[17px] flex-none" strokeWidth={1.9} />
          {!collapsed && (
            <>
              <span className="flex-1">Usuarios y roles</span>
              <span className="rounded-full bg-smp-line-soft px-1.5 py-px text-[9.5px] font-bold text-smp-ink-faint">
                Próximamente
              </span>
            </>
          )}
        </button>
      </nav>

      <div className={cn("mt-auto flex flex-col gap-2", collapsed && "items-center")}>
        {!collapsed && (
          <Link
            href="/rbac"
            className="w-full rounded-lg border border-smp-line-2 bg-transparent px-1.5 py-1.5 text-center text-[11px] font-semibold text-smp-ink-muted transition-colors hover:border-smp-accent hover:text-smp-ink"
          >
            Ver matriz de permisos
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-smp-line-soft bg-transparent px-1.5 py-[7px] text-[11.5px] font-semibold text-smp-ink-dim transition-colors hover:border-smp-line-2 hover:text-smp-ink"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}

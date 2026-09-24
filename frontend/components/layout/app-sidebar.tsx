"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  History,
  LayoutGrid,
  Server,
  ShieldCheck,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";

import { can, cloudsWith, type Permission, type VmPermission } from "@/features/auth/can";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { useInstances } from "@/features/instances/use-instances";
import { useOperations } from "@/features/operations/use-operations";
import { cn } from "@/lib/utils";

const COLLAPSED_STORAGE_KEY = "smp.sidebar-collapsed";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Platform permission required to see the item. */
  permission?: Permission;
  /** VM permission required in at least one cloud. */
  cloudPermission?: VmPermission;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/instances", label: "Instancias", icon: Server },
  { href: "/operations", label: "Operaciones", icon: History },
  { href: "/audit-logs", label: "Auditoría", icon: FileText },
  {
    href: "/users",
    label: "Usuarios y roles",
    icon: UserCog,
    permission: "user.manage",
  },
  {
    href: "/ai",
    label: "Asistente IA",
    icon: Bot,
    cloudPermission: "vm.create",
  },
];

/**
 * Desktop (md+): sticky, collapsible rail. Phones: an off-canvas drawer the
 * header's menu button opens; `collapsed` only applies on desktop, so a phone
 * always sees the full labels.
 */
export function AppSidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const pathname = usePathname();
  const currentUserQuery = useCurrentUser();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;

      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // localStorage puede no estar disponible.
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

  const permissions = currentUserQuery.data?.permissions;

  const badgeByHref: Record<string, string | null> = {
    "/dashboard": null,
    "/instances": instanceCount,
    "/operations": pendingOpsCount,
    "/audit-logs": null,
    "/ai": null,
    "/users": null,
  };

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose();
    };
    // Keep the page behind the drawer from scrolling on touch devices.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, onMobileClose]);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) =>
      (!item.permission || can(permissions, item.permission)) &&
      (!item.cloudPermission || cloudsWith(currentUserQuery.data, item.cloudPermission).length > 0),
  );

  // Labels hide only on desktop when collapsed; the phone drawer keeps them.
  const desktopHidden = collapsed ? "md:hidden" : undefined;

  return (
    <>
    <div
      aria-hidden="true"
      onClick={onMobileClose}
      className={cn(
        "fixed inset-0 z-30 bg-black/55 transition-opacity md:hidden",
        mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    />
    <aside
      id="app-sidebar"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-smp-line-soft bg-smp-surface-raised px-3 py-4 transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        "md:sticky md:top-0 md:z-auto md:h-screen md:flex-none md:translate-x-0 md:transition-[width] md:duration-150",
        collapsed ? "md:w-[66px] md:px-2.5" : "md:w-[236px]",
      )}
    >
      <div className="mb-3 flex items-center gap-2.5 border-b border-smp-line-soft px-1.5 pb-4">
        <div className="flex size-[30px] flex-none items-center justify-center rounded-[9px] bg-smp-accent">
          <ShieldCheck
            className="size-[17px] text-smp-bg"
            strokeWidth={2.3}
          />
        </div>

        <div className={cn("min-w-0 flex-1", desktopHidden)}>
          <div className="truncate text-[13px] font-bold tracking-tight text-smp-ink">
            Secure Multicloud
          </div>
          <div className="text-[10px] tracking-[.08em] text-smp-ink-faint">
            PLATFORM
          </div>
        </div>

        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Cerrar menú"
          className="grid size-9 place-items-center rounded-lg border-0 bg-transparent text-smp-ink-dim hover:text-smp-ink md:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav
        aria-label="Navegación principal"
        className="flex flex-col gap-0.5"
      >
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const badge = badgeByHref[item.href];
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[14px] transition-colors hover:bg-smp-line-soft hover:text-white md:py-2 md:text-[13px]",
                isActive
                  ? "bg-smp-line-soft font-semibold text-white shadow-[inset_3px_0_0_var(--color-smp-accent)]"
                  : "font-medium text-smp-ink-muted",
              )}
            >
              <Icon
                className="size-[17px] flex-none"
                strokeWidth={1.9}
              />

              <span className={cn("flex-1", desktopHidden)}>{item.label}</span>

              {badge !== null && (
                <span className={cn("font-mono text-[10.5px] text-smp-ink-dim", desktopHidden)}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto flex flex-col gap-2",
          collapsed && "md:items-center",
        )}
      >
        <Link
          href="/rbac"
          onClick={onMobileClose}
          className={cn(
            "w-full rounded-lg border border-smp-line-2 bg-transparent px-1.5 py-1.5 text-center text-[11px] font-semibold text-smp-ink-muted transition-colors hover:border-smp-accent hover:text-smp-ink",
            desktopHidden,
          )}
        >
          Ver matriz de permisos
        </Link>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="hidden w-full items-center justify-center gap-2 rounded-[9px] border border-smp-line-soft bg-transparent px-1.5 py-[7px] text-[11.5px] font-semibold text-smp-ink-dim transition-colors hover:border-smp-line-2 hover:text-smp-ink md:flex"
        >
          {collapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}

          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

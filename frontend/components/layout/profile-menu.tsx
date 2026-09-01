"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { useLogout } from "@/features/auth/use-logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsOf(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function ProfileMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-[10px] border border-transparent bg-transparent py-[5px] pr-2 pl-[5px] text-smp-ink transition-colors hover:border-smp-line hover:bg-smp-surface-alt">
        <span className="flex size-7 flex-none items-center justify-center rounded-full border border-smp-line-2 bg-smp-line-soft text-[11px] font-bold text-smp-accent-soft">
          {initialsOf(user.fullName)}
        </span>
        <span className="text-left leading-[1.25]">
          <span className="block text-[12.5px] font-semibold">{user.fullName}</span>
          <span className="block text-[10.5px] text-smp-ink-dim">{user.roleName}</span>
        </span>
        <ChevronDown className="size-3.5 text-smp-ink-dim" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[236px] rounded-xl border border-smp-line-2 bg-smp-surface-alt p-3 text-smp-ink shadow-[0_18px_44px_-18px_rgba(0,0,0,.85)]"
      >
        <div className="text-[12.5px] font-semibold">{user.fullName}</div>
        <div className="text-[11.5px] text-smp-ink-dim">{user.email}</div>

        <DropdownMenuSeparator className="my-2.5 bg-smp-line" />

        <div className="mb-1.5 text-[10.5px] font-bold tracking-[.08em] text-smp-ink-faint uppercase">
          Autorización
        </div>
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-smp-ink-muted">
          <span>Rol (RBAC)</span>
          <span className="font-mono text-smp-accent-soft">{user.roleCode}</span>
        </div>

        <DropdownMenuSeparator className="my-2.5 bg-smp-line" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-[9px] border border-smp-line-2 bg-transparent px-2.5 py-2 text-[12.5px] font-semibold text-smp-danger-text focus:border-smp-danger/50 focus:bg-smp-danger/10 focus:text-smp-danger-text"
        >
          <LogOut className="size-[15px]" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

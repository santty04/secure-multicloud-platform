import type { CloudProvider, CurrentUser } from "@/types/domain";

/**
 * `permissions` comes straight from `CurrentUserResponse.permissions` — the
 * backend is the single source of truth for the RBAC matrix. This helper is
 * UX only (hide/disable a button, show a "requires X" tooltip); the backend
 * revalidates every request regardless of what the UI let the user click.
 */
export type Permission =
  | "vm.read"
  | "vm.create"
  | "vm.start"
  | "vm.stop"
  | "vm.update"
  | "vm.delete"
  | "operation.read"
  | "user.manage";

export function can(permissions: readonly string[] | undefined, permission: Permission): boolean {
  return Boolean(permissions?.includes(permission));
}

export type VmPermission = Extract<Permission, `vm.${string}`>;

/**
 * VM actions are authorized per cloud: the user's role in that provider, not
 * the platform role. Same UX-only caveat as `can` — the backend decides.
 */
export function canInCloud(
  user: Pick<CurrentUser, "cloudAccess"> | undefined,
  provider: CloudProvider,
  permission: VmPermission,
): boolean {
  return Boolean(user?.cloudAccess[provider]?.permissions.includes(permission));
}

/** Clouds where the user holds `permission`, in display order. */
export function cloudsWith(
  user: Pick<CurrentUser, "cloudAccess"> | undefined,
  permission: VmPermission,
): CloudProvider[] {
  return CLOUD_PROVIDERS.filter((provider) => canInCloud(user, provider, permission));
}

export const CLOUD_PROVIDERS: CloudProvider[] = ["azure", "aws"];

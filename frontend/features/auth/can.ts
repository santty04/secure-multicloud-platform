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

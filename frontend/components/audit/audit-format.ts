/**
 * Small resolution helpers shared by the audit table row and drawer.
 *
 * The real `AuditLog` only carries nullable ids (`resourceId`, `userId`) —
 * there is no resource-name or user-email field on the backend response, and
 * no users-list endpoint to resolve a name from. We join `resourceId`
 * against `useInstances()` (same approach as the operations page) and,
 * failing that or for `userId` (no equivalent list exists), fall back to a
 * truncated id. See BACKEND_CONTRACT.md's Audit logs section.
 */

/** Shortens a UUID-ish id for display: `3f9a1c2e-…` -> `3f9a1c2e…`. */
export function truncateId(id: string, length = 8): string {
  return id.length <= length ? id : `${id.slice(0, length)}…`;
}

export function resolveResourceName(
  resourceId: string | null,
  instanceNameById: Map<string, string>,
): string {
  if (!resourceId) return "—";
  return instanceNameById.get(resourceId) ?? truncateId(resourceId);
}

export function resolveUserLabel(userId: string | null, currentUserId?: string): string {
  if (!userId) return "—";
  const label = truncateId(userId);
  return userId === currentUserId ? `${label} (tú)` : label;
}

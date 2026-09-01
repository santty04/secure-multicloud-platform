import { CorrelationId } from "@/components/shared/correlation-id";
import { providerForeground, providerLabel } from "@/components/shared/provider-badge";
import { formatDate } from "@/lib/utils/format-date";
import { operationStatusPresentation } from "@/lib/utils/status";
import type { Instance, Operation } from "@/types/domain";
import { OperationStatusBadge } from "./operation-status-badge";

/** Shared with the page so the header row and each data row stay in lockstep. */
export const OPERATIONS_GRID_TEMPLATE =
  "minmax(140px,1fr) 92px minmax(160px,1.2fr) 96px 132px 124px minmax(150px,1fr)";
export const OPERATIONS_MIN_WIDTH = 980;

/**
 * `Operation.resourceId` is a nullable UUID with no `resourceName` field —
 * resolve it against the already-fetched instance list. If the instance is
 * gone (e.g. deleted since the operation ran) fall back to the truncated id
 * instead of crashing or fabricating a name.
 */
export function resolveResourceLabel(
  resourceId: string | null,
  instancesById: Map<string, Instance>,
): string {
  if (!resourceId) return "—";
  const instance = instancesById.get(resourceId);
  if (instance) return instance.name;
  return `${resourceId.slice(0, 8)}… (recurso no encontrado)`;
}

/**
 * There is no users-list endpoint to resolve an arbitrary `userId` to a
 * name — show "tú" only when it matches the current session's user id,
 * otherwise the truncated id.
 */
export function resolveRequestedBy(userId: string | null, currentUserId?: string): string {
  if (!userId) return "—";
  if (currentUserId && userId === currentUserId) return "tú";
  return `${userId.slice(0, 8)}…`;
}

export function OperationRow({
  operation,
  instancesById,
  currentUserId,
  onOpen,
}: {
  operation: Operation;
  instancesById: Map<string, Instance>;
  currentUserId?: string;
  onOpen: (operation: Operation) => void;
}) {
  const { accent } = operationStatusPresentation(operation.status);
  const resourceLabel = resolveResourceLabel(operation.resourceId, instancesById);
  const requestedBy = resolveRequestedBy(operation.userId, currentUserId);

  return (
    <button
      type="button"
      onClick={() => onOpen(operation)}
      style={{ minWidth: OPERATIONS_MIN_WIDTH, gridTemplateColumns: OPERATIONS_GRID_TEMPLATE, borderLeftColor: accent }}
      className="grid w-full items-center gap-2.5 border-b border-smp-line-soft border-l-[3px] bg-transparent px-4 py-2.5 text-left text-[12.5px] text-smp-ink hover:bg-smp-surface-alt"
    >
      <span className="truncate font-mono text-[11px] text-smp-accent-soft">{operation.id.slice(0, 8)}</span>
      <span className="font-mono text-[11.5px] text-smp-ink-muted">{operation.action}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-smp-ink">{resourceLabel}</span>
        <span className="block text-[10.5px] text-smp-ink-faint">{requestedBy}</span>
      </span>
      <span className={`font-mono text-[10.5px] font-bold ${providerForeground(operation.provider)}`}>
        {providerLabel(operation.provider).toUpperCase()}
      </span>
      <span className="justify-self-start">
        <OperationStatusBadge status={operation.status} />
      </span>
      <span className="text-[11.5px] text-smp-ink-dim">{formatDate(operation.requestedAt)}</span>
      <CorrelationId value={operation.correlationId} variant="inline" />
    </button>
  );
}

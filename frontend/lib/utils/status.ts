import type { StatusTone } from "@/components/shared/status-pill";
import type { AuditDecision, OperationStatus } from "@/types/domain";

/**
 * `Instance.status` is a free-form, DB-persisted string (no backend enum —
 * see HANDOFF.md §9.4) so this has to degrade gracefully for values it
 * doesn't recognize instead of assuming a fixed set.
 */
const KNOWN_INSTANCE_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  running: { label: "En ejecución", tone: "success" },
  stopped: { label: "Detenida", tone: "neutral" },
  stopping: { label: "Deteniendo", tone: "warning" },
  "shutting-down": { label: "Apagando", tone: "warning" },
  starting: { label: "Iniciando", tone: "warning" },
  pending: { label: "En transición", tone: "warning" },
  terminated: { label: "Eliminada", tone: "danger" },
  deleting: { label: "Eliminando", tone: "danger" },
  unknown: { label: "Desconocido", tone: "neutral" },
};

export function instanceStatusPresentation(status: string): { label: string; tone: StatusTone } {
  const known = KNOWN_INSTANCE_STATUS[status.toLowerCase()];
  if (known) return known;
  return { label: status.charAt(0).toUpperCase() + status.slice(1), tone: "neutral" };
}

export function instanceStatusFilterValue(status: string): "running" | "stopped" | "other" {
  const s = status.toLowerCase();
  if (s === "running") return "running";
  if (s === "stopped") return "stopped";
  return "other";
}

const OPERATION_STATUS: Record<OperationStatus, { label: string; tone: StatusTone; accent: string }> = {
  pending: { label: "Pending", tone: "warning", accent: "var(--color-smp-warning)" },
  success: { label: "Succeeded", tone: "success", accent: "#2f9a6f" },
  failed: { label: "Failed", tone: "danger", accent: "var(--color-smp-danger-strong)" },
};

export function operationStatusPresentation(status: OperationStatus) {
  return OPERATION_STATUS[status];
}

const AUDIT_DECISION: Record<AuditDecision, { label: string; tone: StatusTone }> = {
  allowed: { label: "allowed", tone: "success" },
  denied: { label: "denied", tone: "danger" },
};

export function auditDecisionPresentation(decision: AuditDecision) {
  return AUDIT_DECISION[decision];
}

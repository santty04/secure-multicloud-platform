import { DetailDrawer } from "@/components/shared/detail-drawer";
import { providerFullName, providerLabel } from "@/components/shared/provider-badge";
import { formatDate } from "@/lib/utils/format-date";
import { resolveResourceName, resolveUserLabel } from "./audit-format";
import type { AuditLog } from "@/types/domain";

/**
 * Thin wrapper mapping a real `AuditLog` onto `<DetailDrawer>`'s generic
 * field/trace shape (HANDOFF.md §1 / FOUNDATION.md). Two things the
 * prototype didn't have to deal with:
 *  - no `extra` free-text field — `reasonCode`/`roleCode` are the closest
 *    real equivalent and get their own fields; the raw `details` blob (when
 *    present) is pretty-printed separately below the field list instead of
 *    being forced into it.
 *  - the trace is honest about what an audit entry actually records: the
 *    RBAC decision, not a fabricated cloud-provider call step.
 */
export function AuditDrawer({
  log,
  open,
  onOpenChange,
  instanceNameById,
  currentUserId,
}: {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceNameById: Map<string, string>;
  currentUserId: string | undefined;
}) {
  if (!log) {
    return <DetailDrawer open={open} onOpenChange={onOpenChange} kindLabel="" title="" fields={[]} />;
  }

  const denied = log.decision === "denied";
  const resourceName = resolveResourceName(log.resourceId, instanceNameById);
  const userLabel = resolveUserLabel(log.userId, currentUserId);

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      kindLabel="Registro de auditoría · solo lectura"
      title={`${log.action} · ${resourceName}`}
      banner={
        denied
          ? {
              tone: "danger",
              title: "Denegado:",
              text: `La doble capa de autorización (RBAC de la aplicación + identidad del proveedor cloud) bloqueó esta solicitud — motivo: ${log.reasonCode}. El registro es inmutable desde el frontend.`,
            }
          : undefined
      }
      fields={[
        { label: "Fecha y hora", value: formatDate(log.createdAt), mono: true },
        { label: "Usuario", value: userLabel, mono: true },
        { label: "Acción", value: log.action, mono: true },
        { label: "Recurso", value: resourceName },
        { label: "Proveedor", value: providerFullName(log.provider) + ` (${providerLabel(log.provider)})` },
        { label: "Resultado", value: log.decision, mono: true },
        { label: "Permiso requerido", value: log.requiredPermission, mono: true },
        { label: "Código de motivo", value: log.reasonCode, mono: true },
        { label: "Rol", value: log.roleCode ?? "—", mono: true },
      ]}
      correlationId={log.correlationId}
      trace={[
        {
          title: "Solicitud recibida",
          detail: `${log.httpMethod ?? "HTTP"} ${log.requestPath ?? ""}`.trim(),
          color: "var(--color-smp-accent-soft)",
        },
        {
          title: denied ? "Autorización denegada" : "Autorización concedida",
          detail: `rol=${log.roleCode ?? "—"} · permiso=${log.requiredPermission}`,
          color: denied ? "var(--color-smp-danger-text)" : "var(--color-smp-success)",
        },
      ]}
      actions={
        log.details ? (
          <pre className="max-h-56 w-full overflow-auto rounded-lg border border-smp-line-2 bg-smp-input p-2.5 font-mono text-[11px] whitespace-pre-wrap text-smp-ink-muted">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        ) : undefined
      }
    />
  );
}

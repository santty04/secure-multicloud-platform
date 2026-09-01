"use client";

import { useRouter } from "next/navigation";
import { DetailDrawer, type DrawerTraceStep } from "@/components/shared/detail-drawer";
import { providerLabel } from "@/components/shared/provider-badge";
import { formatDate } from "@/lib/utils/format-date";
import { operationStatusPresentation } from "@/lib/utils/status";
import type { Instance, Operation } from "@/types/domain";
import { resolveRequestedBy, resolveResourceLabel } from "./operation-row";

/**
 * Honest 2-3 step trace — the backend only confirms request intake, RBAC,
 * and the final outcome. Unlike the prototype's fabricated 4-step version,
 * this never claims a specific cloud-provider-IAM step happened; we have no
 * data confirming one.
 */
function traceFor(operation: Operation): DrawerTraceStep[] {
  const steps: DrawerTraceStep[] = [
    {
      title: "Solicitud recibida",
      detail: "FastAPI · correlation_id generado",
      color: "var(--color-smp-accent-soft)",
    },
    {
      title: "JWT validado · RBAC de aplicación",
      detail: `permiso requerido: ${operation.requiredPermission} → concedido`,
      color: "var(--color-smp-success)",
    },
  ];

  if (operation.status === "success") {
    steps.push({
      title: "Operación completada",
      detail: "operations.status = success",
      color: "var(--color-smp-success)",
    });
  } else if (operation.status === "failed") {
    steps.push({
      title: "Operación fallida",
      detail: operation.errorMessage ?? "operations.status = failed",
      color: "var(--color-smp-danger)",
    });
  } else {
    steps.push({
      title: "Operación en curso",
      detail: "operations.status = pending",
      color: "var(--color-smp-warning)",
    });
  }

  return steps;
}

export function OperationDrawer({
  operation,
  open,
  onOpenChange,
  instancesById,
  currentUserId,
}: {
  operation: Operation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instancesById: Map<string, Instance>;
  currentUserId?: string;
}) {
  const router = useRouter();

  if (!operation) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} kindLabel="" title="" fields={[]} />;
  }

  const resourceLabel = resolveResourceLabel(operation.resourceId, instancesById);

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      kindLabel={`Operación · ${operation.id.slice(0, 8)}…`}
      title={`${operation.action} · ${resourceLabel}`}
      banner={
        operation.errorMessage
          ? { tone: "danger", title: "Error:", text: operation.errorMessage }
          : undefined
      }
      fields={[
        { label: "Estado", value: operationStatusPresentation(operation.status).label },
        { label: "Acción", value: operation.action, mono: true },
        { label: "Recurso", value: resourceLabel },
        { label: "Proveedor", value: providerLabel(operation.provider) },
        { label: "Solicitada por", value: resolveRequestedBy(operation.userId, currentUserId) },
        { label: "Creada", value: formatDate(operation.requestedAt), mono: true },
        {
          label: "Finalizada",
          value: operation.completedAt ? formatDate(operation.completedAt) : "—",
          mono: true,
        },
      ]}
      correlationId={operation.correlationId}
      trace={traceFor(operation)}
      onTraceInAudit={() =>
        router.push(`/audit-logs?cid=${encodeURIComponent(operation.correlationId)}`)
      }
    />
  );
}

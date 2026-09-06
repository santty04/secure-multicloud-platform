import { DetailDrawer } from "@/components/shared/detail-drawer";
import { providerFullName } from "@/components/shared/provider-badge";
import { useInstanceStatus } from "@/features/instances/use-instances";
import { instanceStatusFilterValue, instanceStatusPresentation } from "@/lib/utils/status";
import type { Instance } from "@/types/domain";

function wideButtonClass(kind: "neutral" | "danger", disabled: boolean) {
  if (disabled) {
    return "min-w-[96px] flex-1 rounded-lg border border-smp-disabled-line px-3 py-2.25 text-[12.5px] font-semibold text-smp-disabled disabled:cursor-not-allowed";
  }
  if (kind === "danger") {
    return "min-w-[96px] flex-1 rounded-lg border border-smp-danger/45 px-3 py-2.25 text-[12.5px] font-semibold text-smp-danger-text hover:bg-smp-danger/10";
  }
  return "min-w-[96px] flex-1 rounded-lg border border-smp-line-2 px-3 py-2.25 text-[12.5px] font-semibold text-smp-ink-muted hover:border-smp-accent hover:text-smp-ink";
}

/**
 * Wraps `<DetailDrawer>` for a single instance. No "Identidad cloud" row and
 * no correlation-id/trace block — those are corrections vs. the prototype:
 * `CurrentUserResponse` exposes no cloud-identity string, and instances
 * (unlike operations/audit logs) don't carry a correlation id at all.
 *
 * Opening this drawer is the only place that queries the real-time status
 * endpoint, and it does so with the platform UUID from `Instance.id`.
 */
export function InstanceDrawer({
  instance,
  open,
  onOpenChange,
  onStart,
  onStop,
  onDelete,
  canStart,
  canStop,
  canDelete,
  busyAction,
}: {
  instance: Instance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (instance: Instance) => void;
  onStop: (instance: Instance) => void;
  onDelete: (instance: Instance) => void;
  canStart: boolean;
  canStop: boolean;
  canDelete: boolean;
  busyAction?: "start" | "stop" | "delete";
}) {
  const statusQuery = useInstanceStatus({
    provider: instance?.provider,
    resourceId: instance?.id,
    enabled: open && instance !== null,
  });

  if (!instance) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} kindLabel="" title="" fields={[]} />;
  }

  const effectiveStatus = statusQuery.data?.status ?? instance.status;
  const { label } = instanceStatusPresentation(effectiveStatus);
  const bucket = instanceStatusFilterValue(effectiveStatus);
  const startDisabled = !canStart || bucket === "running" || busyAction !== undefined;
  const stopDisabled = !canStop || bucket === "stopped" || busyAction !== undefined;
  const deleteDisabled = !canDelete || busyAction !== undefined;
  const statusDetail = statusQuery.isFetching
    ? "Consultando estado real..."
    : statusQuery.isError
      ? "No se pudo consultar el estado real."
      : statusQuery.data
        ? "Estado real consultado desde el proveedor."
        : "Estado registrado por la plataforma.";

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      kindLabel={`Instancia · ${providerFullName(instance.provider)}`}
      title={instance.name}
      banner={
        statusQuery.isError
          ? {
              tone: "warning",
              title: "Estado:",
              text: statusQuery.error.message,
            }
          : undefined
      }
      fields={[
        { label: "Estado", value: label },
        { label: "Lectura de estado", value: statusDetail },
        { label: "Proveedor", value: providerFullName(instance.provider) },
        { label: "Región", value: instance.region, mono: true },
        { label: "Tipo de recurso", value: instance.resourceType, mono: true },
        { label: "Entorno", value: instance.environment },
        { label: "UUID interno", value: instance.id, mono: true },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => statusQuery.refetch()}
            disabled={statusQuery.isFetching}
            title="Actualizar estado real"
            aria-label="Actualizar estado real"
            className={wideButtonClass("neutral", statusQuery.isFetching)}
          >
            Actualizar estado
          </button>
          <button
            type="button"
            onClick={() => onStart(instance)}
            disabled={startDisabled}
            title={!canStart ? "Requiere permiso vm.start" : "Iniciar instancia"}
            aria-label={!canStart ? "Requiere permiso vm.start" : "Iniciar instancia"}
            className={wideButtonClass("neutral", startDisabled)}
          >
            {busyAction === "start" ? "Iniciando..." : "Iniciar"}
          </button>
          <button
            type="button"
            onClick={() => onStop(instance)}
            disabled={stopDisabled}
            title={!canStop ? "Requiere permiso vm.stop" : "Detener instancia"}
            aria-label={!canStop ? "Requiere permiso vm.stop" : "Detener instancia"}
            className={wideButtonClass("neutral", stopDisabled)}
          >
            {busyAction === "stop" ? "Deteniendo..." : "Detener"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(instance)}
            disabled={deleteDisabled}
            title={canDelete ? "Eliminar instancia" : "Requiere permiso vm.delete"}
            aria-label={canDelete ? "Eliminar instancia" : "Requiere permiso vm.delete"}
            className={wideButtonClass("danger", deleteDisabled)}
          >
            {busyAction === "delete" ? "Eliminando..." : "Eliminar"}
          </button>
        </>
      }
    />
  );
}

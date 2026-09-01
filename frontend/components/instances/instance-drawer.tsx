import { DetailDrawer } from "@/components/shared/detail-drawer";
import { providerFullName } from "@/components/shared/provider-badge";
import { can } from "@/features/auth/can";
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
 * The delete action only opens the confirm dialog (via `onDeleteRequest`,
 * same callback the row's inline delete button uses) — it never calls the
 * delete mutation directly, so the page can render one shared
 * `<DeleteInstanceDialog>` regardless of which trigger opened it.
 */
export function InstanceDrawer({
  instance,
  open,
  onOpenChange,
  permissions,
  isStarting,
  isStopping,
  isDeleting,
  onStart,
  onStop,
  onDeleteRequest,
}: {
  instance: Instance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: string[] | undefined;
  isStarting: boolean;
  isStopping: boolean;
  isDeleting: boolean;
  onStart: (instance: Instance) => void;
  onStop: (instance: Instance) => void;
  onDeleteRequest: (instance: Instance) => void;
}) {
  if (!instance) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} kindLabel="" title="" fields={[]} />;
  }

  const { label } = instanceStatusPresentation(instance.status);
  const bucket = instanceStatusFilterValue(instance.status);

  const canStart = can(permissions, "vm.start");
  const canStop = can(permissions, "vm.stop");
  const canDelete = can(permissions, "vm.delete");

  const startDisabled = !canStart || bucket === "running" || isStarting;
  const stopDisabled = !canStop || bucket === "stopped" || isStopping;
  const deleteDisabled = !canDelete || isDeleting;

  const startTitle = !canStart
    ? "Requiere permiso vm.start"
    : bucket === "running"
      ? "La instancia ya está en ejecución"
      : "Iniciar instancia";
  const stopTitle = !canStop
    ? "Requiere permiso vm.stop"
    : bucket === "stopped"
      ? "La instancia ya está detenida"
      : "Detener instancia";
  const deleteTitle = canDelete ? "Eliminar instancia" : "Requiere permiso vm.delete";

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      kindLabel={`Instancia · ${providerFullName(instance.provider)}`}
      title={instance.name}
      banner={
        !canDelete
          ? {
              tone: "warning",
              title: "RBAC:",
              text: "tu rol no incluye el permiso vm.delete. El backend rechazaría la solicitud con 403.",
            }
          : undefined
      }
      fields={[
        { label: "Estado", value: label },
        { label: "Proveedor", value: providerFullName(instance.provider) },
        { label: "Región", value: instance.region, mono: true },
        { label: "Tipo de recurso", value: instance.resourceType, mono: true },
        { label: "Entorno", value: instance.environment },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => onStart(instance)}
            disabled={startDisabled}
            title={startTitle}
            aria-label={startTitle}
            className={wideButtonClass("neutral", startDisabled)}
          >
            Iniciar
          </button>
          <button
            type="button"
            onClick={() => onStop(instance)}
            disabled={stopDisabled}
            title={stopTitle}
            aria-label={stopTitle}
            className={wideButtonClass("neutral", stopDisabled)}
          >
            Detener
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(instance)}
            disabled={deleteDisabled}
            title={deleteTitle}
            aria-label={deleteTitle}
            className={wideButtonClass("danger", deleteDisabled)}
          >
            Eliminar
          </button>
        </>
      }
    />
  );
}

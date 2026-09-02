import { DetailDrawer } from "@/components/shared/detail-drawer";
import { providerFullName } from "@/components/shared/provider-badge";
import { useInstanceStatus } from "@/features/instances/use-instances";
import { instanceStatusPresentation } from "@/lib/utils/status";
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
}: {
  instance: Instance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          : {
              tone: "warning",
              title: "Solo lectura:",
              text: "crear, iniciar, detener y eliminar todavía no están integrados en esta vista.",
            }
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
            disabled
            title="Iniciar instancia no integrado"
            aria-label="Iniciar instancia no integrado"
            className={wideButtonClass("neutral", true)}
          >
            Iniciar
          </button>
          <button
            type="button"
            disabled
            title="Detener instancia no integrado"
            aria-label="Detener instancia no integrado"
            className={wideButtonClass("neutral", true)}
          >
            Detener
          </button>
          <button
            type="button"
            disabled
            title="Eliminar instancia no integrado"
            aria-label="Eliminar instancia no integrado"
            className={wideButtonClass("danger", true)}
          >
            Eliminar
          </button>
        </>
      }
    />
  );
}

import { Info, Play, Square, Trash2 } from "lucide-react";
import { ProviderBadge } from "@/components/shared/provider-badge";
import { StatusPill } from "@/components/shared/status-pill";
import { instanceStatusFilterValue, instanceStatusPresentation } from "@/lib/utils/status";
import type { Instance } from "@/types/domain";

/** Shared with the page so the header row and each data row stay in lockstep. */
export const INSTANCES_GRID_TEMPLATE =
  "minmax(190px,1.5fr) 96px 116px 132px minmax(150px,1fr) 118px 128px";
export const INSTANCES_MIN_WIDTH = 1000;

const ACTION_BUTTON_BASE =
  "grid size-[27px] shrink-0 place-items-center rounded-lg border disabled:cursor-not-allowed";

function actionButtonClass(kind: "neutral" | "danger", disabled: boolean) {
  if (disabled) {
    return `${ACTION_BUTTON_BASE} border-smp-disabled-line text-smp-disabled`;
  }
  if (kind === "danger") {
    return `${ACTION_BUTTON_BASE} border-smp-danger/45 text-smp-danger-text hover:bg-smp-danger/10`;
  }
  return `${ACTION_BUTTON_BASE} border-smp-line-2 text-smp-accent-soft hover:border-smp-accent`;
}

/**
 * One table row rendered as a `<div>` (not `<tr>`) using the exact
 * `gridTemplateColumns` the page passes to `<DataTable>` — see that
 * component's doc comment. Write actions are intentionally disabled in this
 * read-only integration branch, so this row only opens the detail drawer.
 */
export function InstanceRow({
  instance,
  onOpen,
}: {
  instance: Instance;
  onOpen: (instance: Instance) => void;
}) {
  const { label, tone } = instanceStatusPresentation(instance.status);
  const bucket = instanceStatusFilterValue(instance.status);
  const startTitle =
    bucket === "running" ? "La instancia ya está en ejecución" : "Iniciar instancia no integrado";
  const stopTitle =
    bucket === "stopped" ? "La instancia ya está detenida" : "Detener instancia no integrado";
  const deleteTitle = "Eliminar instancia no integrado";

  return (
    <div
      style={{ minWidth: INSTANCES_MIN_WIDTH, gridTemplateColumns: INSTANCES_GRID_TEMPLATE }}
      className="grid items-center gap-2.5 border-b border-smp-line-soft px-4 py-2.25 text-[12.5px] text-smp-ink hover:bg-smp-surface-alt"
    >
      <button
        type="button"
        onClick={() => onOpen(instance)}
        className="min-w-0 truncate bg-transparent p-0 text-left text-smp-ink hover:text-smp-accent-soft"
      >
        <span className="block truncate font-semibold">{instance.name}</span>
        <span className="block truncate text-[10.5px] text-smp-ink-faint">{instance.resourceType}</span>
      </button>

      <span className="justify-self-start">
        <ProviderBadge provider={instance.provider} />
      </span>

      <span className="font-mono text-[11.5px] text-smp-ink-muted">{instance.region}</span>

      <span className="justify-self-start">
        <StatusPill label={label} tone={tone} />
      </span>

      <span className="truncate font-mono text-[11px] text-smp-ink-dim" title={instance.id}>
        {instance.id.slice(0, 8)}…
      </span>

      <span className="truncate text-[11.5px] text-smp-ink-dim">{instance.environment}</span>

      <span className="flex justify-end gap-1.25">
        <button
          type="button"
          disabled
          title={startTitle}
          aria-label={startTitle}
          className={actionButtonClass("neutral", true)}
        >
          <Play className="size-3.25" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled
          title={stopTitle}
          aria-label={stopTitle}
          className={actionButtonClass("neutral", true)}
        >
          <Square className="size-3.25" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled
          title={deleteTitle}
          aria-label={deleteTitle}
          className={actionButtonClass("danger", true)}
        >
          <Trash2 className="size-3.25" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onOpen(instance)}
          title="Ver información"
          aria-label="Ver información"
          className={actionButtonClass("neutral", false)}
        >
          <Info className="size-3.25" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

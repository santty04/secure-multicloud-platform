import { Info } from "lucide-react";
import { StatusPill } from "@/components/shared/status-pill";
import { instanceStatusPresentation } from "@/lib/utils/status";
import type { LiveAwsInstance } from "@/types/domain";

export const AWS_INVENTORY_GRID_TEMPLATE =
  "minmax(190px,1.5fr) minmax(150px,1fr) 132px 128px 150px 116px 112px";
export const AWS_INVENTORY_MIN_WIDTH = 1000;

export function AwsInventoryRow({
  instance,
  onOpen,
}: {
  instance: LiveAwsInstance;
  onOpen: (instance: LiveAwsInstance) => void;
}) {
  const { label, tone } = instanceStatusPresentation(instance.state);

  return (
    <div
      style={{ minWidth: AWS_INVENTORY_MIN_WIDTH, gridTemplateColumns: AWS_INVENTORY_GRID_TEMPLATE }}
      className="grid items-center gap-2.5 border-b border-smp-line-soft px-4 py-2.25 text-[12.5px] text-smp-ink hover:bg-smp-surface-alt"
    >
      <button
        type="button"
        onClick={() => onOpen(instance)}
        className="min-w-0 truncate bg-transparent p-0 text-left text-smp-ink hover:text-smp-accent-soft"
      >
        <span className="block truncate font-semibold">{instance.name || "Sin nombre"}</span>
        <span className="block truncate text-[10.5px] text-smp-ink-faint">Inventario AWS</span>
      </button>

      <span className="truncate font-mono text-[11px] text-smp-ink-dim" title={instance.instanceId}>
        {instance.instanceId}
      </span>

      <span className="justify-self-start">
        <StatusPill label={label} tone={tone} />
      </span>

      <span className="font-mono text-[11.5px] text-smp-ink-muted">{instance.instanceType}</span>
      <span className="font-mono text-[11.5px] text-smp-ink-muted">{instance.privateIp ?? "No disponible"}</span>
      <span className="font-mono text-[11.5px] text-smp-ink-muted">{instance.region}</span>
      <span className="flex justify-end gap-1.25">
        <button
          type="button"
          onClick={() => onOpen(instance)}
          title="Ver información"
          aria-label="Ver información"
          className="grid size-[27px] shrink-0 place-items-center rounded-lg border border-smp-line-2 text-smp-accent-soft hover:border-smp-accent"
        >
          <Info className="size-3.25" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

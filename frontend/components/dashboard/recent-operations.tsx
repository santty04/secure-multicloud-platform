import Link from "next/link";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/shared/status-pill";
import { providerForeground } from "@/components/shared/provider-badge";
import { operationStatusPresentation } from "@/lib/utils/status";
import { relativeTime } from "@/lib/utils/relative-time";
import { resolveResourceLabel } from "@/features/dashboard/selectors";
import type { Instance, Operation, OperationAction } from "@/types/domain";

const ACTION_LABEL: Record<OperationAction, string> = {
  create: "Crear",
  read: "Consultar",
  start: "Iniciar",
  stop: "Detener",
  update: "Actualizar",
  delete: "Eliminar",
};

/** Last 5 operations from the already-fetched list — `useOperations()` returns newest-first. */
export function RecentOperations({ operations, instances }: { operations: Operation[]; instances: Instance[] }) {
  const items = operations.slice(0, 5);

  return (
    <div className="min-w-0 rounded-[14px] border border-smp-line bg-smp-surface px-5 py-[18px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Operaciones recientes</h2>
        <Link
          href="/operations"
          className="rounded-lg border border-smp-line-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-smp-accent-soft hover:border-smp-accent"
        >
          Ver todas
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-[12.5px] text-smp-ink-dim">Sin operaciones registradas.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((o) => {
            const status = operationStatusPresentation(o.status);
            return (
              <div
                key={o.id}
                className="grid grid-cols-[minmax(0,1fr)_92px_116px_74px] items-center gap-2.5 border-b border-smp-line-soft py-[9px]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-semibold text-smp-ink">
                    {ACTION_LABEL[o.action] ?? o.action} · {resolveResourceLabel(o.resourceId, instances)}
                  </span>
                  <span className="block truncate font-mono text-[10.5px] text-smp-ink-faint">{o.id}</span>
                </span>
                <span className={cn("font-mono text-[10px] font-bold", providerForeground(o.provider))}>
                  {o.provider === "azure" ? "AZ" : "AWS"}
                </span>
                <StatusPill label={status.label} tone={status.tone} className="justify-self-start" />
                <span className="text-right text-[11px] text-smp-ink-dim">{relativeTime(o.requestedAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

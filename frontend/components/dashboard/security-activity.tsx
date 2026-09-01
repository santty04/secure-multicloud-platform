import Link from "next/link";
import { relativeTime } from "@/lib/utils/relative-time";
import { resolveResourceLabel } from "@/features/dashboard/selectors";
import type { AuditLog, Instance, OperationAction } from "@/types/domain";

const ACTION_LABEL: Record<OperationAction, string> = {
  create: "Crear",
  read: "Consultar",
  start: "Iniciar",
  stop: "Detener",
  update: "Actualizar",
  delete: "Eliminar",
};

/** Last 5-6 audit log entries from the already-fetched list — `useAuditLogs()` returns newest-first. */
export function SecurityActivity({ auditLogs, instances }: { auditLogs: AuditLog[]; instances: Instance[] }) {
  const items = auditLogs.slice(0, 6);

  return (
    <div className="min-w-0 rounded-[14px] border border-smp-line bg-smp-surface px-5 py-[18px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">Actividad de seguridad</h2>
        <Link
          href="/audit-logs"
          className="rounded-lg border border-smp-line-2 px-[11px] py-[5px] text-[11.5px] font-semibold text-smp-accent-soft hover:border-smp-accent"
        >
          Auditoría
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-3 text-[12.5px] text-smp-ink-dim">Sin actividad registrada.</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {items.map((a) => {
            const denied = a.decision === "denied";
            return (
              <div key={a.id} className="flex items-start gap-2.5 rounded-lg px-1.5 py-2">
                <span
                  className={
                    "grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-bold " +
                    (denied ? "bg-smp-danger/14 text-smp-danger-text" : "bg-smp-success/12 text-smp-success")
                  }
                >
                  {denied ? "✕" : "✓"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] text-smp-ink">
                    {a.roleCode ?? "usuario"} · {ACTION_LABEL[a.action] ?? a.action} ·{" "}
                    {resolveResourceLabel(a.resourceId, instances)}
                  </span>
                  <span className="block font-mono text-[10.5px] text-smp-ink-faint">
                    {a.requiredPermission} · {relativeTime(a.createdAt)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

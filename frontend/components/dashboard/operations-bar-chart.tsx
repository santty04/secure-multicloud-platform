import type { OpsPerDayBar } from "@/features/dashboard/selectors";

/**
 * 7-day stacked mini bar chart — plain divs with computed heights (no chart
 * library), matching the prototype's spacing exactly: 172px tall, 7 equal
 * columns, 11px-wide bars.
 */
export function OperationsBarChart({ data }: { data: OpsPerDayBar[] }) {
  return (
    <div className="rounded-[14px] border border-smp-line bg-smp-surface px-5 py-[18px]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="m-0 text-[15px] font-semibold">Operaciones por día</h2>
          <div className="mt-0.5 text-[11.5px] text-smp-ink-dim">Últimos 7 días · exitosas vs. fallidas</div>
        </div>
        <div className="flex gap-3.5 text-[11px] text-smp-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2 rounded-[2px] bg-smp-success" />
            Exitosas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2 rounded-[2px] bg-smp-danger" />
            Fallidas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block size-2 rounded-[2px] bg-smp-warning" />
            Pendientes
          </span>
        </div>
      </div>
      <div className="grid h-[172px] grid-cols-7 items-end gap-3.5">
        {data.map((d) => (
          <div key={d.date.toISOString()} className="flex h-full flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center gap-[3px]">
              <div
                title={d.okTitle}
                style={{ height: `${d.okHeightPct}%` }}
                className="w-[11px] rounded-t-[3px] bg-smp-success"
              />
              <div
                title={d.failTitle}
                style={{ height: `${d.failHeightPct}%` }}
                className="w-[11px] rounded-t-[3px] bg-smp-danger"
              />
              <div
                title={d.pendingTitle}
                style={{ height: `${d.pendingHeightPct}%` }}
                className="w-[11px] rounded-t-[3px] bg-smp-warning"
              />
            </div>
            <span className="font-mono text-[10.5px] text-smp-ink-faint">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

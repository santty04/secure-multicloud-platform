import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CorrelationId } from "./correlation-id";
import { cn } from "@/lib/utils";

export type DrawerField = { label: string; value: string; mono?: boolean };
export type DrawerTraceStep = { title: string; detail: string; color: string };
export type DrawerBanner = { tone: "warning" | "danger"; title: string; text: string };

/**
 * Shared shell for the instance / operation / audit-log side panels
 * (HANDOFF.md §1: detail lives in a 468px drawer so the underlying table
 * and its filters stay intact). Each feature drawer supplies its own
 * fields/actions; this owns layout, the correlation-id trace block, and
 * the "search this correlation ID in audit" jump.
 */
export function DetailDrawer({
  open,
  onOpenChange,
  kindLabel,
  title,
  banner,
  fields,
  correlationId,
  trace,
  onTraceInAudit,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kindLabel: string;
  title: string;
  banner?: DrawerBanner;
  fields: DrawerField[];
  correlationId?: string;
  trace?: DrawerTraceStep[];
  onTraceInAudit?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-smp-line-2 bg-smp-surface-alt p-0 sm:max-w-[468px]"
      >
        <div className="sticky top-0 border-b border-smp-line-soft bg-smp-surface-alt px-5 py-4">
          <div className="pr-8 text-[10.5px] font-bold tracking-[.08em] text-smp-ink-faint uppercase">
            {kindLabel}
          </div>
          <div className="truncate pr-8 text-base font-semibold text-smp-ink">{title}</div>
        </div>

        <div className="flex flex-col gap-4.5 overflow-y-auto p-5">
          {banner ? (
            <div
              className={cn(
                "flex gap-2.5 rounded-xl border p-3",
                banner.tone === "danger"
                  ? "border-smp-danger/35 bg-smp-danger/9"
                  : "border-smp-warning/30 bg-smp-warning/8",
              )}
            >
              <span
                className={cn(
                  "shrink-0 text-[13px] font-semibold",
                  banner.tone === "danger" ? "text-smp-danger-text" : "text-smp-warning",
                )}
              >
                {banner.title}
              </span>
              <span className="text-[12.5px] text-smp-ink-muted">{banner.text}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-smp-line bg-smp-line">
            {fields.map((f) => (
              <div key={f.label} className="grid grid-cols-[132px_1fr] items-baseline gap-3 bg-smp-surface px-3.5 py-2.5">
                <span className="text-[11.5px] text-smp-ink-dim">{f.label}</span>
                <span
                  className={cn(
                    "text-[12.5px] break-all text-smp-ink",
                    f.mono && "font-mono",
                  )}
                >
                  {f.value}
                </span>
              </div>
            ))}
          </div>

          {correlationId ? (
            <div className="rounded-xl border border-smp-line bg-smp-surface p-3.5">
              <div className="mb-2.5 text-[11px] font-bold tracking-[.07em] text-smp-ink-faint uppercase">
                Trazabilidad del correlation ID
              </div>
              <CorrelationId value={correlationId} className="mb-3" />
              {trace ? (
                <div className="flex flex-col">
                  {trace.map((step, i) => (
                    <div key={i} className="grid grid-cols-[16px_1fr] gap-2.75">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 size-2.25 shrink-0 rounded-full" style={{ background: step.color }} />
                        {i < trace.length - 1 ? <span className="w-px flex-1 bg-smp-line-2" /> : null}
                      </div>
                      <div className="pb-3">
                        <div className="text-[12.5px] font-semibold text-smp-ink">{step.title}</div>
                        <div className="font-mono text-[11.5px] text-smp-ink-dim">{step.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {onTraceInAudit ? (
                <button
                  type="button"
                  onClick={onTraceInAudit}
                  className="mt-1 w-full rounded-lg border border-smp-line-2 py-2 text-xs font-semibold text-smp-accent-soft hover:border-smp-accent"
                >
                  Buscar este correlation ID en auditoría
                </button>
              ) : null}
            </div>
          ) : null}

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

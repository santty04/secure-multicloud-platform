import { cn } from "@/lib/utils";
import type { KpiCardData } from "@/features/dashboard/selectors";

/** Single KPI card — pixel spec from the prototype's `showDashboard` KPI grid. */
export function KpiCard({
  label,
  value,
  hint,
  tag,
  iconBg,
  iconFg,
  valueClassName,
}: Omit<KpiCardData, "key">) {
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-smp-line bg-smp-surface px-4 py-[15px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-[.06em] text-smp-ink-dim uppercase">{label}</span>
        <span
          className={cn(
            "grid size-[22px] shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold",
            iconBg,
            iconFg,
          )}
        >
          {tag}
        </span>
      </div>
      <div className={cn("text-[28px] leading-none font-semibold tracking-[-.02em]", valueClassName)}>{value}</div>
      <div className="text-[11.5px] text-smp-ink-dim">{hint}</div>
    </div>
  );
}

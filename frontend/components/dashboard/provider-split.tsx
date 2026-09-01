import { cn } from "@/lib/utils";
import type { ProviderSplitData } from "@/features/dashboard/selectors";

const PROVIDER_TAG: Record<ProviderSplitData["provider"], string> = { azure: "AZ", aws: "AWS" };
const PROVIDER_BADGE_CLASS: Record<ProviderSplitData["provider"], string> = {
  azure: "bg-smp-azure/14 text-smp-azure",
  aws: "bg-smp-aws/14 text-smp-aws",
};
const PROVIDER_BAR_CLASS: Record<ProviderSplitData["provider"], string> = {
  azure: "bg-smp-azure",
  aws: "bg-smp-aws",
};

/** Azure/AWS split with progress bars — matches the prototype's `providerSplit` card. */
export function ProviderSplit({ data }: { data: ProviderSplitData[] }) {
  return (
    <div className="rounded-[14px] border border-smp-line bg-smp-surface px-5 py-[18px]">
      <h2 className="m-0 mb-3.5 text-[15px] font-semibold">Distribución por proveedor</h2>
      <div className="flex flex-col gap-3">
        {data.map((p) => (
          <div key={p.provider}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-smp-ink">
                <span
                  className={cn(
                    "grid size-[18px] place-items-center rounded-[5px] font-mono text-[9px] font-bold",
                    PROVIDER_BADGE_CLASS[p.provider],
                  )}
                >
                  {PROVIDER_TAG[p.provider]}
                </span>
                {p.label}
              </span>
              <span className="font-mono text-xs text-smp-ink-muted">
                {p.count} · {p.pctValue}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-smp-line-soft">
              <div
                className={cn("h-full rounded-full", PROVIDER_BAR_CLASS[p.provider])}
                style={{ width: `${p.pctValue}%` }}
              />
            </div>
            <div className="mt-[5px] text-[11px] text-smp-ink-faint">{p.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

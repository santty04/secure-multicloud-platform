import { cn } from "@/lib/utils";
import type { CloudProvider } from "@/types/domain";

const PROVIDER: Record<CloudProvider, { tag: string; className: string }> = {
  azure: { tag: "AZ", className: "bg-smp-azure/14 text-smp-azure" },
  aws: { tag: "AWS", className: "bg-smp-aws/14 text-smp-aws" },
};

export function ProviderBadge({
  provider,
  className,
}: {
  provider: CloudProvider;
  className?: string;
}) {
  const p = PROVIDER[provider];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold",
        p.className,
        className,
      )}
    >
      {p.tag}
    </span>
  );
}

/** Bare foreground color, for places that render just the tag as text (tables, drawers). */
export function providerForeground(provider: CloudProvider): string {
  return provider === "azure" ? "text-smp-azure" : "text-smp-aws";
}

export function providerLabel(provider: CloudProvider): string {
  return provider === "azure" ? "Azure" : "AWS";
}

export function providerFullName(provider: CloudProvider): string {
  return provider === "azure" ? "Microsoft Azure" : "Amazon Web Services";
}

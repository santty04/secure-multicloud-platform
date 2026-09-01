import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<StatusTone, string> = {
  success: "bg-smp-success/13 text-smp-success",
  warning: "bg-smp-warning/14 text-smp-warning",
  danger: "bg-smp-danger/14 text-smp-danger-text",
  info: "bg-smp-accent/14 text-smp-accent-soft",
  neutral: "bg-smp-ink-muted/14 text-smp-ink-muted",
};

export function StatusPill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        TONE[tone],
        className,
      )}
    >
      <span className="size-[5px] rounded-full bg-current" />
      {label}
    </span>
  );
}

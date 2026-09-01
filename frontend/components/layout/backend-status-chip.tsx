"use client";

import { useHealth } from "@/features/health/use-health";
import { cn } from "@/lib/utils";

/**
 * Real health check now (not the prototype's demo on/off toggle): polls
 * `GET /health` every 30s via `useHealth()`. Clicking the chip forces a
 * refetch. There is no "degraded" state — only ok / down / checking.
 */
export function BackendStatusChip() {
  const health = useHealth();
  const isChecking = health.isPending || health.isFetching;
  const isDown = !health.isPending && (health.isError || health.data?.status !== "ok");

  const label = health.isPending ? "Comprobando backend…" : isDown ? "Backend caído" : "Backend operativo";

  return (
    <button
      type="button"
      onClick={() => health.refetch()}
      title="Comprobar estado del backend"
      aria-label="Comprobar estado del backend"
      className={cn(
        "flex items-center gap-2 rounded-full border px-[11px] py-[5px] text-[11.5px] font-semibold transition-colors",
        health.isPending
          ? "border-smp-line-2 bg-smp-surface-alt text-smp-ink-dim"
          : isDown
            ? "border-smp-danger/45 bg-smp-danger/12 text-smp-danger-text"
            : "border-smp-success/30 bg-smp-success/10 text-smp-success",
      )}
    >
      <span
        className={cn(
          "size-[7px] shrink-0 rounded-full",
          isChecking && "animate-[smp-pulse_2.2s_ease-in-out_infinite]",
          health.isPending ? "bg-smp-ink-dim" : isDown ? "bg-smp-danger" : "bg-smp-success",
        )}
      />
      <span>{label}</span>
    </button>
  );
}

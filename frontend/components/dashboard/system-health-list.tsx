"use client";

import { cn } from "@/lib/utils";
import { useHealth } from "@/features/health/use-health";
import { decodeJwtExpiry } from "@/lib/auth/decode-jwt";
import { getAccessToken } from "@/lib/auth/session";

interface HealthRow {
  label: string;
  value: string;
  dotClassName: string;
  textClassName: string;
}

/**
 * Only two real signals exist: API health (`useHealth()`) and JWT session
 * expiry (decoded client-side, display only). The prototype's "Estado del
 * sistema" list also invented PostgreSQL/Azure Managed Identity/AWS IAM
 * rows — those have no backing endpoint, so they're intentionally omitted
 * here (see FOUNDATION.md corrections §3).
 */
export function SystemHealthList() {
  const health = useHealth();
  const apiHealthy = !health.isError && health.data?.status === "ok";

  const rows: HealthRow[] = [
    {
      label: "API FastAPI · /health",
      value: apiHealthy ? "200 OK" : "down",
      dotClassName: apiHealthy ? "bg-smp-success" : "bg-smp-danger-text",
      textClassName: apiHealthy ? "text-smp-success" : "text-smp-danger-text",
    },
  ];

  const token = getAccessToken();
  const expiry = token ? decodeJwtExpiry(token) : null;
  if (expiry) {
    // Display only (see decode-jwt.ts) — a per-render Date.now() read is
    // intentional here, this is a countdown label, not a memoized value.
    // eslint-disable-next-line react-hooks/purity
    const minutesLeft = Math.max(0, Math.round((expiry.getTime() - Date.now()) / 60_000));
    rows.push({
      label: "Sesión JWT",
      value: `expira en ${minutesLeft} min`,
      dotClassName: "bg-smp-accent-soft",
      textClassName: "text-smp-accent-soft",
    });
  }

  return (
    <div className="flex-1 rounded-[14px] border border-smp-line bg-smp-surface px-5 py-[18px]">
      <h2 className="m-0 mb-3 text-[15px] font-semibold">Estado del sistema</h2>
      <div className="flex flex-col gap-[9px]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5 text-[12.5px]">
            <span className={cn("size-[7px] shrink-0 rounded-full", r.dotClassName)} />
            <span className="flex-1 text-smp-ink-muted">{r.label}</span>
            <span className={cn("font-mono text-[11px]", r.textClassName)}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

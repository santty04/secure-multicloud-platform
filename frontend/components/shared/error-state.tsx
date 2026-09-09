import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

/**
 * Full-content replacement (not an overlay) for "we can't reach the
 * backend" — HANDOFF.md §1: never show cached data next to an unknown
 * backend state, that invites decisions on stale information.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto my-14 max-w-[560px] rounded-2xl border border-smp-danger/40 bg-smp-surface p-8 text-center"
    >
      <div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-smp-danger/14">
        <WifiOff className="size-6 text-smp-danger-text" />
      </div>
      <h2 className="mb-2 text-[19px] font-semibold text-smp-ink">No hay conexión con el servicio</h2>
      <p className="mb-1.5 text-balance text-[13.5px] text-smp-ink-muted">{error.message}</p>
      <Button onClick={onRetry} className="bg-smp-accent hover:bg-smp-accent-hover">
        Reintentar
      </Button>
    </div>
  );
}

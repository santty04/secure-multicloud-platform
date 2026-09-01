import { providerForeground } from "@/components/shared/provider-badge";
import { formatDate } from "@/lib/utils/format-date";
import { resolveResourceName, resolveUserLabel } from "./audit-format";
import { AuditResultBadge } from "./audit-result-badge";
import type { AuditLog } from "@/types/domain";

/**
 * Matches the prototype's audit row grid exactly (dc_full.html `mapAudit` /
 * `showAudit` sc-for): left accent border + tinted background for denied
 * rows (`rowBg`/`accent` in the prototype), transparent for allowed ones.
 * `smp-danger` is `#d65a3a`, the same rgb the prototype hardcodes.
 */
export function AuditRow({
  log,
  instanceNameById,
  currentUserId,
  onOpen,
}: {
  log: AuditLog;
  instanceNameById: Map<string, string>;
  currentUserId: string | undefined;
  onOpen: () => void;
}) {
  const denied = log.decision === "denied";
  const resourceName = resolveResourceName(log.resourceId, instanceNameById);
  const userLabel = resolveUserLabel(log.userId, currentUserId);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        minWidth: 980,
        gridTemplateColumns: "150px minmax(150px,1fr) 96px minmax(150px,1.1fr) 92px 108px minmax(140px,1fr)",
        borderLeft: `3px solid ${denied ? "var(--color-smp-danger-strong)" : "transparent"}`,
      }}
      className={
        "grid w-full items-center gap-2.5 border-0 border-b border-smp-line-soft px-4 py-2.5 text-left text-[12.5px] text-smp-ink hover:bg-smp-surface-raised " +
        (denied ? "bg-smp-danger/5" : "bg-transparent")
      }
    >
      <span className="font-mono text-[11px] text-smp-ink-dim">{formatDate(log.createdAt)}</span>
      <span className="truncate">{userLabel}</span>
      <span className="font-mono text-[11.5px] text-smp-ink-muted">{log.action}</span>
      <span className="truncate text-smp-ink-muted">{resourceName}</span>
      <span className={`font-mono text-[10.5px] font-bold ${providerForeground(log.provider)}`}>
        {log.provider === "azure" ? "AZ" : "AWS"}
      </span>
      <span className="justify-self-start">
        <AuditResultBadge decision={log.decision} />
      </span>
      <span className="truncate font-mono text-[10.5px] text-smp-ink-faint">{log.requiredPermission}</span>
    </button>
  );
}

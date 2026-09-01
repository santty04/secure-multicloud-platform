import { Search } from "lucide-react";
import { truncateId } from "./audit-format";
import type { AuditDecision, CloudProvider } from "@/types/domain";

/**
 * Mirrors the prototype's filter bar (dc_full.html `showAudit`), with two
 * real-backend adjustments (BACKEND_CONTRACT.md):
 *  - the user select can't hardcode emails (no users-list endpoint) — its
 *    options come from the userIds actually present in the fetched logs,
 *    passed in as `userOptions` and labelled by truncated id.
 *  - everything here filters the already-fetched list client-side; there is
 *    no server-side result/user/provider query param.
 * The "N denegados" counter is prop-driven (`deniedCount`) — the page owns
 * what "denied" means against the currently filtered rows.
 */
export function AuditFilters({
  search,
  onSearchChange,
  resultFilter,
  onResultFilterChange,
  userFilter,
  onUserFilterChange,
  userOptions,
  providerFilter,
  onProviderFilterChange,
  deniedCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  resultFilter: "all" | AuditDecision;
  onResultFilterChange: (value: "all" | AuditDecision) => void;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  userOptions: string[];
  providerFilter: "all" | CloudProvider;
  onProviderFilterChange: (value: "all" | CloudProvider) => void;
  deniedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-smp-line-soft bg-smp-surface-alt p-2.5">
      <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-smp-line-2 bg-smp-input px-2.75 py-1.75">
        <Search className="size-3.75 shrink-0 text-smp-ink-faint" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar por correlation ID"
          placeholder="Buscar por correlation ID, usuario o recurso…"
          className="flex-1 bg-transparent text-[13px] text-smp-ink outline-none placeholder:text-smp-ink-faint"
        />
      </div>

      <select
        value={resultFilter}
        onChange={(e) => onResultFilterChange(e.target.value as "all" | AuditDecision)}
        aria-label="Filtrar por resultado"
        className="rounded-lg border border-smp-line-2 bg-smp-input px-2.75 py-2 text-[12.5px] text-smp-ink-muted outline-none"
      >
        <option value="all">Todos los resultados</option>
        <option value="allowed">allowed</option>
        <option value="denied">denied</option>
      </select>

      <select
        value={userFilter}
        onChange={(e) => onUserFilterChange(e.target.value)}
        aria-label="Filtrar por usuario"
        className="rounded-lg border border-smp-line-2 bg-smp-input px-2.75 py-2 text-[12.5px] text-smp-ink-muted outline-none"
      >
        <option value="all">Todos los usuarios</option>
        {userOptions.map((userId) => (
          <option key={userId} value={userId}>
            {truncateId(userId)}
          </option>
        ))}
      </select>

      <select
        value={providerFilter}
        onChange={(e) => onProviderFilterChange(e.target.value as "all" | CloudProvider)}
        aria-label="Filtrar por proveedor"
        className="rounded-lg border border-smp-line-2 bg-smp-input px-2.75 py-2 text-[12.5px] text-smp-ink-muted outline-none"
      >
        <option value="all">Todos los proveedores</option>
        <option value="azure">Azure</option>
        <option value="aws">AWS</option>
      </select>

      <span className="font-mono text-[11.5px] text-smp-danger-text-soft">{deniedCount} denegados</span>
    </div>
  );
}

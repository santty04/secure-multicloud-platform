"use client";

import { Search } from "lucide-react";
import type { instanceStatusFilterValue } from "@/lib/utils/status";
import type { CloudProvider } from "@/types/domain";

export type InstanceProviderFilter = CloudProvider | "all";
/** The real `Instance.status` is free-form, not a fixed enum — bucket into
 * the same 3 non-"all" values `instanceStatusFilterValue()` produces, so
 * whatever the backend actually returns still lands somewhere filterable. */
export type InstanceStatusFilter = ReturnType<typeof instanceStatusFilterValue> | "all";

const PROVIDER_OPTIONS: { value: InstanceProviderFilter; label: string }[] = [
  { value: "all", label: "Todos los proveedores" },
  { value: "azure", label: "Azure" },
  { value: "aws", label: "AWS" },
];

const STATUS_OPTIONS: { value: InstanceStatusFilter; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "running", label: "En ejecución" },
  { value: "stopped", label: "Detenida" },
  { value: "pending", label: "Pendiente" },
  { value: "other", label: "Otro" },
];

const SELECT_CLASS =
  "rounded-[9px] border border-smp-line-2 bg-smp-input px-2.75 py-2 text-[12.5px] text-smp-ink-muted outline-none";

/**
 * Pure controlled inputs — matching/filtering happens in the parent
 * (`app/(dashboard)/instances/page.tsx`), since per BACKEND_CONTRACT.md
 * `GET /instances` has no query params at all, no server-side filters.
 */
export function InstanceFilters({
  search,
  onSearchChange,
  provider,
  onProviderChange,
  status,
  onStatusChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  provider: InstanceProviderFilter;
  onProviderChange: (value: InstanceProviderFilter) => void;
  status: InstanceStatusFilter;
  onStatusChange: (value: InstanceStatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-smp-line-soft bg-smp-surface-alt p-2.5">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[9px] border border-smp-line-2 bg-smp-input px-2.75 py-1.75">
        <Search className="size-3.75 shrink-0 text-smp-ink-faint" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar por nombre"
          placeholder="Buscar por nombre…"
          className="flex-1 bg-transparent text-[13px] text-smp-ink outline-none placeholder:text-smp-ink-faint"
        />
      </div>

      <select
        value={provider}
        onChange={(e) => onProviderChange(e.target.value as InstanceProviderFilter)}
        aria-label="Filtrar por proveedor"
        className={SELECT_CLASS}
      >
        {PROVIDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as InstanceStatusFilter)}
        aria-label="Filtrar por estado"
        className={SELECT_CLASS}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

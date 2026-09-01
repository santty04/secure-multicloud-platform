"use client";

import { Search } from "lucide-react";
import type { CloudProvider, OperationAction, OperationStatus } from "@/types/domain";

export type OperationStatusFilter = OperationStatus | "all";
export type OperationProviderFilter = CloudProvider | "all";
export type OperationActionFilter = OperationAction | "all";

const STATUS_OPTIONS: { value: OperationStatusFilter; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Succeeded" },
  { value: "failed", label: "Failed" },
];

const PROVIDER_OPTIONS: { value: OperationProviderFilter; label: string }[] = [
  { value: "all", label: "Todos los proveedores" },
  { value: "azure", label: "Azure" },
  { value: "aws", label: "AWS" },
];

const ACTION_OPTIONS: { value: OperationActionFilter; label: string }[] = [
  { value: "all", label: "Todas las acciones" },
  { value: "create", label: "create" },
  { value: "read", label: "read" },
  { value: "start", label: "start" },
  { value: "stop", label: "stop" },
  { value: "update", label: "update" },
  { value: "delete", label: "delete" },
];

const SELECT_CLASS =
  "rounded-[9px] border border-smp-line-2 bg-smp-input px-2.75 py-2 text-[12.5px] text-smp-ink-muted outline-none";

/**
 * Pure controlled inputs — matching/filtering happens in the parent
 * (`app/(dashboard)/operations/page.tsx`), since per BACKEND_CONTRACT.md
 * `GET /operations` has no server-side status/provider/action filtering.
 */
export function OperationFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  provider,
  onProviderChange,
  action,
  onActionChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: OperationStatusFilter;
  onStatusChange: (value: OperationStatusFilter) => void;
  provider: OperationProviderFilter;
  onProviderChange: (value: OperationProviderFilter) => void;
  action: OperationActionFilter;
  onActionChange: (value: OperationActionFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-smp-line-soft bg-smp-surface-alt p-2.5">
      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[9px] border border-smp-line-2 bg-smp-input px-2.75 py-1.75">
        <Search className="size-3.75 shrink-0 text-smp-ink-faint" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar operación"
          placeholder="Buscar por recurso, operation id o correlation id…"
          className="flex-1 bg-transparent text-[13px] text-smp-ink outline-none placeholder:text-smp-ink-faint"
        />
      </div>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as OperationStatusFilter)}
        aria-label="Filtrar por estado"
        className={SELECT_CLASS}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={provider}
        onChange={(e) => onProviderChange(e.target.value as OperationProviderFilter)}
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
        value={action}
        onChange={(e) => onActionChange(e.target.value as OperationActionFilter)}
        aria-label="Filtrar por acción"
        className={SELECT_CLASS}
      >
        {ACTION_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

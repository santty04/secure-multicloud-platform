"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import {
  OperationFilters,
  type OperationActionFilter,
  type OperationProviderFilter,
  type OperationStatusFilter,
} from "@/components/operations/operation-filters";
import { OperationDrawer } from "@/components/operations/operation-drawer";
import {
  OPERATIONS_GRID_TEMPLATE,
  OPERATIONS_MIN_WIDTH,
  OperationRow,
  resolveResourceLabel,
} from "@/components/operations/operation-row";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { useInstances } from "@/features/instances/use-instances";
import { useOperations } from "@/features/operations/use-operations";
import type { ApiError } from "@/lib/api/errors";
import type { Instance, Operation } from "@/types/domain";

const HEADERS = ["Operation ID", "Acción", "Recurso", "Proveedor", "Estado", "Creada", "Correlation ID"];

export default function OperationsPage() {
  const operationsQuery = useOperations();
  const instancesQuery = useInstances();
  const currentUserQuery = useCurrentUser();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OperationStatusFilter>("all");
  const [provider, setProvider] = useState<OperationProviderFilter>("all");
  const [action, setAction] = useState<OperationActionFilter>("all");
  const [drawerTarget, setDrawerTarget] = useState<Operation | null>(null);

  const instancesById = useMemo(() => {
    const map = new Map<string, Instance>();
    for (const instance of instancesQuery.data ?? []) {
      map.set(instance.id, instance);
    }
    return map;
  }, [instancesQuery.data]);

  const operations = useMemo(() => operationsQuery.data ?? [], [operationsQuery.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operations.filter((op) => {
      if (status !== "all" && op.status !== status) return false;
      if (provider !== "all" && op.provider !== provider) return false;
      if (action !== "all" && op.action !== action) return false;
      if (!q) return true;
      const resourceLabel = resolveResourceLabel(op.resourceId, instancesById).toLowerCase();
      return (
        resourceLabel.includes(q) ||
        op.id.toLowerCase().includes(q) ||
        op.correlationId.toLowerCase().includes(q)
      );
    });
  }, [operations, status, provider, action, search, instancesById]);

  function retry() {
    operationsQuery.refetch();
    instancesQuery.refetch();
  }

  // Per BACKEND_CONTRACT.md the operations/instances endpoints have no
  // shared "backend is down" signal beyond each query's own failure — either
  // one failing means we can't safely render this page.
  if (operationsQuery.isError) {
    return <ErrorState error={operationsQuery.error as unknown as ApiError} onRetry={retry} />;
  }
  if (instancesQuery.isError) {
    return <ErrorState error={instancesQuery.error as unknown as ApiError} onRetry={retry} />;
  }

  const isLoading = operationsQuery.isPending || instancesQuery.isPending;

  return (
    <div className="flex max-w-[1500px] flex-col gap-3.5">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-smp-ink">Operaciones</h1>
        <p className="text-[13px] text-smp-ink-dim">
          Historial de operaciones solicitadas a los proveedores cloud, con su correlation ID.
        </p>
      </div>

      <OperationFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        provider={provider}
        onProviderChange={setProvider}
        action={action}
        onActionChange={setAction}
      />

      <DataTable minWidth={OPERATIONS_MIN_WIDTH} gridTemplateColumns={OPERATIONS_GRID_TEMPLATE} headers={HEADERS}>
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin operaciones"
            description="Ninguna operación coincide con los filtros aplicados."
          />
        ) : (
          filtered.map((op) => (
            <OperationRow
              key={op.id}
              operation={op}
              instancesById={instancesById}
              currentUserId={currentUserQuery.data?.id}
              onOpen={setDrawerTarget}
            />
          ))
        )}

        {/* GET /operations only supports `?limit=` (BACKEND_CONTRACT.md) — there is
            no offset/cursor to page against, so these stay permanently disabled
            rather than faking working pagination. */}
        <div
          style={{ minWidth: OPERATIONS_MIN_WIDTH }}
          className="flex items-center justify-between gap-3 px-4 py-2.75 text-[11.5px] text-smp-ink-dim"
        >
          <span>
            Mostrando {filtered.length} de {operations.length} operaciones · limit=100
          </span>
          <span className="flex gap-1.5">
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border border-smp-line px-2.75 py-1.25 text-[11.5px] text-smp-disabled"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border border-smp-line px-2.75 py-1.25 text-[11.5px] text-smp-disabled"
            >
              Siguiente
            </button>
          </span>
        </div>
      </DataTable>

      <OperationDrawer
        operation={drawerTarget}
        open={drawerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerTarget(null);
        }}
        instancesById={instancesById}
        currentUserId={currentUserQuery.data?.id}
      />
    </div>
  );
}

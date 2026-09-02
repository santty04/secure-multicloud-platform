"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AwsInventoryDrawer } from "@/components/instances/aws-inventory-drawer";
import {
  AWS_INVENTORY_GRID_TEMPLATE,
  AWS_INVENTORY_MIN_WIDTH,
  AwsInventoryRow,
} from "@/components/instances/aws-inventory-row";
import {
  InstanceFilters,
  type InstanceProviderFilter,
  type InstanceStatusFilter,
} from "@/components/instances/instance-filters";
import { InstanceDrawer } from "@/components/instances/instance-drawer";
import { INSTANCES_GRID_TEMPLATE, INSTANCES_MIN_WIDTH, InstanceRow } from "@/components/instances/instance-row";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { useLiveAwsInstances, useManagedInstances } from "@/features/instances/use-instances";
import { instanceStatusFilterValue } from "@/lib/utils/status";
import type { Instance, LiveAwsInstance } from "@/types/domain";

const MANAGED_HEADERS = ["Instancia", "Proveedor", "Región", "Estado", "Resource ID", "Entorno", "Acciones"];
const AWS_HEADERS = ["Instancia", "Instance ID", "Estado", "Tipo", "IP privada", "Región", "Acciones"];

export default function InstancesPage() {
  const currentUserQuery = useCurrentUser();
  const managedQuery = useManagedInstances();
  const awsQuery = useLiveAwsInstances();

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<InstanceProviderFilter>("all");
  const [status, setStatus] = useState<InstanceStatusFilter>("all");
  const [drawerTarget, setDrawerTarget] = useState<Instance | null>(null);
  const [awsDrawerTarget, setAwsDrawerTarget] = useState<LiveAwsInstance | null>(null);

  const managedInstances = useMemo(() => managedQuery.data ?? [], [managedQuery.data]);
  const awsInstances = useMemo(() => awsQuery.data ?? [], [awsQuery.data]);

  const filteredManaged = useMemo(() => {
    const q = search.trim().toLowerCase();
    return managedInstances.filter((instance) => {
      if (provider !== "all" && instance.provider !== provider) return false;
      if (status !== "all" && instanceStatusFilterValue(instance.status) !== status) return false;
      if (q && !instance.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [managedInstances, provider, search, status]);

  const filteredAws = useMemo(() => {
    const q = search.trim().toLowerCase();
    return awsInstances.filter((instance) => {
      if (provider !== "all" && provider !== "aws") return false;
      if (status !== "all" && instanceStatusFilterValue(instance.state) !== status) return false;
      if (
        q &&
        !instance.name.toLowerCase().includes(q) &&
        !instance.instanceId.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [awsInstances, provider, search, status]);

  function retryAll() {
    managedQuery.refetch();
    awsQuery.refetch();
  }

  if (managedQuery.isError && awsQuery.isError) {
    return <ErrorState error={managedQuery.error} onRetry={retryAll} />;
  }

  return (
    <div className="flex max-w-[1500px] flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-smp-ink">Instancias</h1>
          <p className="text-[13px] text-smp-ink-dim">
            Recursos reales de FastAPI e inventario AWS live separados para no mezclar administrado con descubierto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUserQuery.data ? (
            <div className="flex items-center gap-2 rounded-full border border-smp-line bg-smp-surface-alt px-2.75 py-1.25 text-[11.5px] text-smp-ink-muted">
              <span className="size-1.5 rounded-full bg-smp-accent-soft" />
              Actuando como{" "}
              <strong className="font-semibold text-smp-ink">{currentUserQuery.data.roleName}</strong>
            </div>
          ) : null}
          <Button
            type="button"
            onClick={retryAll}
            variant="outline"
            className="border-smp-line-2 bg-smp-surface-alt text-smp-ink-muted hover:text-smp-ink"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refrescar
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-smp-warning/30 bg-smp-warning/8 px-3.5 py-2.5 text-[12px] text-smp-warning-ink">
        Las acciones de creación, inicio, detención y eliminación permanecen deshabilitadas en esta rama de solo lectura.
      </div>

      <InstanceFilters
        search={search}
        onSearchChange={setSearch}
        provider={provider}
        onProviderChange={setProvider}
        status={status}
        onStatusChange={setStatus}
      />

      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-smp-ink">Recursos administrados por la plataforma</h2>
            <p className="text-[11.5px] text-smp-ink-dim">Fuente: GET /api/v1/instances.</p>
          </div>
          {managedQuery.isError ? (
            <span className="text-[12px] text-smp-danger-text">{managedQuery.error.message}</span>
          ) : null}
        </div>

        <DataTable
          minWidth={INSTANCES_MIN_WIDTH}
          gridTemplateColumns={INSTANCES_GRID_TEMPLATE}
          headers={MANAGED_HEADERS}
          headerAlign={{ 6: "right" }}
        >
          {managedQuery.isPending ? (
            <TableSkeleton />
          ) : managedQuery.isError ? (
            <EmptyState title="No se pudieron cargar recursos" description={managedQuery.error.message} />
          ) : filteredManaged.length === 0 ? (
            <EmptyState
              title={managedInstances.length === 0 ? "Sin recursos administrados" : "Sin resultados"}
              description={
                managedInstances.length === 0
                  ? "FastAPI no devolvió recursos administrados por la plataforma."
                  : "Ningún recurso administrado coincide con los filtros aplicados."
              }
            />
          ) : (
            filteredManaged.map((instance) => (
              <InstanceRow key={instance.id} instance={instance} onOpen={setDrawerTarget} />
            ))
          )}
        </DataTable>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-smp-ink">Inventario AWS real</h2>
            <p className="text-[11.5px] text-smp-ink-dim">Fuente: GET /api/v1/instances/aws/live.</p>
          </div>
          {awsQuery.isError ? (
            <span className="text-[12px] text-smp-danger-text">{awsQuery.error.message}</span>
          ) : null}
        </div>

        <DataTable
          minWidth={AWS_INVENTORY_MIN_WIDTH}
          gridTemplateColumns={AWS_INVENTORY_GRID_TEMPLATE}
          headers={AWS_HEADERS}
          headerAlign={{ 6: "right" }}
        >
          {awsQuery.isPending ? (
            <TableSkeleton />
          ) : awsQuery.isError ? (
            <EmptyState title="No se pudo cargar AWS" description={awsQuery.error.message} />
          ) : filteredAws.length === 0 ? (
            <EmptyState
              title={awsInstances.length === 0 ? "Sin inventario AWS" : "Sin resultados"}
              description={
                awsInstances.length === 0
                  ? "AWS no devolvió instancias visibles para el rol autenticado."
                  : "Ninguna instancia de AWS live coincide con los filtros aplicados."
              }
            />
          ) : (
            filteredAws.map((instance) => (
              <AwsInventoryRow key={instance.instanceId} instance={instance} onOpen={setAwsDrawerTarget} />
            ))
          )}
        </DataTable>
      </section>

      <InstanceDrawer
        instance={drawerTarget}
        open={drawerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerTarget(null);
        }}
      />

      <AwsInventoryDrawer
        instance={awsDrawerTarget}
        open={awsDrawerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAwsDrawerTarget(null);
        }}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { AwsInventoryDrawer } from "@/components/instances/aws-inventory-drawer";
import { CreateInstanceDialog } from "@/components/instances/create-instance-dialog";
import { DeleteInstanceDialog } from "@/components/instances/delete-instance-dialog";
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
import { canInCloud, cloudsWith } from "@/features/auth/can";
import {
  useCreateInstance,
  useDeleteInstance,
  useStartInstance,
  useStopInstance,
  type CreateInstanceVars,
} from "@/features/instances/use-instance-action";
import { useLiveAwsInstances, useManagedInstances } from "@/features/instances/use-instances";
import { isApiError } from "@/lib/api/errors";
import { notify } from "@/components/shared/toast";
import { instanceStatusFilterValue } from "@/lib/utils/status";
import type { Instance, LiveAwsInstance } from "@/types/domain";

const MANAGED_HEADERS = ["Instancia", "Proveedor", "Región", "Estado", "Resource ID", "Entorno", "Acciones"];
const AWS_HEADERS = ["Instancia", "Instance ID", "Estado", "Tipo", "IP privada", "Región", "Acciones"];

export default function InstancesPage() {
  const currentUserQuery = useCurrentUser();
  const managedQuery = useManagedInstances();
  const currentUser = currentUserQuery.data;
  // The live AWS inventory is only fetched (and shown) with AWS read access.
  const canReadAws = canInCloud(currentUser, "aws", "vm.read");
  const awsQuery = useLiveAwsInstances({ enabled: canReadAws });
  const createInstance = useCreateInstance();
  const startInstance = useStartInstance();
  const stopInstance = useStopInstance();
  const deleteInstance = useDeleteInstance();

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<InstanceProviderFilter>("all");
  const [status, setStatus] = useState<InstanceStatusFilter>("all");
  const [drawerTarget, setDrawerTarget] = useState<Instance | null>(null);
  const [awsDrawerTarget, setAwsDrawerTarget] = useState<LiveAwsInstance | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Instance | null>(null);
  const [busyTarget, setBusyTarget] = useState<{ id: string; action: "start" | "stop" | "delete" } | null>(null);

  const managedInstances = useMemo(() => managedQuery.data ?? [], [managedQuery.data]);
  const awsInstances = useMemo(() => awsQuery.data ?? [], [awsQuery.data]);
  // VM actions follow the user's role in each instance's cloud.
  const creatableClouds = cloudsWith(currentUser, "vm.create");
  const canCreate = creatableClouds.length > 0;
  const actionsFor = (instance: Instance | null) => {
    const provider = instance?.provider;
    return {
      canStart: provider !== undefined && canInCloud(currentUser, provider, "vm.start"),
      canStop: provider !== undefined && canInCloud(currentUser, provider, "vm.stop"),
      canDelete: provider !== undefined && canInCloud(currentUser, provider, "vm.delete"),
    };
  };

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
    // refetch() ignores `enabled`, so skip AWS without read access there.
    if (canReadAws) awsQuery.refetch();
  }

  function apiErrorMessage(error: unknown) {
    return isApiError(error) ? error.message : "No se pudo completar la acción. Inténtalo de nuevo.";
  }

  function notifyActionError(title: string, error: unknown) {
    notify({
      kind: "error",
      title,
      message: apiErrorMessage(error),
      correlationId: isApiError(error) ? error.correlationId : undefined,
    });
  }

  function handleCreate(values: CreateInstanceVars) {
    createInstance.mutate(values, {
      onSuccess: (result) => {
        setCreateOpen(false);
        notify({
          kind: "success",
          title: "Instancia creada",
          message: `${result.name} quedó registrada como recurso administrado.`,
        });
      },
      onError: (error) => notifyActionError("No se pudo crear la instancia", error),
    });
  }

  function handleAction(action: "start" | "stop", instance: Instance) {
    setBusyTarget({ id: instance.id, action });
    const mutation = action === "start" ? startInstance : stopInstance;
    mutation.mutate(
      { provider: instance.provider, resourceId: instance.id, name: instance.name },
      {
        onSuccess: (result) => {
          notify({
            kind: "success",
            title: action === "start" ? "Inicio solicitado" : "Detención solicitada",
            message:
              result.status === "simulated"
                ? "La acción quedó registrada, pero no modificó recursos reales."
                : "La instancia está procesando el cambio.",
          });
        },
        onError: (error) =>
          notifyActionError(action === "start" ? "No se pudo iniciar la instancia" : "No se pudo detener la instancia", error),
        onSettled: () => setBusyTarget(null),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyTarget({ id: target.id, action: "delete" });
    deleteInstance.mutate(
      { provider: target.provider, resourceId: target.id, name: target.name },
      {
        onSuccess: (result) => {
          setDeleteTarget(null);
          if (drawerTarget?.id === target.id) setDrawerTarget(null);
          notify({
            kind: result.status === "simulated" ? "info" : "success",
            title: result.status === "simulated" ? "Eliminación simulada" : "Eliminación en proceso",
            message:
              result.status === "simulated"
                ? "La acción quedó registrada, pero no se modificaron recursos reales. La instancia se retiró del listado de administrados."
                : "La instancia está procesando la eliminación.",
          });
        },
        onError: (error) => notifyActionError("No se pudo eliminar la instancia", error),
        onSettled: () => setBusyTarget(null),
      },
    );
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
            Administra recursos registrados y consulta el inventario detectado en tus proveedores.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 rounded-full border border-smp-line bg-smp-surface-alt px-2.75 py-1.25 text-[11.5px] text-smp-ink-muted">
              <span className="size-1.5 rounded-full bg-smp-accent-soft" />
              Azure:{" "}
              <strong className="font-semibold text-smp-ink">{currentUser.cloudAccess.azure?.roleName ?? "Sin acceso"}</strong>
              <span className="text-smp-ink-faint">·</span>
              AWS:{" "}
              <strong className="font-semibold text-smp-ink">{currentUser.cloudAccess.aws?.roleName ?? "Sin acceso"}</strong>
            </div>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              createInstance.reset();
              setCreateOpen(true);
            }}
            disabled={!canCreate}
            title={canCreate ? "Crear instancia" : "Requiere permiso vm.create en Azure o AWS"}
            className="bg-smp-accent text-white hover:bg-smp-accent-hover"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Crear
          </Button>
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
            <p className="text-[11.5px] text-smp-ink-dim">Instancias registradas para administración.</p>
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
                  ? "Aún no hay recursos registrados para administración."
                  : "Ningún recurso administrado coincide con los filtros aplicados."
              }
            />
          ) : (
            filteredManaged.map((instance) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                onOpen={setDrawerTarget}
                onStart={(target) => handleAction("start", target)}
                onStop={(target) => handleAction("stop", target)}
                onDelete={setDeleteTarget}
                {...actionsFor(instance)}
                busyAction={busyTarget?.id === instance.id ? busyTarget.action : undefined}
              />
            ))
          )}
        </DataTable>
      </section>

      {canReadAws ? (
      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-smp-ink">Inventario AWS real</h2>
            <p className="text-[11.5px] text-smp-ink-dim">Instancias detectadas directamente en AWS.</p>
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
      ) : null}

      <InstanceDrawer
        instance={drawerTarget}
        open={drawerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerTarget(null);
        }}
        onStart={(target) => handleAction("start", target)}
        onStop={(target) => handleAction("stop", target)}
        onDelete={setDeleteTarget}
        {...actionsFor(drawerTarget)}
        busyAction={busyTarget && busyTarget.id === drawerTarget?.id ? busyTarget.action : undefined}
      />

      <AwsInventoryDrawer
        instance={awsDrawerTarget}
        open={awsDrawerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAwsDrawerTarget(null);
        }}
      />

      <CreateInstanceDialog
        open={createOpen}
        isLoading={createInstance.isPending}
        errorMessage={createInstance.error ? apiErrorMessage(createInstance.error) : null}
        onSubmit={handleCreate}
        allowedProviders={creatableClouds}
        onCancel={() => {
          createInstance.reset();
          setCreateOpen(false);
        }}
      />

      <DeleteInstanceDialog
        instance={deleteTarget}
        isLoading={deleteInstance.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

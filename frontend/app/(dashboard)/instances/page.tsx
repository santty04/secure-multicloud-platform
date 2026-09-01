"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { notify } from "@/components/shared/toast";
import { DeleteInstanceDialog } from "@/components/instances/delete-instance-dialog";
import {
  InstanceFilters,
  type InstanceProviderFilter,
  type InstanceStatusFilter,
} from "@/components/instances/instance-filters";
import { InstanceDrawer } from "@/components/instances/instance-drawer";
import { INSTANCES_GRID_TEMPLATE, INSTANCES_MIN_WIDTH, InstanceRow } from "@/components/instances/instance-row";
import { can } from "@/features/auth/can";
import { useCurrentUser } from "@/features/auth/use-current-user";
import {
  useDeleteInstance,
  useStartInstance,
  useStopInstance,
} from "@/features/instances/use-instance-action";
import { useInstances } from "@/features/instances/use-instances";
import type { ApiError } from "@/lib/api/errors";
import { instanceStatusFilterValue } from "@/lib/utils/status";
import type { Instance, InstanceActionResult } from "@/types/domain";

const HEADERS = ["Instancia", "Proveedor", "Región", "Estado", "Resource ID", "Entorno", "Acciones"];

export default function InstancesPage() {
  const instancesQuery = useInstances();
  const currentUserQuery = useCurrentUser();
  // Treat a still-loading/absent user as "no permissions" rather than
  // crashing — `can()` already returns false for `undefined`, this page just
  // never needs to special-case it beyond passing the value through.
  const permissions = currentUserQuery.data?.permissions;

  const startMutation = useStartInstance();
  const stopMutation = useStopInstance();
  const deleteMutation = useDeleteInstance();

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<InstanceProviderFilter>("all");
  const [status, setStatus] = useState<InstanceStatusFilter>("all");
  const [drawerTarget, setDrawerTarget] = useState<Instance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Instance | null>(null);

  const instances = useMemo(() => instancesQuery.data ?? [], [instancesQuery.data]);

  // GET /api/v1/instances has no query params at all (BACKEND_CONTRACT.md) —
  // search/provider/status filtering all happens client-side over the
  // already-fetched list.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return instances.filter((instance) => {
      if (provider !== "all" && instance.provider !== provider) return false;
      if (status !== "all" && instanceStatusFilterValue(instance.status) !== status) return false;
      if (q && !instance.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [instances, search, provider, status]);

  function notifyActionSuccess(verb: string, name: string, result: InstanceActionResult) {
    const message =
      result.status === "simulated"
        ? `${name} fue ${verb} (simulada por el backend, sin escritura real al proveedor).`
        : `${name} fue ${verb}.`;
    notify({ kind: "success", title: "Operación completada", message });
  }

  function notifyActionError(error: ApiError) {
    notify({
      kind: "error",
      title: "No se pudo completar la operación",
      message: error.message,
      correlationId: error.correlationId,
    });
  }

  function handleStart(instance: Instance) {
    startMutation.mutate(
      { provider: instance.provider, resourceId: instance.id, name: instance.name },
      {
        onSuccess: (result) => notifyActionSuccess("iniciada", instance.name, result),
        onError: (error) => notifyActionError(error),
      },
    );
  }

  function handleStop(instance: Instance) {
    stopMutation.mutate(
      { provider: instance.provider, resourceId: instance.id, name: instance.name },
      {
        onSuccess: (result) => notifyActionSuccess("detenida", instance.name, result),
        onError: (error) => notifyActionError(error),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const instance = deleteTarget;
    deleteMutation.mutate(
      { provider: instance.provider, resourceId: instance.id, name: instance.name },
      {
        onSuccess: (result) => {
          notifyActionSuccess("eliminada", instance.name, result);
          setDeleteTarget(null);
          setDrawerTarget((current) => (current?.id === instance.id ? null : current));
        },
        onError: (error) => {
          notifyActionError(error);
          setDeleteTarget(null);
        },
      },
    );
  }

  function retry() {
    instancesQuery.refetch();
  }

  if (instancesQuery.isError) {
    return <ErrorState error={instancesQuery.error} onRetry={retry} />;
  }

  const isLoading = instancesQuery.isPending;

  const canStart = can(permissions, "vm.start");
  const canStop = can(permissions, "vm.stop");
  const canDelete = can(permissions, "vm.delete");

  // "Intentar acción no autorizada" only makes sense if the current role is
  // actually missing a start/stop permission — a full administrator has
  // both, so there's nothing honest to deny; hide the button rather than
  // fake a denial (FOUNDATION.md corrections §1/§2: no fabricated RBAC UX).
  const deniedAction: "start" | "stop" | undefined = !canStart ? "start" : !canStop ? "stop" : undefined;
  const deniedTarget = deniedAction && instances.length > 0 ? instances[0] : undefined;

  function handleAttemptDenied() {
    if (!deniedTarget || !deniedAction) return;
    if (deniedAction === "start") {
      handleStart(deniedTarget);
    } else {
      handleStop(deniedTarget);
    }
  }

  const rbacRows: { label: string; permission: string; allowed: boolean }[] = [
    { label: "Iniciar instancia", permission: "vm.start", allowed: canStart },
    { label: "Detener instancia", permission: "vm.stop", allowed: canStop },
    { label: "Eliminar instancia", permission: "vm.delete", allowed: canDelete },
  ];

  return (
    <div className="flex max-w-[1500px] flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-smp-ink">Instancias</h1>
          <p className="text-[13px] text-smp-ink-dim">
            Máquinas virtuales administradas en Azure y AWS. Las acciones se validan siempre en el backend.
          </p>
        </div>
        {currentUserQuery.data ? (
          <div className="flex items-center gap-2 rounded-full border border-smp-line bg-smp-surface-alt px-2.75 py-1.25 text-[11.5px] text-smp-ink-muted">
            <span className="size-1.5 rounded-full bg-smp-accent-soft" />
            Actuando como{" "}
            <strong className="font-semibold text-smp-ink">{currentUserQuery.data.roleName}</strong>
          </div>
        ) : null}
      </div>

      <InstanceFilters
        search={search}
        onSearchChange={setSearch}
        provider={provider}
        onProviderChange={setProvider}
        status={status}
        onStatusChange={setStatus}
      />

      <DataTable
        minWidth={INSTANCES_MIN_WIDTH}
        gridTemplateColumns={INSTANCES_GRID_TEMPLATE}
        headers={HEADERS}
        headerAlign={{ 6: "right" }}
      >
        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="Ninguna instancia coincide con los filtros aplicados."
          />
        ) : (
          filtered.map((instance) => (
            <InstanceRow
              key={instance.id}
              instance={instance}
              permissions={permissions}
              isStarting={startMutation.isPending && startMutation.variables?.resourceId === instance.id}
              isStopping={stopMutation.isPending && stopMutation.variables?.resourceId === instance.id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables?.resourceId === instance.id}
              onStart={handleStart}
              onStop={handleStop}
              onDeleteRequest={setDeleteTarget}
              onOpen={setDrawerTarget}
            />
          ))
        )}
      </DataTable>

      <div className="rounded-2xl border border-smp-line-soft bg-smp-surface-alt p-4.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-smp-ink">Doble capa de autorización</h2>
            <div className="mt-0.5 text-[11.5px] text-smp-ink-dim">
              Rol actual: {currentUserQuery.data?.roleName ?? "—"} · el backend revalida cada permiso;
              ocultar botones no es un control de seguridad.
            </div>
          </div>
          {deniedTarget ? (
            <button
              type="button"
              onClick={handleAttemptDenied}
              className="rounded-lg border border-smp-danger/45 px-3.25 py-2 text-xs font-semibold text-smp-danger-text hover:bg-smp-danger/10"
            >
              Intentar acción no autorizada
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2.5">
          {rbacRows.map((row) => (
            <div key={row.permission} className="rounded-[11px] border border-smp-line bg-smp-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-smp-ink">{row.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    row.allowed ? "bg-smp-success/14 text-smp-success" : "bg-smp-danger/14 text-smp-danger-text"
                  }`}
                >
                  {row.allowed ? "Permitido" : "Denegado"}
                </span>
              </div>
              <div className="font-mono text-[11px] text-smp-ink-dim">app: {row.permission}</div>
            </div>
          ))}
        </div>
      </div>

      <InstanceDrawer
        instance={drawerTarget}
        open={drawerTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerTarget(null);
        }}
        permissions={permissions}
        isStarting={
          drawerTarget !== null &&
          startMutation.isPending &&
          startMutation.variables?.resourceId === drawerTarget.id
        }
        isStopping={
          drawerTarget !== null &&
          stopMutation.isPending &&
          stopMutation.variables?.resourceId === drawerTarget.id
        }
        isDeleting={
          drawerTarget !== null &&
          deleteMutation.isPending &&
          deleteMutation.variables?.resourceId === drawerTarget.id
        }
        onStart={handleStart}
        onStop={handleStop}
        onDeleteRequest={setDeleteTarget}
      />

      <DeleteInstanceDialog
        instance={deleteTarget}
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

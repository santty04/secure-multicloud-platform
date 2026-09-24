"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditRow } from "@/components/audit/audit-row";
import { AuditDrawer } from "@/components/audit/audit-drawer";
import { AuthEventsView } from "@/components/audit/auth-events-view";
import { resolveResourceName } from "@/components/audit/audit-format";
import { useAuditLogs } from "@/features/audit/use-audit-logs";
import { useInstances } from "@/features/instances/use-instances";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { can } from "@/features/auth/can";
import { cn } from "@/lib/utils";
import type { AuditDecision, CloudProvider } from "@/types/domain";

const GRID_COLUMNS = "150px minmax(150px,1fr) 96px minmax(150px,1.1fr) 92px 108px minmax(140px,1fr)";
const HEADERS = ["Fecha y hora", "Usuario", "Acción", "Recurso", "Proveedor", "Resultado", "Permiso requerido"];

/**
 * Read-only audit log view. `GET /api/v1/audit-logs?limit=` is the only
 * server call (no server-side result/user/provider filters, no by-id
 * endpoint — BACKEND_CONTRACT.md) so every filter here runs client-side over
 * the already-fetched list, and the drawer finds its row in that same list
 * rather than re-fetching.
 */
function OperationsAudit() {
  const searchParams = useSearchParams();
  const auditLogsQuery = useAuditLogs();
  const instancesQuery = useInstances();
  const currentUserQuery = useCurrentUser();

  // The operations page's drawer links here with `?cid=<correlationId>` —
  // prefill the search box from the URL on first render so that handoff
  // works regardless of which page finishes first.
  const [search, setSearch] = useState(() => searchParams.get("cid") ?? "");
  const [resultFilter, setResultFilter] = useState<"all" | AuditDecision>("all");
  const [userFilter, setUserFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState<"all" | CloudProvider>("all");
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const instanceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const instance of instancesQuery.data ?? []) map.set(instance.id, instance.name);
    return map;
  }, [instancesQuery.data]);

  const logs = useMemo(() => auditLogsQuery.data ?? [], [auditLogsQuery.data]);

  const userOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.userId).filter((id): id is string => Boolean(id)))),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (resultFilter !== "all" && log.decision !== resultFilter) return false;
      if (userFilter !== "all" && log.userId !== userFilter) return false;
      if (providerFilter !== "all" && log.provider !== providerFilter) return false;
      if (!q) return true;
      const resourceName = resolveResourceName(log.resourceId, instanceNameById).toLowerCase();
      return (
        log.correlationId.toLowerCase().includes(q) ||
        resourceName.includes(q) ||
        log.action.toLowerCase().includes(q)
      );
    });
  }, [logs, search, resultFilter, userFilter, providerFilter, instanceNameById]);

  const deniedCount = useMemo(
    () => filteredLogs.filter((log) => log.decision === "denied").length,
    [filteredLogs],
  );

  const openLog = useMemo(() => logs.find((log) => log.id === openLogId) ?? null, [logs, openLogId]);

  if (auditLogsQuery.isError) {
    return <ErrorState error={auditLogsQuery.error} onRetry={() => auditLogsQuery.refetch()} />;
  }

  return (
    <>
      <AuditFilters
        search={search}
        onSearchChange={setSearch}
        resultFilter={resultFilter}
        onResultFilterChange={setResultFilter}
        userFilter={userFilter}
        onUserFilterChange={setUserFilter}
        userOptions={userOptions}
        providerFilter={providerFilter}
        onProviderFilterChange={setProviderFilter}
        deniedCount={deniedCount}
      />

      <DataTable minWidth={980} gridTemplateColumns={GRID_COLUMNS} headers={HEADERS}>
        {auditLogsQuery.isPending ? (
          <TableSkeleton />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="Ningún evento coincide con los filtros aplicados."
          />
        ) : (
          filteredLogs.map((log) => (
            <AuditRow
              key={log.id}
              log={log}
              instanceNameById={instanceNameById}
              currentUserId={currentUserQuery.data?.id}
              onOpen={() => setOpenLogId(log.id)}
            />
          ))
        )}
      </DataTable>

      <AuditDrawer
        log={openLog}
        open={openLogId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenLogId(null);
        }}
        instanceNameById={instanceNameById}
        currentUserId={currentUserQuery.data?.id}
      />
    </>
  );
}

const TABS = [
  { id: "operations", label: "Operaciones" },
  { id: "logins", label: "Inicios de sesión" },
] as const;

export default function AuditLogsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentUserQuery = useCurrentUser();
  // Sign-in events expose emails and IPs: the backend limits them to user managers.
  const canSeeLogins = can(currentUserQuery.data?.permissions, "user.manage");
  const tab = canSeeLogins && searchParams.get("tab") === "logins" ? "logins" : "operations";

  function selectTab(next: (typeof TABS)[number]["id"]) {
    const params = new URLSearchParams(searchParams);
    if (next === "logins") params.set("tab", "logins");
    else params.delete("tab");
    params.delete("cid");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex max-w-[1500px] flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-smp-ink">Auditoría</h1>
          <p className="m-0 text-[13px] text-smp-ink-dim">
            Decisiones de autorización e inicios de sesión. Los eventos denegados o sospechosos se resaltan.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-smp-line-2 bg-smp-surface-alt px-3 py-1.5 text-[11.5px] text-smp-ink-muted">
          <Lock className="size-3.5 text-smp-accent-soft" aria-hidden="true" />
          Solo lectura · sin escritura desde el frontend
        </div>
      </div>

      {canSeeLogins ? (
        <div role="tablist" aria-label="Tipo de auditoría" className="flex gap-1 border-b border-smp-line">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => selectTab(id)}
              className={cn(
                "-mb-px border-0 border-b-2 bg-transparent px-3 py-2 text-[13px] font-semibold",
                tab === id
                  ? "border-smp-accent text-smp-ink"
                  : "border-transparent text-smp-ink-dim hover:text-smp-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "logins" ? <AuthEventsView /> : <OperationsAudit />}
    </div>
  );
}

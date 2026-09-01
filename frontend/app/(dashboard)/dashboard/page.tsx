"use client";

import { useInstances } from "@/features/instances/use-instances";
import { useOperations } from "@/features/operations/use-operations";
import { useAuditLogs } from "@/features/audit/use-audit-logs";
import { buildKpis, buildOpsPerDayChart, buildProviderSplit } from "@/features/dashboard/selectors";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OperationsBarChart } from "@/components/dashboard/operations-bar-chart";
import { ProviderSplit } from "@/components/dashboard/provider-split";
import { SystemHealthList } from "@/components/dashboard/system-health-list";
import { RecentOperations } from "@/components/dashboard/recent-operations";
import { SecurityActivity } from "@/components/dashboard/security-activity";
import { formatDate } from "@/lib/utils/format-date";
import { isApiError, networkError } from "@/lib/api/errors";

export default function DashboardPage() {
  const instancesQuery = useInstances();
  const operationsQuery = useOperations();
  const auditQuery = useAuditLogs();

  const rawError = instancesQuery.error ?? operationsQuery.error ?? auditQuery.error;
  const isLoading = instancesQuery.isPending || operationsQuery.isPending || auditQuery.isPending;

  const retryAll = () => {
    instancesQuery.refetch();
    operationsQuery.refetch();
    auditQuery.refetch();
  };

  // Never show partial/stale data next to an unknown backend state: if any
  // of the three queries failed, replace the whole page with ErrorState.
  if (rawError) {
    const error = isApiError(rawError) ? rawError : networkError();
    return <ErrorState error={error} onRetry={retryAll} />;
  }

  if (isLoading || !instancesQuery.data || !operationsQuery.data || !auditQuery.data) {
    return (
      <div className="max-w-[1500px] rounded-2xl border border-smp-line bg-smp-surface">
        <TableSkeleton rows={8} />
      </div>
    );
  }

  const instances = instancesQuery.data;
  const operations = operationsQuery.data;
  const auditLogs = auditQuery.data;

  const kpis = buildKpis(instances, operations, auditLogs);
  const opsChart = buildOpsPerDayChart(operations);
  const providerSplit = buildProviderSplit(instances);

  return (
    <div className="flex max-w-[1500px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 mb-1 text-2xl font-semibold tracking-[-.02em]">Panel multicloud</h1>
          <p className="m-0 text-[13px] text-smp-ink-dim">
            Métricas derivadas de instancias, operaciones y registros de auditoría. Última sincronización{" "}
            {formatDate(new Date())}.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11.5px] text-smp-ink-dim">
          <span className="size-[7px] animate-[smp-pulse_2.4s_ease-in-out_infinite] rounded-full bg-smp-success" />
          actualización automática
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,1fr))] gap-3">
        {kpis.map(({ key, ...k }) => (
          <KpiCard key={key} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <OperationsBarChart data={opsChart} />
        <div className="flex min-w-0 flex-col gap-3.5">
          <ProviderSplit data={providerSplit} />
          <SystemHealthList />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <RecentOperations operations={operations} instances={instances} />
        <SecurityActivity auditLogs={auditLogs} instances={instances} />
      </div>
    </div>
  );
}

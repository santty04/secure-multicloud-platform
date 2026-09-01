import type { AuditLog, Instance, Operation, CloudProvider } from "@/types/domain";
import { instanceStatusFilterValue } from "@/lib/utils/status";

/**
 * Pure view-model builders for the dashboard page. No fetching, no React —
 * the page calls `useInstances()`/`useOperations()`/`useAuditLogs()` and
 * hands the already-fetched arrays in here. Kept framework-free so these
 * are trivially testable.
 */

export interface KpiCardData {
  key: string;
  label: string;
  value: number;
  hint: string;
  tag: string;
  /** Tailwind classes for the small tag badge. */
  iconBg: string;
  iconFg: string;
  /** Tailwind text-color class for the big value. */
  valueClassName: string;
}

/** Mirrors the prototype's `kpis` array (label/tag/hint text and colors), fed with real counts. */
export function buildKpis(instances: Instance[], operations: Operation[], auditLogs: AuditLog[]): KpiCardData[] {
  const azureCount = instances.filter((i) => i.provider === "azure").length;
  const awsCount = instances.filter((i) => i.provider === "aws").length;
  const running = instances.filter((i) => instanceStatusFilterValue(i.status) === "running").length;
  const stopped = instances.filter((i) => instanceStatusFilterValue(i.status) === "stopped").length;
  const okOps = operations.filter((o) => o.status === "success").length;
  const failOps = operations.filter((o) => o.status === "failed").length;
  const denied = auditLogs.filter((a) => a.decision === "denied").length;

  return [
    {
      key: "total",
      label: "Recursos administrados",
      value: instances.length,
      hint: `${azureCount} Azure · ${awsCount} AWS`,
      tag: "ALL",
      iconBg: "bg-smp-line-soft",
      iconFg: "text-smp-accent-soft",
      valueClassName: "text-smp-ink",
    },
    {
      key: "running",
      label: "En ejecución",
      value: running,
      hint: `${stopped} detenidas`,
      tag: "ON",
      iconBg: "bg-smp-success/13",
      iconFg: "text-smp-success",
      valueClassName: "text-smp-success",
    },
    {
      key: "ops-ok",
      label: "Operaciones exitosas",
      value: okOps,
      hint: `de ${operations.length} registradas`,
      tag: "OK",
      iconBg: "bg-smp-success/13",
      iconFg: "text-smp-success",
      valueClassName: "text-smp-ink",
    },
    {
      key: "ops-fail",
      label: "Operaciones fallidas",
      value: failOps,
      hint: "requieren revisión",
      tag: "ERR",
      iconBg: "bg-smp-danger/13",
      iconFg: "text-smp-danger-text",
      valueClassName: "text-smp-danger-text",
    },
    {
      key: "denied",
      label: "Accesos denegados",
      value: denied,
      hint: "eventos denied en auditoría",
      tag: "403",
      iconBg: "bg-smp-warning/13",
      iconFg: "text-smp-warning",
      valueClassName: "text-smp-warning",
    },
  ];
}

export interface ProviderSplitData {
  provider: CloudProvider;
  label: string;
  count: number;
  /** 0-100 */
  pctValue: number;
  detail: string;
}

export function buildProviderSplit(instances: Instance[]): ProviderSplitData[] {
  const total = instances.length || 1;
  const azure = instances.filter((i) => i.provider === "azure");
  const aws = instances.filter((i) => i.provider === "aws");
  const runningCount = (list: Instance[]) =>
    list.filter((i) => instanceStatusFilterValue(i.status) === "running").length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    {
      provider: "azure",
      label: "Microsoft Azure",
      count: azure.length,
      pctValue: pct(azure.length),
      detail: `${runningCount(azure)} en ejecución`,
    },
    {
      provider: "aws",
      label: "Amazon Web Services",
      count: aws.length,
      pctValue: pct(aws.length),
      detail: `${runningCount(aws)} en ejecución`,
    },
  ];
}

export interface OpsPerDayBar {
  label: string;
  date: Date;
  okCount: number;
  failCount: number;
  pendingCount: number;
  /** 4-100, floor of 4 so an empty bar is still visible (matches prototype). */
  okHeightPct: number;
  failHeightPct: number;
  pendingHeightPct: number;
  okTitle: string;
  failTitle: string;
  pendingTitle: string;
}

/** getDay() index (0 = Sunday) -> short Spanish weekday abbreviation. */
const WEEKDAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Real data this time (unlike the prototype's hardcoded week): buckets
 * `operations` by calendar day for the last 7 days including today. The
 * real backend only ever has `pending`/`success`/`failed` — there is no
 * `running` status to fold in.
 */
export function buildOpsPerDayChart(operations: Operation[], now: Date = new Date()): OpsPerDayBar[] {
  const todayStart = startOfDay(now);
  const days: Date[] = Array.from(
    { length: 7 },
    (_, i) => new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() - (6 - i)),
  );

  const buckets = days.map((day) => {
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const dayOps = operations.filter((o) => o.requestedAt >= day && o.requestedAt < dayEnd);
    return {
      date: day,
      ok: dayOps.filter((o) => o.status === "success").length,
      fail: dayOps.filter((o) => o.status === "failed").length,
      pending: dayOps.filter((o) => o.status === "pending").length,
    };
  });

  const maxTotal = Math.max(...buckets.map((b) => b.ok + b.fail + b.pending), 1);
  const heightPct = (n: number) => Math.max(4, Math.round((n / maxTotal) * 100));

  return buckets.map((b) => ({
    label: WEEKDAY_ABBR[b.date.getDay()],
    date: b.date,
    okCount: b.ok,
    failCount: b.fail,
    pendingCount: b.pending,
    okHeightPct: heightPct(b.ok),
    failHeightPct: heightPct(b.fail),
    pendingHeightPct: heightPct(b.pending),
    okTitle: `${b.ok} exitosas`,
    failTitle: `${b.fail} fallidas`,
    pendingTitle: `${b.pending} pendientes`,
  }));
}

/**
 * `Operation`/`AuditLog` only carry `resourceId` (a UUID), never a resource
 * name — this resolves it against the already-fetched `Instance[]` list,
 * falling back to a truncated id when the instance isn't (or is no longer)
 * in that list.
 */
export function resolveResourceLabel(resourceId: string | null, instances: Instance[]): string {
  if (!resourceId) return "recurso desconocido";
  const match = instances.find((i) => i.id === resourceId);
  if (match) return match.name;
  return `${resourceId.slice(0, 8)}…`;
}

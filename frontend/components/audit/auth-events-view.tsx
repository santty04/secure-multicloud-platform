"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusPill, type StatusTone } from "@/components/shared/status-pill";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { useAuthEvents } from "@/features/audit/use-auth-events";
import { AUTH_EVENTS_PAGE_SIZE, type AuthEvent } from "@/lib/api/auth-events";
import { formatDate } from "@/lib/utils/format-date";

const GRID_COLUMNS = "150px minmax(190px,1.2fr) 160px minmax(150px,1fr) 130px minmax(120px,.8fr)";
const HEADERS = ["Fecha y hora", "Correo", "Evento", "Detalle", "IP reportada", "Correlation ID"];

const EVENT_TYPES: Record<string, { label: string; tone: StatusTone }> = {
  login_succeeded: { label: "Inicio exitoso", tone: "success" },
  password_failed: { label: "Contraseña fallida", tone: "danger" },
  code_sent: { label: "Código enviado", tone: "info" },
  code_resent: { label: "Código reenviado", tone: "info" },
  code_failed: { label: "Código incorrecto", tone: "warning" },
  challenge_locked: { label: "Código bloqueado", tone: "danger" },
  login_throttled: { label: "Bloqueo por intentos", tone: "danger" },
  password_reset_requested: { label: "Recuperación solicitada", tone: "info" },
  password_reset_throttled: { label: "Recuperación limitada", tone: "warning" },
  password_set: { label: "Contraseña definida", tone: "success" },
};

const FAILURE_REASONS: Record<string, string> = {
  wrong_password: "Contraseña incorrecta",
  unknown_account: "Cuenta inexistente",
  inactive_account: "Cuenta inactiva",
};

// Events worth highlighting in the list: they point at an attack or lockout.
const ALERTS = new Set(["password_failed", "challenge_locked", "login_throttled"]);

function eventPresentation(type: string) {
  return EVENT_TYPES[type] ?? { label: type, tone: "neutral" as const };
}

function eventDetail(event: AuthEvent): string {
  const details = event.details ?? {};
  if (typeof details.reason === "string") return FAILURE_REASONS[details.reason] ?? details.reason;
  if (typeof details.mfa === "boolean") return details.mfa ? "Con segundo factor" : "Sin segundo factor";
  if (typeof details.sends === "number") return `Envío ${details.sends}`;
  return "—";
}

function AuthEventRow({ event }: { event: AuthEvent }) {
  const alert = ALERTS.has(event.event_type);
  const { label, tone } = eventPresentation(event.event_type);

  return (
    <div
      style={{
        minWidth: 980,
        gridTemplateColumns: GRID_COLUMNS,
        borderLeft: `3px solid ${alert ? "var(--color-smp-danger-strong)" : "transparent"}`,
      }}
      title={event.user_agent ?? undefined}
      className={
        "grid items-center gap-2.5 border-b border-smp-line-soft px-4 py-2.5 text-[12.5px] text-smp-ink " +
        (alert ? "bg-smp-danger/5" : "bg-transparent")
      }
    >
      <span className="font-mono text-[11px] text-smp-ink-dim">{formatDate(event.created_at)}</span>
      <span className="truncate">{event.email}</span>
      <span className="justify-self-start">
        <StatusPill label={label} tone={tone} />
      </span>
      <span className="truncate text-smp-ink-muted">{eventDetail(event)}</span>
      <span className="truncate font-mono text-[11px] text-smp-ink-muted">{event.ip_address ?? "—"}</span>
      <span className="truncate font-mono text-[10.5px] text-smp-ink-faint">
        {event.correlation_id ? event.correlation_id.slice(0, 8) : "—"}
      </span>
    </div>
  );
}

/**
 * Sign-in trail from `GET /api/v1/auth-events` (admins only). Unlike the
 * operations audit, filters and pagination run server-side because this
 * table grows with every login attempt.
 */
export function AuthEventsView() {
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const [eventType, setEventType] = useState("");
  const [offset, setOffset] = useState(0);
  const events = useAuthEvents({ email, eventType, offset });

  if (events.isError) return <ErrorState error={events.error} onRetry={() => events.refetch()} />;

  const total = events.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-3.5">
      <form
        onSubmit={(submit) => {
          submit.preventDefault();
          setEmail(emailInput.trim());
          setOffset(0);
        }}
        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-smp-line-soft bg-smp-surface-alt p-2.5"
      >
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-smp-line-2 bg-smp-input px-2.75 py-1.75">
          <Search className="size-3.75 shrink-0 text-smp-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={emailInput}
            maxLength={255}
            onChange={(change) => {
              setEmailInput(change.target.value);
              if (!change.target.value) {
                setEmail("");
                setOffset(0);
              }
            }}
            aria-label="Filtrar por correo"
            placeholder="Correo exacto y Enter…"
            className="flex-1 bg-transparent text-[13px] text-smp-ink outline-none placeholder:text-smp-ink-faint"
          />
        </div>

        <select
          value={eventType}
          onChange={(change) => {
            setEventType(change.target.value);
            setOffset(0);
          }}
          aria-label="Filtrar por evento"
          className="rounded-lg border border-smp-line-2 bg-smp-input px-2.75 py-2 text-[12.5px] text-smp-ink-muted outline-none"
        >
          <option value="">Todos los eventos</option>
          {Object.entries(EVENT_TYPES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <span className="font-mono text-[11.5px] text-smp-ink-muted">{total} eventos</span>
      </form>

      <DataTable minWidth={980} gridTemplateColumns={GRID_COLUMNS} headers={HEADERS}>
        {events.isPending ? (
          <TableSkeleton />
        ) : events.data.items.length === 0 ? (
          <EmptyState title="Sin eventos" description="Ningún inicio de sesión coincide con los filtros aplicados." />
        ) : (
          events.data.items.map((event) => <AuthEventRow key={event.id} event={event} />)
        )}
      </DataTable>

      {total > AUTH_EVENTS_PAGE_SIZE ? (
        <div className="flex items-center justify-end gap-3 text-sm text-smp-ink-muted">
          <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - AUTH_EVENTS_PAGE_SIZE))}>
            Anterior
          </Button>
          <span>
            Página {Math.floor(offset / AUTH_EVENTS_PAGE_SIZE) + 1} de {Math.ceil(total / AUTH_EVENTS_PAGE_SIZE)}
          </span>
          <Button
            variant="outline"
            disabled={offset + AUTH_EVENTS_PAGE_SIZE >= total}
            onClick={() => setOffset(offset + AUTH_EVENTS_PAGE_SIZE)}
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </div>
  );
}

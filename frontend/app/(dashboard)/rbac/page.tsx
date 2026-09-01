"use client";

import { DataTable } from "@/components/shared/data-table";
import { can, type Permission } from "@/features/auth/can";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { cn } from "@/lib/utils";

const PERMISSION_ROWS: { code: Permission; label: string }[] = [
  { code: "vm.read", label: "Consultar instancias" },
  { code: "vm.create", label: "Registrar instancias" },
  { code: "vm.start", label: "Iniciar instancia" },
  { code: "vm.stop", label: "Detener instancia" },
  { code: "vm.update", label: "Actualizar instancia" },
  { code: "vm.delete", label: "Eliminar instancia" },
  { code: "operation.read", label: "Consultar operaciones y auditoría" },
];

/**
 * Seeded role -> permission sets (`scripts/seed_rbac.py`, see
 * BACKEND_CONTRACT.md). This is the platform's fixed RBAC design — legitimate
 * reference documentation, not per-user fabricated data. The "Tu acceso"
 * column is the real signal: it's derived from the logged-in user's own
 * `GET /auth/me` permissions below.
 */
const ROLE_PERMISSIONS: Record<"viewer" | "operator" | "administrator", readonly Permission[]> = {
  viewer: ["vm.read", "operation.read"],
  operator: ["vm.read", "vm.start", "vm.stop", "operation.read"],
  administrator: [
    "vm.read",
    "vm.create",
    "vm.start",
    "vm.stop",
    "vm.update",
    "vm.delete",
    "operation.read",
    "user.manage",
  ],
};

const GRID_COLUMNS = "minmax(220px,1.6fr) minmax(150px,1fr) repeat(3, minmax(110px,1fr))";

function RoleMark({ granted }: { granted: boolean }) {
  return (
    <span className={cn("text-[12px] font-semibold", granted ? "text-smp-success" : "text-smp-ink-dim")}>
      {granted ? "Sí" : "No"}
    </span>
  );
}

export default function RbacPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="flex max-w-[1100px] flex-col gap-3.5">
      <div>
        <h1 className="m-0 mb-1 text-2xl font-semibold tracking-tight text-smp-ink">Matriz de permisos</h1>
        <p className="m-0 text-[13px] text-smp-ink-muted">
          Permisos de la plataforma (RBAC de aplicación). El backend revalida cada solicitud contra el rol
          codificado en el JWT del usuario, independientemente de lo que muestre esta pantalla.
        </p>
      </div>

      <DataTable minWidth={760} gridTemplateColumns={GRID_COLUMNS} headers={["Permiso de aplicación", `Tu acceso${user ? ` · ${user.roleName}` : ""}`, "Viewer", "Operator", "Administrator"]}>
        {PERMISSION_ROWS.map((row) => {
          const allowed = can(user?.permissions, row.code);
          return (
            <div
              key={row.code}
              className="grid items-center gap-2.5 border-b border-smp-line-soft px-4 py-[11px] text-[12.5px] last:border-b-0"
              style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
              <span>
                <span className="block font-mono text-[11.5px] text-smp-accent-soft">{row.code}</span>
                <span className="block text-[11.5px] text-smp-ink-muted">{row.label}</span>
              </span>
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  allowed ? "bg-smp-success/13 text-smp-success" : "bg-smp-danger/13 text-smp-danger-text",
                )}
              >
                {allowed ? "permitido" : "denegado"}
              </span>
              <RoleMark granted={ROLE_PERMISSIONS.viewer.includes(row.code)} />
              <RoleMark granted={ROLE_PERMISSIONS.operator.includes(row.code)} />
              <RoleMark granted={ROLE_PERMISSIONS.administrator.includes(row.code)} />
            </div>
          );
        })}
      </DataTable>

      <div className="text-pretty rounded-2xl border border-smp-line-soft bg-smp-surface-alt px-4 py-4 text-[12.5px] text-smp-ink-muted">
        Deshabilitar botones en la interfaz solo mejora la experiencia. Toda solicitud vuelve a validarse en
        FastAPI contra el rol del JWT; un intento denegado genera un registro de auditoría con resultado{" "}
        <code className="font-mono text-smp-danger-text">denied</code> y su correlation ID.
      </div>
    </div>
  );
}

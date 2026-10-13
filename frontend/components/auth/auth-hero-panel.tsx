import { Lock, ShieldCheck } from "lucide-react";

/** Shared branding panel for the `(auth)` route group (login, set-password). */
export function AuthHeroPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden border-r border-smp-line bg-smp-surface-raised px-[60px] py-14 lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(#12203a 1px, transparent 1px), linear-gradient(90deg, #12203a 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="pointer-events-none absolute -right-[140px] -top-[120px] size-[420px] rounded-full"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(47,127,246,.22), transparent 65%)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <div className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-smp-accent shadow-[0_6px_18px_-6px_rgba(47,127,246,.8)]">
          <ShieldCheck size={20} color="#061021" strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-[-.01em] text-smp-ink">
            Secure Multicloud Platform
          </div>
          <div className="text-[11.5px] tracking-[.04em] text-smp-ink-faint">
            ADMINISTRACIÓN SEGURA DE INFRAESTRUCTURA
          </div>
        </div>
      </div>

      <div className="relative flex max-w-[440px] flex-col gap-[22px]">
        <h1 className="text-balance text-[34px] font-semibold leading-[1.15] tracking-[-.02em] text-smp-ink">
          Control y trazabilidad sobre tus máquinas virtuales en Azure y AWS.
        </h1>
        <p className="text-balance text-[14.5px] text-smp-ink-muted">
          Cada operación pasa por doble autorización: el RBAC interno de la plataforma y el IAM
          del proveedor cloud. Todo queda registrado con su correlation ID.
        </p>
        <div className="grid gap-2.5">
          <div className="flex items-center gap-2.5 text-[13px] text-[#c3d0e6]">
            <span className="size-1.5 shrink-0 rounded-full bg-smp-success" />
            RBAC de aplicación · Viewer, Operator, Administrator
          </div>
          <div className="flex items-center gap-2.5 text-[13px] text-[#c3d0e6]">
            <span className="size-1.5 shrink-0 rounded-full bg-smp-azure" />
            Azure Managed Identities y roles IAM de AWS
          </div>
          <div className="flex items-center gap-2.5 text-[13px] text-[#c3d0e6]">
            <span className="size-1.5 shrink-0 rounded-full bg-smp-warning" />
            Auditoría de solo lectura con correlation IDs
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-4 text-[12px] text-smp-ink-faint">
        <span className="inline-flex items-center gap-2">
          <Lock size={13} strokeWidth={2} aria-hidden="true" />
          Conexión cifrada · Verificación en dos pasos
        </span>
        <span>© {new Date().getFullYear()} Secure Multicloud Platform</span>
      </div>
    </div>
  );
}

/** Compact brand shown above auth forms when the hero panel is hidden (below lg). */
export function AuthMobileBrand() {
  return (
    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
      <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-smp-accent shadow-[0_6px_18px_-6px_rgba(47,127,246,.8)]">
        <ShieldCheck size={18} color="#061021" strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div>
        <div className="text-[14px] font-bold tracking-[-.01em] text-smp-ink">Secure Multicloud Platform</div>
        <div className="text-[10.5px] tracking-[.04em] text-smp-ink-faint">
          ADMINISTRACIÓN SEGURA DE INFRAESTRUCTURA
        </div>
      </div>
    </div>
  );
}

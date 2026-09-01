"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useLogin } from "@/features/auth/use-login";

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true";

const DEMO_ACCOUNTS = [
  { email: "ana.torres@smp.edu", initials: "AT", roleLabel: "Viewer · 2 permisos" },
  { email: "l.mendez@smp.edu", initials: "LM", roleLabel: "Operador · 4 permisos" },
  { email: "c.rivas@smp.edu", initials: "CR", roleLabel: "Administrador · 8 permisos" },
] as const;

const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
      },
    );
  }

  function pickDemoAccount(accountEmail: string) {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-smp-bg lg:grid-cols-[1.05fr_.95fr]">
      {/* Left hero panel — hidden below lg so the form takes the full width on narrow viewports */}
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

        <div className="relative font-mono text-[11.5px] text-smp-ink-faint">
          v0.9.0-demo · FastAPI + PostgreSQL · JWT
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="grid place-items-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-[392px]">
          {MOCKS_ENABLED ? (
            <div className="mb-5 inline-flex items-center gap-[7px] rounded-full border border-smp-warning/35 bg-smp-warning/12 px-[11px] py-1 text-[11px] font-semibold tracking-[.04em] text-smp-warning">
              MODO DEMOSTRACIÓN · DATOS MOCK
            </div>
          ) : null}

          <h2 className="mb-1.5 text-[23px] font-semibold tracking-[-.01em] text-smp-ink">
            Iniciar sesión
          </h2>
          <p className="mb-[26px] text-[13.5px] text-[#8496b3]">
            Acceso restringido. No existe registro público de usuarios.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="smp-email" className="text-[12px] font-semibold text-[#c3d0e6]">
                Correo electrónico
              </label>
              <input
                id="smp-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@smp.edu"
                className="rounded-[10px] border border-smp-line-2 bg-smp-input px-[13px] py-[11px] text-[14px] text-smp-ink outline-none focus-visible:border-smp-accent-soft"
              />
            </div>

            <div className="flex flex-col gap-[7px]">
              <label htmlFor="smp-pass" className="text-[12px] font-semibold text-[#c3d0e6]">
                Contraseña
              </label>
              <div className="relative flex">
                <input
                  id="smp-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••••"
                  className="flex-1 rounded-[10px] border border-smp-line-2 bg-smp-input py-[11px] pl-[13px] pr-[44px] text-[14px] text-smp-ink outline-none focus-visible:border-smp-accent-soft"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute bottom-1 right-1 top-1 grid w-9 place-items-center rounded-lg border-0 bg-transparent text-smp-ink-dim hover:text-smp-ink"
                >
                  {showPassword ? (
                    <EyeOff size={17} strokeWidth={1.9} aria-hidden="true" />
                  ) : (
                    <Eye size={17} strokeWidth={1.9} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {login.error ? (
              <div
                role="alert"
                className="flex gap-2.5 rounded-[10px] border border-smp-danger/40 bg-smp-danger/10 p-[12px_13px] animate-[smp-in_.18s_ease-out]"
              >
                <AlertCircle
                  size={16}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-smp-danger-text"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-smp-danger-text-soft">
                    No se pudo iniciar sesión
                  </div>
                  <div className="text-[12.5px] text-[#c9b0a6]">{login.error.message}</div>
                  {login.error.correlationId ? (
                    <div className="mt-[5px] font-mono text-[11px] text-smp-ink-muted">
                      correlation_id: {login.error.correlationId}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={login.isPending}
              className="mt-1 flex items-center justify-center gap-[9px] rounded-[10px] border-0 bg-smp-accent px-4 py-3 text-[14px] font-semibold text-white hover:bg-smp-accent-hover active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {login.isPending ? (
                <span className="size-[15px] animate-[smp-spin_.7s_linear_infinite] rounded-full border-2 border-white/35 border-t-white" />
              ) : null}
              {login.isPending ? "Verificando credenciales…" : "Iniciar sesión"}
            </button>
          </form>

          {MOCKS_ENABLED ? (
            <div className="mt-[26px] border-t border-smp-line-soft pt-5">
              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[.08em] text-smp-ink-faint">
                Cuentas de demostración
              </div>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => pickDemoAccount(account.email)}
                    className="flex items-center gap-3 rounded-[10px] border border-smp-line bg-smp-input px-3 py-[9px] text-left text-smp-ink hover:border-smp-accent hover:bg-[#101c33]"
                  >
                    <span className="grid size-[26px] shrink-0 place-items-center rounded-[7px] bg-smp-line-soft text-[11px] font-bold text-smp-ink-muted">
                      {account.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold">{account.email}</span>
                      <span className="block text-[11px] text-smp-ink-dim">{account.roleLabel}</span>
                    </span>
                    <span className="font-mono text-[10.5px] text-smp-ink-faint">usar</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

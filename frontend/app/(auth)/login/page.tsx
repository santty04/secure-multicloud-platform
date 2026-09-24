"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AuthHeroPanel, AuthMobileBrand } from "@/components/auth/auth-hero-panel";
import { LoginCodeStep } from "@/components/auth/login-code-step";
import { useCurrentUser, useHasAccessToken, useLogin } from "@/features/auth/hooks";
import { loginRequestSchema, type LoginChallenge, type LoginRequest } from "@/schemas/auth";
import { isApiError } from "@/lib/api/errors";

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "true";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const hasToken = useHasAccessToken();
  const login = useLogin();
  const currentUser = useCurrentUser({ enabled: hasToken === true });

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (currentUser.data) router.replace("/dashboard");
  }, [currentUser.data, router]);

  function handleSubmit(values: LoginRequest) {
    login.mutate(
      values,
      {
        onSuccess: (outcome) => {
          if (outcome.status === "challenge") setChallenge(outcome.challenge);
          else router.replace("/dashboard");
        },
      },
    );
  }

  function loginErrorMessage(): string | null {
    if (!login.error) return null;
    if (!isApiError(login.error)) return "No se pudo iniciar sesión. Inténtalo de nuevo.";
    if (login.error.code === "network_error") {
      return "No se pudo conectar con la plataforma. Verifica el servicio e inténtalo de nuevo.";
    }
    if (login.error.status === 401) return "Correo o contraseña incorrectos.";
    if (login.error.status === 422) return "Revisa el correo y la contraseña ingresados.";
    if (login.error.status === 429) {
      return "Demasiados intentos fallidos. Por seguridad, espera unos minutos antes de volver a intentarlo.";
    }
    return login.error.message || "No se pudo completar el inicio de sesión.";
  }

  const errorMessage = loginErrorMessage();
  const isSubmitting = login.isPending;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-smp-bg lg:grid-cols-[1.05fr_.95fr]">
      <AuthHeroPanel />

      {/* Right panel — login form, or the emailed-code step once the password is accepted */}
      <div className="grid place-items-center px-6 py-12 lg:px-10">
        {challenge ? (
          <LoginCodeStep
            challenge={challenge}
            onBack={() => {
              setChallenge(null);
              login.reset();
              form.resetField("password");
            }}
          />
        ) : (
          <div className="w-full max-w-[392px]">
            <AuthMobileBrand />
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

            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-[7px]">
                <label htmlFor="smp-email" className="text-[12px] font-semibold text-[#c3d0e6]">
                  Correo electrónico
                </label>
                <input
                  id="smp-email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={Boolean(form.formState.errors.email)}
                  aria-describedby={form.formState.errors.email ? "smp-email-error" : undefined}
                  {...form.register("email")}
                  placeholder="operator@smp.edu"
                  className="rounded-[10px] border border-smp-line-2 bg-smp-input px-[13px] py-[11px] text-[14px] text-smp-ink outline-none focus-visible:border-smp-accent-soft"
                />
                {form.formState.errors.email ? (
                  <div id="smp-email-error" className="text-[11.5px] text-smp-danger-text">
                    Ingresa un correo electrónico válido.
                  </div>
                ) : null}
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={form.formState.errors.password ? "smp-password-error" : undefined}
                    {...form.register("password")}
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
                {form.formState.errors.password ? (
                  <div id="smp-password-error" className="text-[11.5px] text-smp-danger-text">
                    Ingresa tu contraseña.
                  </div>
                ) : null}
              </div>

              {errorMessage ? (
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
                    <div className="text-[12.5px] text-[#c9b0a6]">{errorMessage}</div>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 flex items-center justify-center gap-[9px] rounded-[10px] border-0 bg-smp-accent px-4 py-3 text-[14px] font-semibold text-white hover:bg-smp-accent-hover active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="size-[15px] animate-[smp-spin_.7s_linear_infinite] rounded-full border-2 border-white/35 border-t-white" />
                ) : null}
                {isSubmitting ? "Verificando credenciales…" : "Iniciar sesión"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { AuthHeroPanel, AuthMobileBrand } from "@/components/auth/auth-hero-panel";
import { useSetPassword } from "@/features/auth/hooks";
import { getPasswordSetupInfo } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/errors";

const formSchema = z
  .object({
    password: z.string().min(12, "Debe tener al menos 12 caracteres.").max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

function InvalidLinkCard() {
  return (
    <div className="grid place-items-center px-6 py-12 lg:px-10">
      <div className="w-full max-w-[392px] text-center">
        <AuthMobileBrand />
        <h2 className="mb-1.5 text-[23px] font-semibold tracking-[-.01em] text-smp-ink">
          Enlace no válido
        </h2>
        <p className="text-[13.5px] text-[#8496b3]">
          Este enlace de activación no es válido, ya expiró o ya fue utilizado. Pide a un
          administrador que te reenvíe la invitación.
        </p>
        <a
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-[10px] border-0 bg-smp-accent px-4 py-3 text-[14px] font-semibold text-white hover:bg-smp-accent-hover"
        >
          Ir a iniciar sesión
        </a>
      </div>
    </div>
  );
}

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);

  const tokenInfo = useQuery({
    queryKey: ["password-setup-info", token],
    queryFn: () => getPasswordSetupInfo(token),
    enabled: Boolean(token),
    retry: false,
  });
  const setPassword = useSetPassword();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (setPassword.isSuccess) router.replace("/dashboard");
  }, [setPassword.isSuccess, router]);

  function handleSubmit(values: FormValues) {
    setPassword.mutate({ token, password: values.password });
  }

  function setPasswordErrorMessage(): string | null {
    if (!setPassword.error) return null;
    if (!isApiError(setPassword.error)) return "No se pudo activar la cuenta. Inténtalo de nuevo.";
    return setPassword.error.message || "No se pudo activar la cuenta.";
  }

  if (!token || tokenInfo.isError) return (
    <div className="grid min-h-screen grid-cols-1 bg-smp-bg lg:grid-cols-[1.05fr_.95fr]">
      <AuthHeroPanel />
      <InvalidLinkCard />
    </div>
  );

  const errorMessage = setPasswordErrorMessage();
  const isSubmitting = setPassword.isPending;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-smp-bg lg:grid-cols-[1.05fr_.95fr]">
      <AuthHeroPanel />

      <div className="grid place-items-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-[392px]">
          <AuthMobileBrand />
          <h2 className="mb-1.5 text-[23px] font-semibold tracking-[-.01em] text-smp-ink">
            Activa tu cuenta
          </h2>
          <p className="mb-[26px] text-[13.5px] text-[#8496b3]">
            {tokenInfo.isPending
              ? "Verificando el enlace…"
              : `Define la contraseña de acceso para ${tokenInfo.data?.email}.`}
          </p>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="smp-pass" className="text-[12px] font-semibold text-[#c3d0e6]">
                Nueva contraseña
              </label>
              <div className="relative flex">
                <input
                  id="smp-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={tokenInfo.isPending}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password ? "smp-password-error" : undefined}
                  {...form.register("password")}
                  placeholder="Entre 12 y 128 caracteres"
                  className="flex-1 rounded-[10px] border border-smp-line-2 bg-smp-input py-[11px] pl-[13px] pr-[44px] text-[14px] text-smp-ink outline-none focus-visible:border-smp-accent-soft disabled:opacity-60"
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
                  {form.formState.errors.password.message}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-[7px]">
              <label htmlFor="smp-pass-confirm" className="text-[12px] font-semibold text-[#c3d0e6]">
                Confirmar contraseña
              </label>
              <input
                id="smp-pass-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={tokenInfo.isPending}
                aria-invalid={Boolean(form.formState.errors.confirmPassword)}
                aria-describedby={form.formState.errors.confirmPassword ? "smp-confirm-error" : undefined}
                {...form.register("confirmPassword")}
                placeholder="Repite la contraseña"
                className="rounded-[10px] border border-smp-line-2 bg-smp-input px-[13px] py-[11px] text-[14px] text-smp-ink outline-none focus-visible:border-smp-accent-soft disabled:opacity-60"
              />
              {form.formState.errors.confirmPassword ? (
                <div id="smp-confirm-error" className="text-[11.5px] text-smp-danger-text">
                  {form.formState.errors.confirmPassword.message}
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
                    No se pudo activar la cuenta
                  </div>
                  <div className="text-[12.5px] text-[#c9b0a6]">{errorMessage}</div>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || tokenInfo.isPending}
              className="mt-1 flex items-center justify-center gap-[9px] rounded-[10px] border-0 bg-smp-accent px-4 py-3 text-[14px] font-semibold text-white hover:bg-smp-accent-hover active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <span className="size-[15px] animate-[smp-spin_.7s_linear_infinite] rounded-full border-2 border-white/35 border-t-white" />
              ) : null}
              {isSubmitting ? "Activando cuenta…" : "Activar cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  // `useSearchParams` needs a Suspense boundary so the route can still prerender.
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen grid-cols-1 bg-smp-bg lg:grid-cols-[1.05fr_.95fr]">
          <AuthHeroPanel />
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { AuthHeroPanel, AuthMobileBrand } from "@/components/auth/auth-hero-panel";
import { useForgotPassword } from "@/features/auth/hooks";
import { forgotPasswordRequestSchema, type ForgotPasswordRequest } from "@/schemas/auth";
import { isApiError } from "@/lib/api/errors";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: "" },
  });

  function handleSubmit(values: ForgotPasswordRequest) {
    forgotPassword.mutate(values);
  }

  function errorMessage(): string | null {
    if (!forgotPassword.error) return null;
    if (isApiError(forgotPassword.error) && forgotPassword.error.code === "network_error") {
      return "No se pudo conectar con la plataforma. Verifica el servicio e inténtalo de nuevo.";
    }
    if (isApiError(forgotPassword.error) && forgotPassword.error.status === 422) {
      return "Revisa el correo ingresado.";
    }
    return "No se pudo enviar la solicitud. Inténtalo de nuevo.";
  }

  const error = errorMessage();
  const isSubmitting = forgotPassword.isPending;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-smp-bg lg:grid-cols-[1.05fr_.95fr]">
      <AuthHeroPanel />

      <div className="grid place-items-center px-6 py-12 lg:px-10">
        <div className="w-full max-w-[392px]">
          <AuthMobileBrand />

          {forgotPassword.isSuccess ? (
            <div role="status" className="animate-[smp-in_.18s_ease-out]">
              <div className="mb-4 grid size-11 place-items-center rounded-full bg-smp-accent/15 text-smp-accent-soft">
                <MailCheck size={21} strokeWidth={1.9} aria-hidden="true" />
              </div>
              <h2 className="mb-1.5 text-[23px] font-semibold tracking-[-.01em] text-smp-ink">
                Revisa tu correo
              </h2>
              <p className="text-[13.5px] text-[#8496b3]">
                Si <span className="font-semibold text-smp-ink">{form.getValues("email")}</span>{" "}
                corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña.
                El enlace vence en 30 minutos y solo puede usarse una vez.
              </p>
              <p className="mt-3 text-[12.5px] text-[#6f819f]">
                ¿No llegó? Revisa la carpeta de spam o vuelve a intentarlo en unos minutos.
              </p>
              <button
                type="button"
                onClick={() => forgotPassword.reset()}
                className="mt-6 w-full rounded-[10px] border border-smp-line-2 bg-transparent px-4 py-3 text-[14px] font-semibold text-smp-ink hover:bg-smp-input"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-1.5 text-[23px] font-semibold tracking-[-.01em] text-smp-ink">
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="mb-[26px] text-[13.5px] text-[#8496b3]">
                Ingresa el correo de tu cuenta y te enviaremos un enlace para definir una nueva.
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
                    autoFocus
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

                {error ? (
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
                    <div className="text-[12.5px] text-[#c9b0a6]">{error}</div>
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
                  {isSubmitting ? "Enviando enlace…" : "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          )}

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-smp-accent-soft hover:underline"
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

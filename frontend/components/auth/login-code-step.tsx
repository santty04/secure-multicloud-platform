"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { AuthMobileBrand } from "@/components/auth/auth-hero-panel";
import { useResendLoginCode, useVerifyLoginCode } from "@/features/auth/hooks";
import { isApiError } from "@/lib/api/errors";
import type { LoginChallenge } from "@/schemas/auth";

const CODE_LENGTH = 6;

function errorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback;
  if (error.code === "network_error") return "No se pudo conectar con la plataforma. Inténtalo de nuevo.";
  if (error.status === 422) return "El código debe tener 6 dígitos.";
  return error.message || fallback;
}

export function LoginCodeStep({ challenge: initial, onBack }: { challenge: LoginChallenge; onBack: () => void }) {
  const router = useRouter();
  const verify = useVerifyLoginCode();
  const resend = useResendLoginCode();
  const [challenge, setChallenge] = useState(initial);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(initial.resend_available_in_seconds);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function submit(value: string) {
    if (value.length !== CODE_LENGTH || verify.isPending) return;
    verify.mutate(
      { challenge_id: challenge.challenge_id, code: value },
      { onSuccess: () => router.replace("/dashboard") },
    );
  }

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) submit(digits);
  }

  function handleResend() {
    verify.reset();
    resend.mutate(challenge.challenge_id, {
      onSuccess: (next) => {
        setChallenge(next);
        setCode("");
        setCooldown(next.resend_available_in_seconds);
      },
    });
  }

  const failure = verify.error
    ? errorMessage(verify.error, "No se pudo verificar el código.")
    : resend.error
      ? errorMessage(resend.error, "No se pudo reenviar el código.")
      : null;

  return (
    <div className="w-full max-w-[392px]">
      <AuthMobileBrand />
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[12.5px] text-smp-ink-dim hover:text-smp-ink"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
        Volver
      </button>

      <h2 className="mb-1.5 text-[23px] font-semibold tracking-[-.01em] text-smp-ink">
        Verifica tu identidad
      </h2>
      <p className="mb-[26px] text-[13.5px] text-[#8496b3]">
        Enviamos un código de 6 dígitos a <span className="text-smp-ink">{challenge.email_hint}</span>.
        Vence en {Math.round(challenge.expires_in_seconds / 60)} minutos.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(code);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="smp-code" className="text-[12px] font-semibold text-[#c3d0e6]">
            Código de verificación
          </label>
          <input
            id="smp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(event) => handleChange(event.target.value)}
            disabled={verify.isPending}
            aria-invalid={Boolean(verify.error)}
            placeholder="000000"
            className="rounded-[10px] border border-smp-line-2 bg-smp-input px-[13px] py-[11px] text-center font-mono text-[22px] tracking-[.5em] text-smp-ink outline-none focus-visible:border-smp-accent-soft disabled:opacity-60"
          />
        </div>

        {failure ? (
          <div
            role="alert"
            className="flex gap-2.5 rounded-[10px] border border-smp-danger/40 bg-smp-danger/10 p-[12px_13px] animate-[smp-in_.18s_ease-out]"
          >
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-smp-danger-text" aria-hidden="true" />
            <div className="text-[12.5px] text-[#c9b0a6]">{failure}</div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={code.length !== CODE_LENGTH || verify.isPending}
          className="mt-1 flex items-center justify-center gap-[9px] rounded-[10px] border-0 bg-smp-accent px-4 py-3 text-[14px] font-semibold text-white hover:bg-smp-accent-hover active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {verify.isPending ? (
            <span className="size-[15px] animate-[smp-spin_.7s_linear_infinite] rounded-full border-2 border-white/35 border-t-white" />
          ) : null}
          {verify.isPending ? "Verificando…" : "Verificar e ingresar"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resend.isPending}
          className="border-0 bg-transparent p-0 text-[12.5px] text-smp-accent-soft hover:text-smp-accent-soft-hover disabled:cursor-not-allowed disabled:text-smp-ink-faint"
        >
          {resend.isPending
            ? "Enviando…"
            : cooldown > 0
              ? `Reenviar código en ${cooldown} s`
              : "Reenviar código"}
        </button>
      </form>
    </div>
  );
}

import { apiFetch } from "@/lib/api/client";
import { toCurrentUser } from "@/lib/api/adapters/auth";
import { endpoints } from "@/lib/api/endpoints";
import { unexpectedResponseError } from "@/lib/api/errors";
import {
  currentUserResponseSchema,
  forgotPasswordResponseSchema,
  loginChallengeResponseSchema,
  loginResponseSchema,
  passwordSetupTokenInfoSchema,
  tokenResponseSchema,
  type ForgotPasswordRequest,
  type LoginRequest,
  type SetPasswordRequest,
  type VerifyLoginCodeRequest,
} from "@/schemas/auth";
import type { CurrentUser } from "@/types/domain";

export async function login(credentials: LoginRequest) {
  const raw = await apiFetch<unknown>(endpoints.login(), {
    method: "POST",
    auth: false,
    body: JSON.stringify(credentials),
  });

  const parsed = loginResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function verifyLoginCode(payload: VerifyLoginCodeRequest) {
  const raw = await apiFetch<unknown>(endpoints.loginVerify(), {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const parsed = tokenResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function resendLoginCode(challengeId: string) {
  const raw = await apiFetch<unknown>(endpoints.loginResend(), {
    method: "POST",
    auth: false,
    body: JSON.stringify({ challenge_id: challengeId }),
  });

  const parsed = loginChallengeResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function getPasswordSetupInfo(token: string) {
  const raw = await apiFetch<unknown>(endpoints.passwordSetupInfo(token), {
    auth: false,
  });

  const parsed = passwordSetupTokenInfoSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function setPassword(payload: SetPasswordRequest) {
  const raw = await apiFetch<unknown>(endpoints.setPassword(), {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const parsed = tokenResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function requestPasswordReset(payload: ForgotPasswordRequest) {
  const raw = await apiFetch<unknown>(endpoints.forgotPassword(), {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });

  const parsed = forgotPasswordResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const raw = await apiFetch<unknown>(endpoints.me());
  const parsed = currentUserResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return toCurrentUser(parsed.data);
}

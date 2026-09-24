"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api/client";
import { getCurrentUser, login, resendLoginCode, verifyLoginCode } from "@/lib/api/auth";
import { clearAccessToken, setAccessToken } from "@/lib/auth/session";
import type { LoginChallenge, LoginRequest, VerifyLoginCodeRequest } from "@/schemas/auth";
import type { CurrentUser } from "@/types/domain";
import { authKeys } from "./keys";

export type LoginOutcome =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "challenge"; challenge: LoginChallenge };

async function startSession(accessToken: string): Promise<CurrentUser> {
  setAccessToken(accessToken);

  try {
    return await getCurrentUser();
  } catch (error) {
    clearAccessToken();
    throw error;
  }
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginOutcome, ApiError, LoginRequest>({
    mutationFn: async (credentials) => {
      const response = await login(credentials);
      if ("mfa_required" in response) return { status: "challenge", challenge: response };
      return { status: "authenticated", user: await startSession(response.access_token) };
    },
    onSuccess: (outcome) => {
      if (outcome.status === "authenticated") queryClient.setQueryData(authKeys.me(), outcome.user);
    },
  });
}

export function useVerifyLoginCode() {
  const queryClient = useQueryClient();

  return useMutation<CurrentUser, ApiError, VerifyLoginCodeRequest>({
    mutationFn: async (payload) => startSession((await verifyLoginCode(payload)).access_token),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}

export function useResendLoginCode() {
  return useMutation<LoginChallenge, ApiError, string>({ mutationFn: resendLoginCode });
}

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, type ApiError } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { tokenResponseSchema, type LoginRequest } from "@/schemas/auth";
import { tokenStore } from "@/lib/auth/token-store";
import { authKeys } from "./keys";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<{ access_token: string; token_type: string }, ApiError, LoginRequest>({
    mutationFn: async (credentials) => {
      const raw = await apiFetch<unknown>(endpoints.login(), {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      return tokenResponseSchema.parse(raw);
    },
    onSuccess: async (token) => {
      tokenStore.set(token.access_token);
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}
